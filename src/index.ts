import { RedisAPIClient } from 'sdk-ioredis-fastify';

/**
 * Interface para uma única mensagem na conversação.
 */
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

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
 * LLMCache - Um cliente Singleton para gerir o cache de conversas de LLM.
 *
 * Esta classe usa o ioredis-fastify-sdk para interagir com o Redis,
 * abstraindo a lógica de armazenamento de histórico de mensagens e metadados.
 */
export class LLMCache {
  private static instance: LLMCache;
  private sdkClient: RedisAPIClient;

  /**
   * O construtor é privado para forçar o uso do padrão Singleton.
   * @param baseURL A URL base da API ioredis-fastify.
   */
  private constructor(baseURL: string, apiVersion: string = 'v1') {
    this.sdkClient = new RedisAPIClient({
      baseURL,
      apiVersion,
    });
  }

  /**
   * Obtém a instância única (Singleton) do LLMCache.
   * Se nenhuma instância existir, uma nova é criada.
   * @param baseURL A URL base da API. É necessária apenas na primeira chamada.
   * @returns A instância do LLMCache.
   */
  public static getInstance(baseURL?: string): LLMCache {
    if (!LLMCache.instance) {
      if (!baseURL) {
        throw new Error('A baseURL é necessária na primeira inicialização do LLMCache.');
      }
      LLMCache.instance = new LLMCache(baseURL);
    }
    return LLMCache.instance;
  }
  
  // --- Funções de Gestão do Cache ---

  /**
   * Adiciona uma nova mensagem ao histórico de conversação de um utilizador.
   * @param userId O identificador único do utilizador.
   * @param message O objeto da mensagem a ser adicionado.
   */
  public async addMessage(userId: string, message: Message): Promise<void> {
    const key = `llm-cache:${userId}:messages`;
    // As listas do Redis são perfeitas para históricos de chat.
    await this.sdkClient.lists.push(key, [message]);
  }

  /**
   * Define o modelo de LLM a ser usado para um utilizador.
   * @param userId O identificador único do utilizador.
   * @param modelName O nome do modelo (ex: 'gemini-1.5-pro').
   */
  public async setModel(userId: string, modelName: string): Promise<void> {
    const key = `llm-cache:${userId}:model`;
    await this.sdkClient.keys.set(key, modelName);
  }
  
  /**
   * Obtém o modelo de LLM configurado para um utilizador.
   * @param userId O identificador único do utilizador.
   * @returns O nome do modelo ou null se não estiver definido.
   */
  public async getModel(userId: string): Promise<string | null> {
    const key = `llm-cache:${userId}:model`;
    return this.sdkClient.keys.get<string>(key);
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
    const key = `llm-cache:${userId}:messages`;
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
    const messagesKey = `llm-cache:${userId}:messages`;
    const modelKey = `llm-cache:${userId}:model`;

    // Usamos o flow para apagar ambas as chaves numa única chamada de rede.
    await this.sdkClient.flow()
      .del(messagesKey)
      .del(modelKey)
      .execute();
  }
}


 
