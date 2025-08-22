import { createClient } from 'redis';
import type { RedisClientType } from 'redis';
import { redisConnectivity } from './redisConnectivityService';

// Circuit breaker states
enum CircuitState {
  CLOSED = 'closed',     // Normal operation
  OPEN = 'open',         // Failing, reject immediately
  HALF_OPEN = 'half_open' // Testing recovery
}

interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeoutMs: number;
  monitoringWindowMs: number;
}

export class RedisCache {
  private client: RedisClientType | null = null;
  private circuitState: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private successCount: number = 0;
  private readonly retryConfig: RetryConfig;
  private readonly circuitConfig: CircuitBreakerConfig;
  private connectionPromise: Promise<RedisClientType> | null = null;

  constructor() {
    this.retryConfig = {
      maxAttempts: parseInt(process.env.REDIS_MAX_RETRIES || '3'),
      baseDelayMs: parseInt(process.env.REDIS_BASE_DELAY_MS || '1000'),
      maxDelayMs: parseInt(process.env.REDIS_MAX_DELAY_MS || '8000')
    };

    this.circuitConfig = {
      failureThreshold: parseInt(process.env.REDIS_FAILURE_THRESHOLD || '5'),
      recoveryTimeoutMs: parseInt(process.env.REDIS_RECOVERY_TIMEOUT_MS || '30000'),
      monitoringWindowMs: parseInt(process.env.REDIS_MONITORING_WINDOW_MS || '60000')
    };
  }

  private async createClient(): Promise<RedisClientType> {
    const client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 5000,
        commandTimeout: 3000,
        reconnectDelay: Math.min(this.retryConfig.baseDelayMs * Math.pow(2, this.failureCount), this.retryConfig.maxDelayMs)
      }
    });

    client.on('error', (err) => {
      console.error('Redis Client Error:', err.message);
      this.recordFailure(err);
    });

    client.on('connect', () => {
      console.log('Redis connected successfully');
      this.recordSuccess();
    });

    client.on('ready', () => {
      console.log('Redis client ready');
      this.recordSuccess();
    });

    client.on('end', () => {
      console.log('Redis connection ended');
      this.recordFailure(new Error('Connection ended'));
    });

    await client.connect();
    return client;
  }

  private async getClient(): Promise<RedisClientType> {
    // Circuit breaker check
    if (this.circuitState === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime >= this.circuitConfig.recoveryTimeoutMs) {
        console.log('Circuit breaker transitioning to HALF_OPEN');
        this.circuitState = CircuitState.HALF_OPEN;
      } else {
        throw new Error('Circuit breaker is OPEN - Redis operations blocked');
      }
    }

    // If we already have a connection attempt in progress, wait for it
    if (this.connectionPromise) {
      try {
        return await this.connectionPromise;
      } catch (error) {
        this.connectionPromise = null;
        throw error;
      }
    }

    // If client exists and is connected, use it
    if (this.client?.isOpen) {
      return this.client;
    }

    // Create new connection with promise caching
    this.connectionPromise = this.createClient()
      .then(client => {
        this.client = client;
        this.connectionPromise = null;
        return client;
      })
      .catch(error => {
        this.connectionPromise = null;
        throw error;
      });

    return this.connectionPromise;
  }

  private recordSuccess(): void {
    this.successCount++;
    
    if (this.circuitState === CircuitState.HALF_OPEN) {
      console.log('Circuit breaker healing - transitioning to CLOSED');
      this.circuitState = CircuitState.CLOSED;
      this.failureCount = 0;
    }

    // Reset failure count on successful operations (within monitoring window)
    if (Date.now() - this.lastFailureTime > this.circuitConfig.monitoringWindowMs) {
      this.failureCount = 0;
    }
  }

  private recordFailure(error: Error): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    console.error(`Redis failure ${this.failureCount}/${this.circuitConfig.failureThreshold}:`, error.message);

    if (this.failureCount >= this.circuitConfig.failureThreshold) {
      console.error('Circuit breaker OPENED - Redis operations will be blocked');
      this.circuitState = CircuitState.OPEN;
      this.client?.disconnect().catch(() => {});
      this.client = null;
    }
  }

  private async executeWithRetry<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        const client = await this.getClient();
        const result = await operation.call(null);
        
        this.recordSuccess();
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(`${error}`);
        
        console.warn(`Redis ${operationName} attempt ${attempt}/${this.retryConfig.maxAttempts} failed:`, lastError.message);
        
        this.recordFailure(lastError);

        // Don't retry if circuit is open
        if (this.circuitState === CircuitState.OPEN) {
          break;
        }

        // Don't retry on the last attempt
        if (attempt === this.retryConfig.maxAttempts) {
          break;
        }

        // Exponential backoff with jitter
        const delay = Math.min(
          this.retryConfig.baseDelayMs * Math.pow(2, attempt - 1),
          this.retryConfig.maxDelayMs
        );
        const jitter = Math.random() * 0.1 * delay;
        
        console.log(`Retrying ${operationName} in ${Math.round(delay + jitter)}ms`);
        await new Promise(resolve => setTimeout(resolve, delay + jitter));
      }
    }

    throw lastError || new Error(`${operationName} failed after ${this.retryConfig.maxAttempts} attempts`);
  }

  // Public API methods with retry logic and circuit breaker

  async get(key: string): Promise<string | null> {
    return this.executeWithRetry(async () => {
      const client = await this.getClient();
      return client.get(key);
    }, `GET ${key}`);
  }

  async set(key: string, value: string, ttl?: number): Promise<string | null> {
    return this.executeWithRetry(async () => {
      const client = await this.getClient();
      if (ttl) {
        return client.setEx(key, ttl, value);
      }
      return client.set(key, value);
    }, `SET ${key}`);
  }

  async del(keys: string | string[]): Promise<number> {
    return this.executeWithRetry(async () => {
      const client = await this.getClient();
      return client.del(keys);
    }, `DEL ${Array.isArray(keys) ? keys.join(',') : keys}`);
  }

  async hGet(key: string, field: string): Promise<string | undefined> {
    return this.executeWithRetry(async () => {
      const client = await this.getClient();
      return client.hGet(key, field);
    }, `HGET ${key} ${field}`);
  }

  async hGetAll(key: string): Promise<Record<string, string>> {
    return this.executeWithRetry(async () => {
      const client = await this.getClient();
      return client.hGetAll(key);
    }, `HGETALL ${key}`);
  }

  async hSet(key: string, field: string, value: string): Promise<number> {
    return this.executeWithRetry(async () => {
      const client = await this.getClient();
      return client.hSet(key, field, value);
    }, `HSET ${key} ${field}`);
  }

  async hIncrBy(key: string, field: string, increment: number): Promise<number> {
    return this.executeWithRetry(async () => {
      const client = await this.getClient();
      return client.hIncrBy(key, field, increment);
    }, `HINCRBY ${key} ${field} ${increment}`);
  }

  async sAdd(key: string, members: string | string[]): Promise<number> {
    return this.executeWithRetry(async () => {
      const client = await this.getClient();
      return client.sAdd(key, members);
    }, `SADD ${key}`);
  }

  async sMembers(key: string): Promise<string[]> {
    return this.executeWithRetry(async () => {
      const client = await this.getClient();
      return client.sMembers(key);
    }, `SMEMBERS ${key}`);
  }

  async sRem(key: string, members: string | string[]): Promise<number> {
    return this.executeWithRetry(async () => {
      const client = await this.getClient();
      return client.sRem(key, members);
    }, `SREM ${key}`);
  }

  async zAdd(key: string, members: { score: number; value: string } | { score: number; value: string }[]): Promise<number> {
    return this.executeWithRetry(async () => {
      const client = await this.getClient();
      return client.zAdd(key, members);
    }, `ZADD ${key}`);
  }

  async zIncrBy(key: string, increment: number, member: string): Promise<number> {
    return this.executeWithRetry(async () => {
      const client = await this.getClient();
      return client.zIncrBy(key, increment, member);
    }, `ZINCRBY ${key} ${increment} ${member}`);
  }

  async zRange(key: string, start: number, stop: number): Promise<string[]> {
    return this.executeWithRetry(async () => {
      const client = await this.getClient();
      return client.zRange(key, start, stop);
    }, `ZRANGE ${key} ${start} ${stop}`);
  }

  async zRangeWithScores(key: string, start: number, stop: number, options?: any): Promise<Array<{ value: string; score: number }>> {
    return this.executeWithRetry(async () => {
      const client = await this.getClient();
      return client.zRangeWithScores(key, start, stop, options);
    }, `ZRANGE ${key} ${start} ${stop} WITHSCORES`);
  }

  async zRemRangeByRank(key: string, start: number, stop: number): Promise<number> {
    return this.executeWithRetry(async () => {
      const client = await this.getClient();
      return client.zRemRangeByRank(key, start, stop);
    }, `ZREMRANGEBYRANK ${key} ${start} ${stop}`);
  }

  async lPush(key: string, elements: string | string[]): Promise<number> {
    return this.executeWithRetry(async () => {
      const client = await this.getClient();
      return client.lPush(key, elements);
    }, `LPUSH ${key}`);
  }

  async lRange(key: string, start: number, stop: number): Promise<string[]> {
    return this.executeWithRetry(async () => {
      const client = await this.getClient();
      return client.lRange(key, start, stop);
    }, `LRANGE ${key} ${start} ${stop}`);
  }

  async lTrim(key: string, start: number, stop: number): Promise<string> {
    return this.executeWithRetry(async () => {
      const client = await this.getClient();
      return client.lTrim(key, start, stop);
    }, `LTRIM ${key} ${start} ${stop}`);
  }

  async keys(pattern: string): Promise<string[]> {
    return this.executeWithRetry(async () => {
      const client = await this.getClient();
      return client.keys(pattern);
    }, `KEYS ${pattern}`);
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    return this.executeWithRetry(async () => {
      const client = await this.getClient();
      return client.expire(key, seconds);
    }, `EXPIRE ${key} ${seconds}`);
  }

  async setEx(key: string, seconds: number, value: string): Promise<string | null> {
    return this.executeWithRetry(async () => {
      const client = await this.getClient();
      return client.setEx(key, seconds, value);
    }, `SETEX ${key} ${seconds}`);
  }

  async multi(): Promise<any> {
    // Multi transaction creation should not be retried - only the final exec() should be
    const client = await this.getClient();
    return client.multi();
  }

  async ping(): Promise<string> {
    return this.executeWithRetry(async () => {
      const client = await this.getClient();
      return client.ping();
    }, 'PING');
  }

  // Health and status methods

  getCircuitState(): CircuitState {
    return this.circuitState;
  }

  getFailureCount(): number {
    return this.failureCount;
  }

  isHealthy(): boolean {
    return this.circuitState !== CircuitState.OPEN && redisConnectivity.isConnected();
  }

  getStatus(): {
    circuitState: CircuitState;
    failureCount: number;
    successCount: number;
    lastFailureTime: number;
    isConnected: boolean;
    client: {
      isOpen: boolean;
      isReady: boolean;
    } | null;
  } {
    return {
      circuitState: this.circuitState,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      isConnected: redisConnectivity.isConnected(),
      client: this.client ? {
        isOpen: this.client.isOpen,
        isReady: this.client.isReady
      } : null
    };
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    circuitState: CircuitState;
    latency?: number;
    error?: string;
  }> {
    try {
      if (this.circuitState === CircuitState.OPEN) {
        return {
          status: 'unhealthy',
          circuitState: this.circuitState,
          error: 'Circuit breaker is OPEN'
        };
      }

      const startTime = Date.now();
      await this.ping();
      const latency = Date.now() - startTime;

      return {
        status: this.circuitState === CircuitState.HALF_OPEN ? 'degraded' : 'healthy',
        circuitState: this.circuitState,
        latency
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        circuitState: this.circuitState,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async close(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
      } catch (error) {
        console.error('Error closing Redis client:', error);
      }
      this.client = null;
    }
    this.connectionPromise = null;
  }

  // Force circuit breaker open for testing
  forceCircuitOpen(): void {
    this.circuitState = CircuitState.OPEN;
    this.failureCount = this.circuitConfig.failureThreshold;
    this.lastFailureTime = Date.now();
    console.warn('Circuit breaker forced OPEN for testing');
  }

  // Force circuit breaker closed for recovery
  forceCircuitClosed(): void {
    this.circuitState = CircuitState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = 0;
    console.log('Circuit breaker forced CLOSED for recovery');
  }
}

// Create and export singleton instance
export const redisCache = new RedisCache();

export default RedisCache;