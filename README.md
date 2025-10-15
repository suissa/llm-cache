# llm-cache

Camada de cache focada em conversas de LLM construída por cima do
[sdk-ioredis-fastify](https://github.com/suissa/sdk-ioredis-fastify). A biblioteca
expõe um Singleton que concentra toda a comunicação com o backend Redis, o que
facilita a partilha do mesmo cliente entre diferentes partes da aplicação sem
precisar reconfigurar conexão.

## Funcionalidades

- Guardar mensagens de chat em listas do Redis com TTL opcional por
  utilizador.
- Guardar o modelo LLM associado ao utilizador com TTL opcional.
- Guardar metadados ricos (resumo, token usage, preferências, estado de ferramentas).
- Recuperar uma janela da conversação (com suporte a `lastN`).
- Limpar histórico e metadados de um utilizador num único `flow`.

## Instalação

```bash
npm install sdk-ioredis-fastify
npm install llm-cache
```

> **Nota:** O SDK de Redis é um peer obrigatório. Certifique-se de que o seu
> projecto possui acesso ao endpoint HTTP fornecido pelo fastify.

## Utilização

```ts
import { LLMCache } from 'llm-cache';

const cache = LLMCache.getInstance({
  baseURL: process.env.REDIS_SDK_URL!,
  apiVersion: 'v1',
  conversationTTLSeconds: 60 * 30, // 30 minutos
});

await cache.addMessage('user-123', { role: 'user', content: 'Olá!' });
await cache.addMessage('user-123', { role: 'assistant', content: 'Olá 👋' });

const context = await cache.getConversationWindow('user-123', { lastN: 2 });

await cache.upsertConversationMetadata('user-123', {
  summary: 'Saudação rápida entre utilizador e assistente.',
  lastInteractionAt: Date.now(),
  tokenUsage: { totalTokens: 24 },
});
```

Veja `src/example.ts` para um exemplo mais completo.

## Boas práticas e possíveis melhorias

- Definir `conversationTTLSeconds` e `modelTTLSeconds` para evitar acumular
  dados antigos no Redis.
- Aplicar uma política de trimming (`LTRIM`) quando o SDK passar a suportar
  essa operação para manter apenas as N mensagens mais recentes sem ter de
  apagar o histórico completo.
- Guardar dados contextuais além das mensagens:
  - Resumos parciais por janela para reidratar rapidamente conversas longas;
  - Estatísticas de tokens/custo para efeitos de billing e limites de uso;
  - Preferências do utilizador (idioma, tom, persona) e estado de ferramentas
    externas necessárias para responder;
  - Resultados intermédios relevantes (links, IDs de recursos, anexos).
- Envolver chamadas de rede em camadas de retry / observabilidade (logs,
  métricas) na aplicação que consumir esta lib.
- Adicionar testes unitários utilizando mocks do `sdk-ioredis-fastify` para
  validar a serialização das mensagens antes de publicar num registo npm.