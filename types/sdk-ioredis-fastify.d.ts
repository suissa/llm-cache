declare module 'sdk-ioredis-fastify' {
  export interface RedisClientConfig {
    baseURL: string;
    apiVersion?: string;
  }

  export interface RedisKeysAPI {
    set<T = unknown>(key: string, value: T, ttlSeconds?: number): Promise<void>;
    get<T = unknown>(key: string): Promise<T | null>;
    expire(key: string, seconds: number): Promise<void>;
  }

  export interface RedisListsAPI {
    push(key: string, values: any[], direction?: 'left' | 'right'): Promise<number>;
    getRange<T = unknown>(key: string, start: number, stop: number): Promise<T[]>;
  }

  export interface RedisFlowBuilder {
    del(...keys: string[]): RedisFlowBuilder;
    execute<T = unknown>(): Promise<T>;
  }

  export class RedisAPIClient {
    constructor(config: RedisClientConfig);
    readonly keys: RedisKeysAPI;
    readonly lists: RedisListsAPI;
    flow(): RedisFlowBuilder;
  }
}
