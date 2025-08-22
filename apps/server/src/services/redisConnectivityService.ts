import { createClient } from 'redis';
import type { RedisClientType } from 'redis';

export interface RedisConnectionStatus {
  isConnected: boolean;
  lastCheck: number;
  error?: string;
  latency?: number;
  version?: string;
}

export interface RedisHealthCheck {
  ping: boolean;
  memory: boolean;
  keyspace: boolean;
  replication: boolean;
  persistence: boolean;
}

class RedisConnectivityService {
  private client: RedisClientType | null = null;
  private status: RedisConnectionStatus = {
    isConnected: false,
    lastCheck: 0
  };
  private checkInterval: NodeJS.Timeout | null = null;
  private callbacks: Set<(status: RedisConnectionStatus) => void> = new Set();
  private config = {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    timeout: parseInt(process.env.REDIS_TIMEOUT || '2000'),
    retryInterval: parseInt(process.env.REDIS_RETRY_INTERVAL || '30000'),
    maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '3'),
    healthCheckInterval: parseInt(process.env.REDIS_HEALTH_CHECK_INTERVAL || '60000')
  };

  constructor() {
    this.initializeClient();
    this.startHealthCheck();
  }

  private async initializeClient(): Promise<void> {
    try {
      if (this.client) {
        try {
          await this.client.quit();
        } catch (e) {
          // Ignore errors when closing
        }
      }

      this.client = createClient({
        url: this.config.url,
        socket: {
          connectTimeout: this.config.timeout,
          commandTimeout: this.config.timeout
        }
      });

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.updateStatus(false, err.message);
      });

      this.client.on('connect', () => {
        console.log('Redis connected');
        this.updateStatus(true);
      });

      this.client.on('ready', () => {
        console.log('Redis ready');
        this.updateStatus(true);
      });

      this.client.on('end', () => {
        console.log('Redis connection ended');
        this.updateStatus(false, 'Connection ended');
      });

      this.client.on('reconnecting', () => {
        console.log('Redis reconnecting');
        this.updateStatus(false, 'Reconnecting');
      });

    } catch (error) {
      console.error('Failed to initialize Redis client:', error);
      this.updateStatus(false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private updateStatus(isConnected: boolean, error?: string, latency?: number): void {
    const previousStatus = this.status.isConnected;
    
    this.status = {
      isConnected,
      lastCheck: Date.now(),
      error,
      latency
    };

    // Notify callbacks if status changed
    if (previousStatus !== isConnected) {
      console.log(`Redis status changed: ${isConnected ? 'connected' : 'disconnected'}`);
      this.callbacks.forEach(callback => {
        try {
          callback(this.status);
        } catch (e) {
          console.error('Error in Redis status callback:', e);
        }
      });
    }
  }

  async testConnection(): Promise<RedisConnectionStatus> {
    const startTime = Date.now();
    
    try {
      if (!this.client) {
        await this.initializeClient();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      // Connect if not connected
      if (!this.client.isOpen) {
        await this.client.connect();
      }

      // Test with ping
      const pingStart = Date.now();
      await this.client.ping();
      const latency = Date.now() - pingStart;

      // Get Redis version
      let version: string | undefined;
      try {
        const info = await this.client.info('server');
        const versionMatch = info.match(/redis_version:([^\r\n]+)/);
        version = versionMatch ? versionMatch[1] : undefined;
      } catch (e) {
        // Ignore version check errors
      }

      this.updateStatus(true, undefined, latency);
      this.status.version = version;
      
      return this.status;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection test failed';
      this.updateStatus(false, errorMessage);
      return this.status;
    }
  }

  async performHealthCheck(): Promise<RedisHealthCheck> {
    const health: RedisHealthCheck = {
      ping: false,
      memory: false,
      keyspace: false,
      replication: false,
      persistence: false
    };

    try {
      if (!this.client || !this.client.isOpen) {
        return health;
      }

      // Test ping
      try {
        await this.client.ping();
        health.ping = true;
      } catch (e) {
        console.error('Redis ping failed:', e);
      }

      // Test memory info
      try {
        const memoryInfo = await this.client.info('memory');
        health.memory = memoryInfo.includes('used_memory:');
      } catch (e) {
        console.error('Redis memory info failed:', e);
      }

      // Test keyspace info
      try {
        const keyspaceInfo = await this.client.info('keyspace');
        health.keyspace = true; // If we can get keyspace info, it's working
      } catch (e) {
        console.error('Redis keyspace info failed:', e);
      }

      // Test replication info
      try {
        const replicationInfo = await this.client.info('replication');
        health.replication = replicationInfo.includes('role:');
      } catch (e) {
        console.error('Redis replication info failed:', e);
      }

      // Test persistence info
      try {
        const persistenceInfo = await this.client.info('persistence');
        health.persistence = persistenceInfo.includes('loading:');
      } catch (e) {
        console.error('Redis persistence info failed:', e);
      }

    } catch (error) {
      console.error('Redis health check failed:', error);
    }

    return health;
  }

  private startHealthCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(async () => {
      await this.testConnection();
    }, this.config.healthCheckInterval);

    // Perform initial check
    setTimeout(() => this.testConnection(), 1000);
  }

  async waitForConnection(timeoutMs: number = 10000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const status = await this.testConnection();
      if (status.isConnected) {
        return true;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return false;
  }

  async executeWithFallback<T>(
    redisOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>
  ): Promise<T> {
    try {
      // First check if Redis is available
      if (!this.status.isConnected) {
        const connectionStatus = await this.testConnection();
        if (!connectionStatus.isConnected) {
          console.log('Redis unavailable, using fallback');
          return await fallbackOperation();
        }
      }

      // Try Redis operation
      return await redisOperation();
    } catch (error) {
      console.warn('Redis operation failed, falling back to local storage:', error);
      this.updateStatus(false, error instanceof Error ? error.message : 'Operation failed');
      return await fallbackOperation();
    }
  }

  onStatusChange(callback: (status: RedisConnectionStatus) => void): () => void {
    this.callbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
    };
  }

  getStatus(): RedisConnectionStatus {
    return { ...this.status };
  }

  isConnected(): boolean {
    return this.status.isConnected;
  }

  getClient(): RedisClientType | null {
    return this.client;
  }

  async getConnectionInfo(): Promise<{
    status: RedisConnectionStatus;
    health: RedisHealthCheck;
    config: typeof this.config;
    stats?: {
      total_connections_received?: string;
      total_commands_processed?: string;
      uptime_in_seconds?: string;
      used_memory_human?: string;
      connected_clients?: string;
    };
  }> {
    const status = await this.testConnection();
    const health = await this.performHealthCheck();
    
    let stats: any = {};
    if (status.isConnected && this.client) {
      try {
        const info = await this.client.info('stats');
        const memory = await this.client.info('memory');
        const clients = await this.client.info('clients');
        const server = await this.client.info('server');
        
        const parseInfoValue = (info: string, key: string): string | undefined => {
          const match = info.match(new RegExp(`${key}:([^\r\n]+)`));
          return match ? match[1] : undefined;
        };

        stats = {
          total_connections_received: parseInfoValue(info, 'total_connections_received'),
          total_commands_processed: parseInfoValue(info, 'total_commands_processed'),
          uptime_in_seconds: parseInfoValue(server, 'uptime_in_seconds'),
          used_memory_human: parseInfoValue(memory, 'used_memory_human'),
          connected_clients: parseInfoValue(clients, 'connected_clients')
        };
      } catch (e) {
        console.error('Failed to get Redis stats:', e);
      }
    }

    return {
      status,
      health,
      config: { ...this.config },
      stats
    };
  }

  async testOperations(): Promise<{
    set: boolean;
    get: boolean;
    hset: boolean;
    hget: boolean;
    sadd: boolean;
    smembers: boolean;
    zadd: boolean;
    zrange: boolean;
    del: boolean;
  }> {
    const results = {
      set: false,
      get: false,
      hset: false,
      hget: false,
      sadd: false,
      smembers: false,
      zadd: false,
      zrange: false,
      del: false
    };

    if (!this.client || !this.status.isConnected) {
      return results;
    }

    const testKey = `test:connectivity:${Date.now()}`;
    const testValue = 'test-value';

    try {
      // Test string operations
      try {
        await this.client.set(testKey, testValue);
        results.set = true;
        
        const retrieved = await this.client.get(testKey);
        results.get = retrieved === testValue;
      } catch (e) {
        console.error('Redis string operations failed:', e);
      }

      // Test hash operations
      try {
        await this.client.hSet(`${testKey}:hash`, 'field', testValue);
        results.hset = true;
        
        const hashValue = await this.client.hGet(`${testKey}:hash`, 'field');
        results.hget = hashValue === testValue;
      } catch (e) {
        console.error('Redis hash operations failed:', e);
      }

      // Test set operations
      try {
        await this.client.sAdd(`${testKey}:set`, testValue);
        results.sadd = true;
        
        const setMembers = await this.client.sMembers(`${testKey}:set`);
        results.smembers = setMembers.includes(testValue);
      } catch (e) {
        console.error('Redis set operations failed:', e);
      }

      // Test sorted set operations
      try {
        await this.client.zAdd(`${testKey}:zset`, { score: 1, value: testValue });
        results.zadd = true;
        
        const zsetMembers = await this.client.zRange(`${testKey}:zset`, 0, -1);
        results.zrange = zsetMembers.includes(testValue);
      } catch (e) {
        console.error('Redis sorted set operations failed:', e);
      }

      // Test delete operations
      try {
        const deletedCount = await this.client.del([
          testKey,
          `${testKey}:hash`,
          `${testKey}:set`,
          `${testKey}:zset`
        ]);
        results.del = deletedCount > 0;
      } catch (e) {
        console.error('Redis delete operations failed:', e);
      }

    } catch (error) {
      console.error('Redis operations test failed:', error);
    }

    return results;
  }

  async close(): Promise<void> {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    if (this.client) {
      try {
        await this.client.quit();
      } catch (e) {
        console.error('Error closing Redis client:', e);
      }
      this.client = null;
    }

    this.callbacks.clear();
    this.updateStatus(false, 'Service closed');
  }

  // Static method for quick connection test
  static async quickTest(url?: string, timeoutMs: number = 2000): Promise<boolean> {
    let client: RedisClientType | null = null;
    
    try {
      client = createClient({
        url: url || process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          connectTimeout: timeoutMs,
          commandTimeout: timeoutMs
        }
      });

      await client.connect();
      await client.ping();
      return true;
    } catch (error) {
      return false;
    } finally {
      if (client) {
        try {
          await client.quit();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }
  }
}

// Create singleton instance
export const redisConnectivity = new RedisConnectivityService();

export default RedisConnectivityService;