import { RedisAPIClient } from 'sdk-ioredis-fastify';

/**
 * Interface para uma única mensagem na conversação.
 */
export interface TokenUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface ToolCall {
  id: string;
  type: string;
  name?: string;
  arguments?: string;
  result?: unknown;
}

export interface AttachmentMetadata {
  type: string;
  url?: string;
  name?: string;
  mimeType?: string;
  sizeBytes?: number;
  extra?: Record<string, unknown>;
}

export interface MessageMetadata {
  tokenUsage?: TokenUsage;
  toolCalls?: ToolCall[];
  attachments?: AttachmentMetadata[];
  latencyMs?: number;
  language?: string;
  labels?: string[];
  extra?: Record<string, unknown>;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: MessageMetadata;
}

export type MessageInput =
  Omit<Message, 'timestamp' | 'metadata'> &
  Partial<Pick<Message, 'timestamp'>> &
  Pick<Message, 'metadata'>;

/**
 * Opções para a função de janela de conversação.
 */
export interface ConversationWindowOptions {
  /**
   * Retorna apenas as últimas 'N' mensagens.
   */
  lastN?: number;
}

/**
 * Configurações opcionais para o cache de conversa.
 */
export interface LLMCacheOptions {
  /**
   * Versão da API do sdk-ioredis-fastify que será usada.
   * @default 'v1'
   */
  apiVersion?: string;
  /**
   * Tempo em segundos para expirar o histórico de conversa.
   */
  conversationTTLSeconds?: number;
  /**
   * Tempo em segundos para expirar o modelo associado à conversa.
   */
  modelTTLSeconds?: number;
}

interface LLMCacheConfig extends LLMCacheOptions {
  baseURL: string;
}

export interface ConversationMetadata {
  summary?: string;
  totalTurns?: number;
  lastInteractionAt?: number;
  tokenUsage?: TokenUsage;
  sentiment?: 'positive' | 'neutral' | 'negative';
  goal?: string;
  userPreferences?: Record<string, unknown>;
  toolState?: Record<string, unknown>;
  extra?: Record<string, unknown>;
}

/**
 * LLMCache - Um cliente Singleton para gerir o cache de conversas de LLM.
 *
 * Esta classe usa o ioredis-fastify-sdk para interagir com o Redis,
 * abstraindo a lógica de armazenamento de histórico de mensagens e metadados.
 */
export class LLMCache {
  private static instance: LLMCache;
  private sdkClient: RedisAPIClient;
  private readonly conversationTTLSeconds?: number;
  private readonly modelTTLSeconds?: number;

  /**
   * O construtor é privado para forçar o uso do padrão Singleton.
   * @param baseURL A URL base da API ioredis-fastify.
   */
  private constructor({ baseURL, apiVersion = 'v1', conversationTTLSeconds, modelTTLSeconds }: LLMCacheConfig) {
    this.sdkClient = new RedisAPIClient({
      baseURL,
      apiVersion,
    });
    this.conversationTTLSeconds = conversationTTLSeconds;
    this.modelTTLSeconds = modelTTLSeconds;
  }

  /**
   * Obtém a instância única (Singleton) do LLMCache.
   * Se nenhuma instância existir, uma nova é criada.
   * @param baseURL A URL base da API. É necessária apenas na primeira chamada.
   * @returns A instância do LLMCache.
   */
  public static getInstance(baseURL: string, options?: LLMCacheOptions): LLMCache;
  public static getInstance(config: LLMCacheConfig): LLMCache;
  public static getInstance(
    baseURLOrConfig?: string | LLMCacheConfig,
    maybeOptions: LLMCacheOptions = {},
  ): LLMCache {
    if (!LLMCache.instance) {
      const config = typeof baseURLOrConfig === 'string'
        ? { baseURL: baseURLOrConfig, ...maybeOptions }
        : baseURLOrConfig;

      if (!config?.baseURL) {
        throw new Error('A baseURL é necessária na primeira inicialização do LLMCache.');
      }

      LLMCache.instance = new LLMCache(config);
    }
    return LLMCache.instance;
  }

  private getMessagesKey(userId: string): string {
    return `llm-cache:${userId}:messages`;
  }

  private getModelKey(userId: string): string {
    return `llm-cache:${userId}:model`;
  }

  private getMetadataKey(userId: string): string {
    return `llm-cache:${userId}:metadata`;
  }

  private async applyTTL(key: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds && ttlSeconds > 0) {
      await this.sdkClient.keys.expire(key, ttlSeconds);
    }
  }

  private mergeTokenUsage(current?: TokenUsage, incoming?: TokenUsage): TokenUsage | undefined {
    if (!current && !incoming) {
      return undefined;
    }

    return {
      ...current,
      ...incoming,
      promptTokens: incoming?.promptTokens ?? current?.promptTokens,
      completionTokens: incoming?.completionTokens ?? current?.completionTokens,
      totalTokens: incoming?.totalTokens ?? current?.totalTokens,
    };
  }

  private mergeMetadata(
    current: ConversationMetadata | undefined,
    incoming: Partial<ConversationMetadata>,
  ): ConversationMetadata {
    const mergedTokenUsage = this.mergeTokenUsage(current?.tokenUsage, incoming.tokenUsage);

    return {
      ...current,
      ...incoming,
      tokenUsage: mergedTokenUsage,
      userPreferences: {
        ...current?.userPreferences,
        ...incoming.userPreferences,
      },
      toolState: {
        ...current?.toolState,
        ...incoming.toolState,
      },
      extra: {
        ...current?.extra,
        ...incoming.extra,
      },
    };
  }

  // --- Funções de Gestão do Cache ---

  /**
   * Adiciona uma nova mensagem ao histórico de conversação de um utilizador.
   * @param userId O identificador único do utilizador.
   * @param message O objeto da mensagem a ser adicionado.
   */
  public async addMessage(userId: string, message: MessageInput): Promise<void> {
    const key = this.getMessagesKey(userId);
    const normalizedMessage: Message = {
      ...message,
      timestamp: message.timestamp ?? Date.now(),
    };

    // As listas do Redis são perfeitas para históricos de chat.
    await this.sdkClient.lists.push(key, [JSON.stringify(normalizedMessage)]);
    await this.applyTTL(key, this.conversationTTLSeconds);
  }

  /**
   * Define o modelo de LLM a ser usado para um utilizador.
   * @param userId O identificador único do utilizador.
   * @param modelName O nome do modelo (ex: 'gemini-1.5-pro').
   */
  public async setModel(userId: string, modelName: string): Promise<void> {
    const key = this.getModelKey(userId);
    await this.sdkClient.keys.set(key, modelName);
    await this.applyTTL(key, this.modelTTLSeconds ?? this.conversationTTLSeconds);
  }
  
  /**
   * Obtém o modelo de LLM configurado para um utilizador.
   * @param userId O identificador único do utilizador.
   * @returns O nome do modelo ou null se não estiver definido.
   */
  public async getModel(userId: string): Promise<string | null> {
    const key = this.getModelKey(userId);
    return this.sdkClient.keys.get<string>(key);
  }

  /**
   * Actualiza metadados agregados da conversação (ex: resumo, total de tokens, preferências do utilizador).
   * Os campos são mesclados com o estado existente para evitar perdas involuntárias.
   */
  public async upsertConversationMetadata(
    userId: string,
    metadata: Partial<ConversationMetadata>,
  ): Promise<ConversationMetadata> {
    const key = this.getMetadataKey(userId);
    const currentMetadata = await this.sdkClient.keys.get<ConversationMetadata>(key);
    const mergedMetadata = this.mergeMetadata(currentMetadata ?? undefined, metadata);

    await this.sdkClient.keys.set(key, mergedMetadata);
    await this.applyTTL(key, this.conversationTTLSeconds);

    return mergedMetadata;
  }

  /**
   * Obtém os metadados agregados da conversação para um utilizador.
   */
  public async getConversationMetadata(userId: string): Promise<ConversationMetadata | null> {
    const key = this.getMetadataKey(userId);
    return this.sdkClient.keys.get<ConversationMetadata>(key);
  }

  /**
   * Retorna uma janela da conversação.
   * Útil para enviar apenas o contexto recente para a API do LLM.
   * @param userId O identificador único do utilizador.
   * @param options Opções para filtrar a janela (ex: últimas N mensagens).
   * @returns Um array de mensagens.
   */
  public async getConversationWindow(
    userId: string,
    options: ConversationWindowOptions = {}
  ): Promise<Message[]> {
    const key = this.getMessagesKey(userId);
    const { lastN } = options;

    let start = 0;
    let stop = -1; // -1 significa "até ao final" no Redis

    if (lastN && lastN > 0) {
      // Para obter os últimos N, usamos índices negativos.
      // LRANGE key -N -1
      start = -lastN;
    }

    return this.sdkClient.lists.getRange<Message>(key, start, stop);
  }

  /**
   * Apaga todo o histórico de conversação e metadados de um utilizador.
   * @param userId O identificador único do utilizador.
   */
  public async clearHistory(userId: string): Promise<void> {
    const messagesKey = this.getMessagesKey(userId);
    const modelKey = this.getModelKey(userId);
    const metadataKey = this.getMetadataKey(userId);

    // Usamos o flow para apagar ambas as chaves numa única chamada de rede.
    await this.sdkClient.flow()
      .del(messagesKey)
      .del(modelKey)
      .del(metadataKey)
      .execute();
  }
}


 
