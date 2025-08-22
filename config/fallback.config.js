/**
 * Local File Fallback Configuration
 * 
 * Configuration for the multi-agent-observability-system's local file fallback mode.
 * This enables offline operation when Redis/network is unavailable.
 */

module.exports = {
  // Fallback Storage Configuration
  fallback: {
    // Enable/disable fallback storage
    enabled: process.env.CLAUDE_FALLBACK_ENABLED !== 'false',
    
    // Storage directory for local files
    storage_dir: process.env.CLAUDE_FALLBACK_DIR || '~/.claude/fallback',
    
    // Data retention in days
    retention_days: parseInt(process.env.CLAUDE_FALLBACK_RETENTION_DAYS || '30'),
    
    // Maximum storage size in MB
    max_size_mb: parseInt(process.env.CLAUDE_FALLBACK_MAX_SIZE_MB || '500'),
    
    // Automatic cleanup interval in milliseconds
    cleanup_interval: parseInt(process.env.CLAUDE_FALLBACK_CLEANUP_INTERVAL || '86400000'), // 24 hours
  },

  // Redis Connection Configuration
  redis: {
    // Connection URL
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    
    // Connection timeout in milliseconds
    timeout: parseInt(process.env.CLAUDE_REDIS_TIMEOUT || '2000'),
    
    // Health check retry interval in milliseconds
    retry_interval: parseInt(process.env.CLAUDE_REDIS_RETRY_INTERVAL || '30000'),
    
    // Maximum connection retries
    max_retries: parseInt(process.env.CLAUDE_REDIS_MAX_RETRIES || '3'),
    
    // Health check interval in milliseconds
    health_check_interval: parseInt(process.env.CLAUDE_REDIS_HEALTH_CHECK_INTERVAL || '60000'),
  },

  // Sync Service Configuration
  sync: {
    // Enable/disable sync back to Redis
    enabled: process.env.CLAUDE_SYNC_ENABLED !== 'false',
    
    // Sync interval in milliseconds
    sync_interval: parseInt(process.env.CLAUDE_SYNC_INTERVAL || '30000'),
    
    // Batch size for sync operations
    batch_size: parseInt(process.env.CLAUDE_SYNC_BATCH_SIZE || '100'),
    
    // Maximum retry attempts for failed sync operations
    max_retries: parseInt(process.env.CLAUDE_SYNC_MAX_RETRIES || '3'),
    
    // Backoff strategy for failed operations
    backoff_strategy: process.env.CLAUDE_SYNC_BACKOFF || 'exponential',
    
    // Auto-sync on Redis reconnection
    auto_sync_on_reconnect: process.env.CLAUDE_SYNC_ON_RECONNECT !== 'false',
  },

  // Logging Configuration
  logging: {
    // Log level for fallback operations
    level: process.env.CLAUDE_FALLBACK_LOG_LEVEL || 'info',
    
    // Enable verbose logging
    verbose: process.env.CLAUDE_FALLBACK_VERBOSE === 'true',
    
    // Log file location (optional)
    log_file: process.env.CLAUDE_FALLBACK_LOG_FILE,
  },

  // Performance Configuration
  performance: {
    // SQLite WAL mode
    wal_mode: process.env.CLAUDE_FALLBACK_WAL_MODE !== 'false',
    
    // SQLite cache size in KB
    cache_size: parseInt(process.env.CLAUDE_FALLBACK_CACHE_SIZE || '64000'),
    
    // Batch insert size for bulk operations
    batch_insert_size: parseInt(process.env.CLAUDE_FALLBACK_BATCH_INSERT_SIZE || '1000'),
    
    // Connection pool size
    connection_pool_size: parseInt(process.env.CLAUDE_FALLBACK_POOL_SIZE || '5'),
  },

  // Feature Flags
  features: {
    // Enable session handoff storage
    session_handoffs: process.env.CLAUDE_FALLBACK_HANDOFFS !== 'false',
    
    // Enable agent execution tracking
    agent_tracking: process.env.CLAUDE_FALLBACK_AGENT_TRACKING !== 'false',
    
    // Enable metrics aggregation
    metrics_aggregation: process.env.CLAUDE_FALLBACK_METRICS !== 'false',
    
    // Enable terminal status tracking
    terminal_status: process.env.CLAUDE_FALLBACK_TERMINAL_STATUS !== 'false',
    
    // Enable sync queue
    sync_queue: process.env.CLAUDE_FALLBACK_SYNC_QUEUE !== 'false',
  },

  // Safety Configuration
  safety: {
    // Maximum file size for individual files in MB
    max_file_size_mb: parseInt(process.env.CLAUDE_FALLBACK_MAX_FILE_SIZE_MB || '10'),
    
    // Maximum number of files in a directory
    max_files_per_directory: parseInt(process.env.CLAUDE_FALLBACK_MAX_FILES_PER_DIR || '10000'),
    
    // Enable data integrity checks
    integrity_checks: process.env.CLAUDE_FALLBACK_INTEGRITY_CHECKS !== 'false',
    
    // Backup interval in milliseconds
    backup_interval: parseInt(process.env.CLAUDE_FALLBACK_BACKUP_INTERVAL || '86400000'), // 24 hours
  },

  // Development Configuration
  development: {
    // Enable debug mode
    debug: process.env.NODE_ENV === 'development' || process.env.CLAUDE_FALLBACK_DEBUG === 'true',
    
    // Force fallback mode for testing
    force_fallback: process.env.CLAUDE_FORCE_FALLBACK === 'true',
    
    // Mock Redis failures for testing
    mock_redis_failures: process.env.CLAUDE_MOCK_REDIS_FAILURES === 'true',
    
    // Enable performance profiling
    profiling: process.env.CLAUDE_FALLBACK_PROFILING === 'true',
  },

  // Monitoring Configuration
  monitoring: {
    // Enable health checks
    health_checks: process.env.CLAUDE_FALLBACK_HEALTH_CHECKS !== 'false',
    
    // Health check interval in milliseconds
    health_check_interval: parseInt(process.env.CLAUDE_FALLBACK_HEALTH_INTERVAL || '60000'),
    
    // Enable metrics collection
    metrics_collection: process.env.CLAUDE_FALLBACK_METRICS_COLLECTION !== 'false',
    
    // Metrics export interval in milliseconds
    metrics_export_interval: parseInt(process.env.CLAUDE_FALLBACK_METRICS_EXPORT_INTERVAL || '300000'), // 5 minutes
  },

  // Hooks Integration Configuration
  hooks: {
    // Enable fallback for session context loader
    session_context_loader: process.env.CLAUDE_FALLBACK_CONTEXT_LOADER !== 'false',
    
    // Enable fallback for subagent start hook
    subagent_start: process.env.CLAUDE_FALLBACK_SUBAGENT_START !== 'false',
    
    // Enable fallback for subagent stop hook
    subagent_stop: process.env.CLAUDE_FALLBACK_SUBAGENT_STOP !== 'false',
    
    // Enable fallback for notification hook
    notification: process.env.CLAUDE_FALLBACK_NOTIFICATION !== 'false',
  }
};

/**
 * Environment Variables Reference:
 * 
 * Core Configuration:
 * - CLAUDE_FALLBACK_ENABLED: Enable/disable fallback mode (default: true)
 * - CLAUDE_FALLBACK_DIR: Storage directory (default: ~/.claude/fallback)
 * - CLAUDE_FALLBACK_RETENTION_DAYS: Data retention period (default: 30)
 * - CLAUDE_FALLBACK_MAX_SIZE_MB: Maximum storage size (default: 500)
 * 
 * Redis Configuration:
 * - REDIS_URL: Redis connection URL (default: redis://localhost:6379)
 * - CLAUDE_REDIS_TIMEOUT: Connection timeout in ms (default: 2000)
 * - CLAUDE_REDIS_RETRY_INTERVAL: Retry interval in ms (default: 30000)
 * - CLAUDE_REDIS_MAX_RETRIES: Maximum retries (default: 3)
 * 
 * Sync Configuration:
 * - CLAUDE_SYNC_ENABLED: Enable sync service (default: true)
 * - CLAUDE_SYNC_INTERVAL: Sync interval in ms (default: 30000)
 * - CLAUDE_SYNC_BATCH_SIZE: Operations per batch (default: 100)
 * - CLAUDE_SYNC_MAX_RETRIES: Max sync retries (default: 3)
 * - CLAUDE_SYNC_BACKOFF: Backoff strategy (default: exponential)
 * 
 * Development/Testing:
 * - CLAUDE_FORCE_FALLBACK: Force fallback mode (default: false)
 * - CLAUDE_MOCK_REDIS_FAILURES: Mock Redis failures (default: false)
 * - CLAUDE_FALLBACK_DEBUG: Enable debug logging (default: false)
 * - CLAUDE_FALLBACK_VERBOSE: Verbose logging (default: false)
 * 
 * Performance Tuning:
 * - CLAUDE_FALLBACK_CACHE_SIZE: SQLite cache size in KB (default: 64000)
 * - CLAUDE_FALLBACK_BATCH_INSERT_SIZE: Batch insert size (default: 1000)
 * - CLAUDE_FALLBACK_POOL_SIZE: Connection pool size (default: 5)
 * 
 * Safety/Limits:
 * - CLAUDE_FALLBACK_MAX_FILE_SIZE_MB: Max file size (default: 10)
 * - CLAUDE_FALLBACK_MAX_FILES_PER_DIR: Max files per directory (default: 10000)
 * - CLAUDE_FALLBACK_INTEGRITY_CHECKS: Enable integrity checks (default: true)
 */