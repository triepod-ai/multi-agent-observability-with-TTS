import type { RedisClientType } from 'redis';
import { redisConnectivity } from './redisConnectivityService';
import { fallbackStorage, type SyncOperation } from './fallbackStorageService';

export interface SyncStats {
  total_operations: number;
  synced_operations: number;
  failed_operations: number;
  pending_operations: number;
  last_sync_time: number;
  sync_rate_per_minute: number;
  error_rate_percentage: number;
}

export interface SyncResult {
  success: boolean;
  operations_synced: number;
  operations_failed: number;
  errors: Array<{
    operation_id: number;
    error: string;
    operation: SyncOperation;
  }>;
  duration_ms: number;
}

class FallbackSyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private lastSyncTime = 0;
  private config = {
    enabled: process.env.CLAUDE_SYNC_ENABLED !== 'false',
    syncInterval: parseInt(process.env.CLAUDE_SYNC_INTERVAL || '30000'),
    batchSize: parseInt(process.env.CLAUDE_SYNC_BATCH_SIZE || '100'),
    maxRetries: parseInt(process.env.CLAUDE_SYNC_MAX_RETRIES || '3'),
    backoffStrategy: process.env.CLAUDE_SYNC_BACKOFF || 'exponential'
  };

  constructor() {
    if (this.config.enabled) {
      this.startPeriodicSync();
      this.setupRedisStatusListener();
    }
  }

  private setupRedisStatusListener(): void {
    redisConnectivity.onStatusChange(async (status) => {
      if (status.isConnected && this.config.enabled) {
        console.log('Redis connection restored, triggering sync...');
        // Small delay to ensure Redis is fully ready
        setTimeout(() => this.performSync(), 1000);
      }
    });
  }

  private startPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      if (redisConnectivity.isConnected() && !this.isSyncing) {
        await this.performSync();
      }
    }, this.config.syncInterval);

    console.log(`Fallback sync service started (interval: ${this.config.syncInterval}ms)`);
  }

  async performSync(forceSync: boolean = false): Promise<SyncResult> {
    if (this.isSyncing && !forceSync) {
      return {
        success: false,
        operations_synced: 0,
        operations_failed: 0,
        errors: [{ operation_id: -1, error: 'Sync already in progress', operation: {} as SyncOperation }],
        duration_ms: 0
      };
    }

    const startTime = Date.now();
    this.isSyncing = true;

    const result: SyncResult = {
      success: true,
      operations_synced: 0,
      operations_failed: 0,
      errors: [],
      duration_ms: 0
    };

    try {
      const redisClient = redisConnectivity.getClient();
      if (!redisClient || !redisConnectivity.isConnected()) {
        throw new Error('Redis not available');
      }

      // Get pending operations
      const operations = await fallbackStorage.getPendingSyncOperations(this.config.batchSize);
      
      if (operations.length === 0) {
        console.log('No pending sync operations');
        result.duration_ms = Date.now() - startTime;
        return result;
      }

      console.log(`Starting sync of ${operations.length} operations...`);

      // Process operations in batches
      for (const operation of operations) {
        try {
          await this.syncSingleOperation(redisClient, operation);
          await fallbackStorage.markSyncOperationComplete(operation.id!);
          result.operations_synced++;
        } catch (error) {
          console.error(`Failed to sync operation ${operation.id}:`, error);
          await fallbackStorage.markSyncOperationFailed(operation.id!);
          result.operations_failed++;
          result.errors.push({
            operation_id: operation.id!,
            error: error instanceof Error ? error.message : 'Unknown error',
            operation
          });

          // Don't mark as failed overall unless too many errors
          if (result.errors.length > operations.length * 0.5) {
            result.success = false;
          }
        }
      }

      this.lastSyncTime = Date.now();
      console.log(`Sync completed: ${result.operations_synced} synced, ${result.operations_failed} failed`);

    } catch (error) {
      console.error('Sync process failed:', error);
      result.success = false;
      result.errors.push({
        operation_id: -1,
        error: error instanceof Error ? error.message : 'Sync process failed',
        operation: {} as SyncOperation
      });
    } finally {
      this.isSyncing = false;
      result.duration_ms = Date.now() - startTime;
    }

    return result;
  }

  private async syncSingleOperation(redisClient: RedisClientType, operation: SyncOperation): Promise<void> {
    const { operation_type, redis_key, redis_value, redis_score, hash_field, ttl_seconds } = operation;

    try {
      switch (operation_type.toLowerCase()) {
        case 'set':
          if (ttl_seconds) {
            await redisClient.setEx(redis_key, ttl_seconds, redis_value!);
          } else {
            await redisClient.set(redis_key, redis_value!);
          }
          break;

        case 'setex':
          await redisClient.setEx(redis_key, ttl_seconds || 3600, redis_value!);
          break;

        case 'hset':
          if (hash_field) {
            await redisClient.hSet(redis_key, hash_field, redis_value!);
          } else {
            // Assume redis_value is a JSON object for multiple fields
            const fields = JSON.parse(redis_value!);
            await redisClient.hSet(redis_key, fields);
          }
          if (ttl_seconds) {
            await redisClient.expire(redis_key, ttl_seconds);
          }
          break;

        case 'hincrby':
          await redisClient.hIncrBy(redis_key, hash_field!, parseInt(redis_value!));
          if (ttl_seconds) {
            await redisClient.expire(redis_key, ttl_seconds);
          }
          break;

        case 'hincrbyfloat':
          await redisClient.hIncrByFloat(redis_key, hash_field!, parseFloat(redis_value!));
          if (ttl_seconds) {
            await redisClient.expire(redis_key, ttl_seconds);
          }
          break;

        case 'sadd':
          await redisClient.sAdd(redis_key, redis_value!);
          if (ttl_seconds) {
            await redisClient.expire(redis_key, ttl_seconds);
          }
          break;

        case 'srem':
          await redisClient.sRem(redis_key, redis_value!);
          break;

        case 'zadd':
          if (redis_score !== undefined) {
            await redisClient.zAdd(redis_key, { score: redis_score, value: redis_value! });
          }
          if (ttl_seconds) {
            await redisClient.expire(redis_key, ttl_seconds);
          }
          break;

        case 'zincrby':
          await redisClient.zIncrBy(redis_key, parseFloat(redis_value!), hash_field!);
          if (ttl_seconds) {
            await redisClient.expire(redis_key, ttl_seconds);
          }
          break;

        case 'del':
          await redisClient.del(redis_key);
          break;

        case 'expire':
          await redisClient.expire(redis_key, ttl_seconds || 3600);
          break;

        case 'lpush':
          await redisClient.lPush(redis_key, redis_value!);
          if (ttl_seconds) {
            await redisClient.expire(redis_key, ttl_seconds);
          }
          break;

        case 'ltrim':
          // redis_value should contain "start,stop" format
          const [start, stop] = redis_value!.split(',').map(Number);
          await redisClient.lTrim(redis_key, start, stop);
          break;

        default:
          throw new Error(`Unsupported operation type: ${operation_type}`);
      }
    } catch (error) {
      console.error(`Failed to execute ${operation_type} on ${redis_key}:`, error);
      throw error;
    }
  }

  async forceSyncAll(): Promise<SyncResult> {
    console.log('Forcing sync of all pending operations...');
    return await this.performSync(true);
  }

  async getSyncStats(): Promise<SyncStats> {
    try {
      const stats = await fallbackStorage.getStorageStats();
      
      // Calculate sync rate (operations per minute)
      const timeSinceLastSync = Date.now() - this.lastSyncTime;
      const syncRatePerMinute = this.lastSyncTime > 0 
        ? Math.round((60000 / Math.max(timeSinceLastSync, this.config.syncInterval)) * this.config.batchSize)
        : 0;

      // Get total operations from sync queue
      const totalOperations = stats.record_counts.sync_queue || 0;
      const pendingOperations = stats.pending_sync_operations;
      const syncedOperations = totalOperations - pendingOperations;
      
      // Estimate failed operations (operations that exceeded retry limit)
      // This is an approximation since we clean up completed operations
      const failedOperations = Math.max(0, totalOperations - syncedOperations - pendingOperations);

      const errorRate = totalOperations > 0 
        ? Math.round((failedOperations / totalOperations) * 100 * 100) / 100
        : 0;

      return {
        total_operations: totalOperations,
        synced_operations: syncedOperations,
        failed_operations: failedOperations,
        pending_operations: pendingOperations,
        last_sync_time: this.lastSyncTime,
        sync_rate_per_minute: syncRatePerMinute,
        error_rate_percentage: errorRate
      };
    } catch (error) {
      console.error('Error getting sync stats:', error);
      return {
        total_operations: 0,
        synced_operations: 0,
        failed_operations: 0,
        pending_operations: 0,
        last_sync_time: this.lastSyncTime,
        sync_rate_per_minute: 0,
        error_rate_percentage: 0
      };
    }
  }

  async clearSyncQueue(olderThanHours: number = 24): Promise<number> {
    try {
      if (!fallbackStorage.isEnabled()) {
        return 0;
      }

      // This would need to be implemented in fallbackStorage
      // For now, we'll just return 0
      console.log(`Clearing sync queue items older than ${olderThanHours} hours`);
      return 0;
    } catch (error) {
      console.error('Error clearing sync queue:', error);
      return 0;
    }
  }

  async testSync(): Promise<{
    connection_test: boolean;
    single_operation_test: boolean;
    batch_operation_test: boolean;
    error?: string;
  }> {
    const result = {
      connection_test: false,
      single_operation_test: false,
      batch_operation_test: false,
      error: undefined as string | undefined
    };

    try {
      // Test Redis connection
      result.connection_test = redisConnectivity.isConnected();
      if (!result.connection_test) {
        result.error = 'Redis not connected';
        return result;
      }

      const redisClient = redisConnectivity.getClient();
      if (!redisClient) {
        result.error = 'Redis client not available';
        return result;
      }

      // Test single operation
      try {
        const testOperation: SyncOperation = {
          operation_type: 'set',
          redis_key: `test:sync:${Date.now()}`,
          redis_value: 'test-value',
          sync_status: 'pending',
          sync_attempts: 0
        };

        await this.syncSingleOperation(redisClient, testOperation);
        
        // Verify the operation worked
        const value = await redisClient.get(testOperation.redis_key);
        result.single_operation_test = value === 'test-value';

        // Clean up
        await redisClient.del(testOperation.redis_key);
      } catch (error) {
        result.error = `Single operation test failed: ${error}`;
        return result;
      }

      // Test batch operations
      try {
        const testOperations: SyncOperation[] = [
          {
            operation_type: 'set',
            redis_key: `test:batch:1:${Date.now()}`,
            redis_value: 'batch-value-1',
            sync_status: 'pending',
            sync_attempts: 0
          },
          {
            operation_type: 'hset',
            redis_key: `test:batch:2:${Date.now()}`,
            hash_field: 'field1',
            redis_value: 'batch-value-2',
            sync_status: 'pending',
            sync_attempts: 0
          },
          {
            operation_type: 'sadd',
            redis_key: `test:batch:3:${Date.now()}`,
            redis_value: 'batch-member',
            sync_status: 'pending',
            sync_attempts: 0
          }
        ];

        for (const operation of testOperations) {
          await this.syncSingleOperation(redisClient, operation);
        }

        // Verify operations
        const value1 = await redisClient.get(testOperations[0].redis_key);
        const value2 = await redisClient.hGet(testOperations[1].redis_key, 'field1');
        const isMember = await redisClient.sIsMember(testOperations[2].redis_key, 'batch-member');

        result.batch_operation_test = 
          value1 === 'batch-value-1' && 
          value2 === 'batch-value-2' && 
          isMember;

        // Clean up
        await redisClient.del([
          testOperations[0].redis_key,
          testOperations[1].redis_key,
          testOperations[2].redis_key
        ]);
      } catch (error) {
        result.error = `Batch operation test failed: ${error}`;
        return result;
      }

    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return result;
  }

  isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  getConfig() {
    return { ...this.config };
  }

  async updateConfig(newConfig: Partial<typeof this.config>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    
    // Restart periodic sync if interval changed
    if (newConfig.syncInterval !== undefined && this.config.enabled) {
      this.startPeriodicSync();
    }

    // Stop sync if disabled
    if (newConfig.enabled === false && this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    // Start sync if enabled
    if (newConfig.enabled === true && !this.syncInterval) {
      this.startPeriodicSync();
    }

    console.log('Sync service configuration updated:', this.config);
  }

  async close(): Promise<void> {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    this.isSyncing = false;
    console.log('Fallback sync service closed');
  }
}

// Create singleton instance
export const fallbackSync = new FallbackSyncService();

export default FallbackSyncService;