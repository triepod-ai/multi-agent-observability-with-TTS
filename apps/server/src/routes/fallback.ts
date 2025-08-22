import { Router } from 'express';
import { redisConnectivity } from '../services/redisConnectivityService';
import { fallbackStorage } from '../services/fallbackStorageService';
import { fallbackSync } from '../services/fallbackSyncService';

const router = Router();

// Get fallback system status
router.get('/status', async (req, res) => {
  try {
    const redisStatus = await redisConnectivity.getConnectionInfo();
    const storageStats = await fallbackStorage.getStorageStats();
    const syncStats = await fallbackSync.getSyncStats();
    
    res.json({
      redis: redisStatus,
      fallback_storage: {
        enabled: fallbackStorage.isEnabled(),
        stats: storageStats
      },
      sync_service: {
        enabled: fallbackSync.getConfig().enabled,
        is_syncing: fallbackSync.isSyncInProgress(),
        stats: syncStats
      },
      overall_status: {
        mode: redisStatus.status.isConnected ? 'redis' : 'fallback',
        operational: true,
        last_update: Date.now()
      }
    });
  } catch (error) {
    console.error('Error getting fallback status:', error);
    res.status(500).json({ 
      error: 'Failed to get fallback status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test Redis connectivity
router.post('/test-redis', async (req, res) => {
  try {
    const connectionStatus = await redisConnectivity.testConnection();
    const operationsTest = await redisConnectivity.testOperations();
    
    res.json({
      connection: connectionStatus,
      operations: operationsTest,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error testing Redis connectivity:', error);
    res.status(500).json({ 
      error: 'Failed to test Redis connectivity',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Force sync to Redis
router.post('/sync', async (req, res) => {
  try {
    if (!redisConnectivity.isConnected()) {
      return res.status(400).json({
        error: 'Redis not connected',
        message: 'Cannot sync when Redis is not available'
      });
    }

    const syncResult = await fallbackSync.forceSyncAll();
    
    res.json({
      success: syncResult.success,
      operations_synced: syncResult.operations_synced,
      operations_failed: syncResult.operations_failed,
      duration_ms: syncResult.duration_ms,
      errors: syncResult.errors.length > 0 ? syncResult.errors : undefined,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error forcing sync:', error);
    res.status(500).json({ 
      error: 'Failed to force sync',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test sync functionality
router.post('/test-sync', async (req, res) => {
  try {
    const testResult = await fallbackSync.testSync();
    
    res.json({
      ...testResult,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error testing sync:', error);
    res.status(500).json({ 
      error: 'Failed to test sync functionality',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get sync queue status
router.get('/sync-queue', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const operations = await fallbackStorage.getPendingSyncOperations(limit);
    const stats = await fallbackSync.getSyncStats();
    
    res.json({
      pending_operations: operations,
      stats: stats,
      total_pending: operations.length,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error getting sync queue:', error);
    res.status(500).json({ 
      error: 'Failed to get sync queue',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Clear sync queue
router.delete('/sync-queue', async (req, res) => {
  try {
    const olderThanHours = parseInt(req.query.olderThanHours as string) || 24;
    const clearedCount = await fallbackSync.clearSyncQueue(olderThanHours);
    
    res.json({
      cleared_operations: clearedCount,
      older_than_hours: olderThanHours,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error clearing sync queue:', error);
    res.status(500).json({ 
      error: 'Failed to clear sync queue',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update sync configuration
router.put('/sync-config', async (req, res) => {
  try {
    const { enabled, syncInterval, batchSize, maxRetries } = req.body;
    
    const newConfig: any = {};
    if (typeof enabled === 'boolean') newConfig.enabled = enabled;
    if (typeof syncInterval === 'number') newConfig.syncInterval = syncInterval;
    if (typeof batchSize === 'number') newConfig.batchSize = batchSize;
    if (typeof maxRetries === 'number') newConfig.maxRetries = maxRetries;
    
    await fallbackSync.updateConfig(newConfig);
    
    res.json({
      success: true,
      config: fallbackSync.getConfig(),
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error updating sync config:', error);
    res.status(500).json({ 
      error: 'Failed to update sync configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get fallback storage configuration
router.get('/config', async (req, res) => {
  try {
    const fallbackConfig = fallbackStorage.getConfig();
    const syncConfig = fallbackSync.getConfig();
    
    res.json({
      fallback_storage: fallbackConfig,
      sync_service: syncConfig,
      environment_variables: {
        CLAUDE_FALLBACK_ENABLED: process.env.CLAUDE_FALLBACK_ENABLED || 'true',
        CLAUDE_FALLBACK_DIR: process.env.CLAUDE_FALLBACK_DIR || '~/.claude/fallback',
        CLAUDE_REDIS_TIMEOUT: process.env.CLAUDE_REDIS_TIMEOUT || '2',
        CLAUDE_SYNC_INTERVAL: process.env.CLAUDE_SYNC_INTERVAL || '30000',
        CLAUDE_SYNC_BATCH_SIZE: process.env.CLAUDE_SYNC_BATCH_SIZE || '100',
        CLAUDE_SYNC_MAX_RETRIES: process.env.CLAUDE_SYNC_MAX_RETRIES || '3'
      },
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error getting fallback config:', error);
    res.status(500).json({ 
      error: 'Failed to get fallback configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Cleanup old data
router.post('/cleanup', async (req, res) => {
  try {
    await fallbackStorage.cleanup();
    const stats = await fallbackStorage.getStorageStats();
    
    res.json({
      success: true,
      message: 'Cleanup completed',
      storage_stats: stats,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error during cleanup:', error);
    res.status(500).json({ 
      error: 'Failed to cleanup storage',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get session handoffs for a project
router.get('/handoffs/:projectName', async (req, res) => {
  try {
    const { projectName } = req.params;
    const handoffContent = await fallbackStorage.getLatestSessionHandoff(projectName);
    
    res.json({
      project_name: projectName,
      handoff_content: handoffContent,
      has_content: handoffContent.length > 0,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error getting session handoff:', error);
    res.status(500).json({ 
      error: 'Failed to get session handoff',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Save session handoff
router.post('/handoffs/:projectName', async (req, res) => {
  try {
    const { projectName } = req.params;
    const { handoff_content, session_id, metadata } = req.body;
    
    if (!handoff_content) {
      return res.status(400).json({
        error: 'Missing handoff_content in request body'
      });
    }
    
    const success = await fallbackStorage.saveSessionHandoff(
      projectName, 
      handoff_content, 
      session_id, 
      metadata
    );
    
    if (success) {
      res.json({
        success: true,
        message: 'Session handoff saved',
        project_name: projectName,
        timestamp: Date.now()
      });
    } else {
      res.status(500).json({
        error: 'Failed to save session handoff'
      });
    }
  } catch (error) {
    console.error('Error saving session handoff:', error);
    res.status(500).json({ 
      error: 'Failed to save session handoff',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const redisConnected = redisConnectivity.isConnected();
    const fallbackEnabled = fallbackStorage.isEnabled();
    
    const health = {
      status: 'healthy',
      redis_available: redisConnected,
      fallback_enabled: fallbackEnabled,
      operational_mode: redisConnected ? 'redis' : 'fallback',
      timestamp: Date.now()
    };
    
    // If neither Redis nor fallback is working, mark as unhealthy
    if (!redisConnected && !fallbackEnabled) {
      health.status = 'unhealthy';
      res.status(503);
    }
    
    res.json(health);
  } catch (error) {
    console.error('Error checking health:', error);
    res.status(503).json({ 
      status: 'unhealthy',
      error: 'Health check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    });
  }
});

export default router;