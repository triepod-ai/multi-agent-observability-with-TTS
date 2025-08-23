import { Database } from 'bun:sqlite';
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import type { AgentStatus, HookEvent } from '../types';

export interface FallbackConfig {
  enabled: boolean;
  storage_dir: string;
  retention_days: number;
  max_size_mb: number;
  redis_timeout: number;
  sync_interval: number;
  sync_batch_size: number;
  max_retries: number;
}

export interface AgentExecution {
  agent_id: string;
  agent_name: string;
  agent_type: string;
  status: 'active' | 'complete' | 'failed';
  start_time: number;
  end_time?: number;
  duration_ms?: number;
  session_id?: string;
  task_description?: string;
  tools_granted?: string[];
  token_usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    estimated_cost: number;
  };
  performance_metrics?: Record<string, any>;
  source_app?: string;
  progress?: number;
}

export interface HourlyMetrics {
  hour_key: string;
  agent_type: string;
  hour_timestamp: number;
  execution_count: number;
  success_count: number;
  failure_count: number;
  total_duration_ms: number;
  total_tokens: number;
  total_cost: number;
}

export interface DailyMetrics {
  day_key: string;
  day_timestamp: number;
  total_executions: number;
  success_count: number;
  failure_count: number;
  total_duration_ms: number;
  total_tokens: number;
  total_cost: number;
}

export interface ToolUsage {
  tool_name: string;
  date_key: string;
  usage_count: number;
  agents_using: string[];
}

export interface TimeRange {
  start: number;
  end: number;
}

export interface MetricsSummary {
  total_executions: number;
  success_rate: number;
  avg_duration_ms: number;
  total_tokens: number;
  total_cost: number;
  period: string;
}

export interface SyncOperation {
  id?: number;
  operation_type: string;
  redis_key: string;
  redis_value?: string;
  redis_score?: number;
  hash_field?: string;
  ttl_seconds?: number;
  sync_status: 'pending' | 'synced' | 'failed';
  sync_attempts: number;
  last_sync_attempt?: number;
}

export interface SessionHandoff {
  project_name: string;
  timestamp: string;
  session_id?: string;
  handoff_content: string;
  metadata?: Record<string, any>;
}

class FallbackStorageService {
  private db: Database | null = null;
  private config: FallbackConfig;
  private storageDir: string;
  private isInitialized = false;

  constructor(config?: Partial<FallbackConfig>) {
    this.config = {
      enabled: true,
      storage_dir: join(homedir(), '.claude', 'fallback'),
      retention_days: 30,
      max_size_mb: 500,
      redis_timeout: 2,
      sync_interval: 30,
      sync_batch_size: 100,
      max_retries: 3,
      ...config
    };

    this.storageDir = this.config.storage_dir.replace('~', homedir());
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create storage directories
      this.ensureDirectories();

      // Initialize SQLite database
      const dbPath = join(this.storageDir, 'storage.db');
      this.db = new Database(dbPath);
      
      // Enable WAL mode for better concurrent performance
      this.db.exec('PRAGMA journal_mode = WAL');
      this.db.exec('PRAGMA synchronous = NORMAL');
      this.db.exec('PRAGMA cache_size = -64000'); // 64MB cache

      // Create tables
      this.createTables();

      // Create indexes
      this.createIndexes();

      this.isInitialized = true;
      console.log(`Fallback storage initialized at: ${this.storageDir}`);
    } catch (error) {
      console.error('Failed to initialize fallback storage:', error);
      throw error;
    }
  }

  private ensureDirectories(): void {
    const dirs = [
      this.storageDir,
      join(this.storageDir, 'handoffs'),
      join(this.storageDir, 'metrics', 'hourly'),
      join(this.storageDir, 'metrics', 'daily'),
      join(this.storageDir, 'metrics', 'agents'),
      join(this.storageDir, 'terminal', 'active'),
      join(this.storageDir, 'terminal', 'completed'),
      join(this.storageDir, 'sync')
    ];

    dirs.forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });
  }

  private createTables(): void {
    if (!this.db) throw new Error('Database not initialized');

    // Agent executions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agent_executions (
        agent_id TEXT PRIMARY KEY,
        agent_name TEXT NOT NULL,
        agent_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        start_time INTEGER NOT NULL,
        end_time INTEGER,
        duration_ms INTEGER,
        session_id TEXT,
        task_description TEXT,
        tools_granted TEXT,
        token_usage TEXT,
        performance_metrics TEXT,
        source_app TEXT,
        progress INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);

    // Enhanced metrics table for individual agent execution records
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agent_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        session_id TEXT NOT NULL,
        agent_type TEXT NOT NULL,
        agent_name TEXT,
        tokens_used INTEGER DEFAULT 0,
        duration_ms INTEGER DEFAULT 0,
        success BOOLEAN DEFAULT 1,
        estimated_cost INTEGER DEFAULT 0,
        tool_name TEXT,
        source_app TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);

    // Agent timeline for time-series chart data
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agent_timeline (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        metric_type TEXT NOT NULL,
        value REAL NOT NULL,
        agent_type TEXT,
        source_app TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);

    // Enhanced tool usage tracking
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tool_usage_enhanced (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tool_name TEXT NOT NULL,
        usage_count INTEGER DEFAULT 1,
        agent_type TEXT,
        timestamp INTEGER NOT NULL,
        source_app TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);

    // Agent performance history
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agent_performance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_name TEXT NOT NULL,
        agent_type TEXT NOT NULL,
        execution_time INTEGER NOT NULL,
        duration_ms INTEGER NOT NULL,
        tokens_used INTEGER DEFAULT 0,
        estimated_cost INTEGER DEFAULT 0,
        success BOOLEAN DEFAULT 1,
        session_id TEXT,
        source_app TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);

    // Hourly metrics table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS metrics_hourly (
        hour_key TEXT PRIMARY KEY,
        agent_type TEXT NOT NULL,
        hour_timestamp INTEGER NOT NULL,
        execution_count INTEGER DEFAULT 0,
        success_count INTEGER DEFAULT 0,
        failure_count INTEGER DEFAULT 0,
        total_duration_ms INTEGER DEFAULT 0,
        total_tokens INTEGER DEFAULT 0,
        total_cost REAL DEFAULT 0.0,
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);

    // Daily metrics table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS metrics_daily (
        day_key TEXT PRIMARY KEY,
        day_timestamp INTEGER NOT NULL,
        total_executions INTEGER DEFAULT 0,
        success_count INTEGER DEFAULT 0,
        failure_count INTEGER DEFAULT 0,
        total_duration_ms INTEGER DEFAULT 0,
        total_tokens INTEGER DEFAULT 0,
        total_cost REAL DEFAULT 0.0,
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);

    // Tool usage table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tool_usage (
        tool_name TEXT NOT NULL,
        date_key TEXT NOT NULL,
        usage_count INTEGER DEFAULT 0,
        agents_using TEXT,
        PRIMARY KEY (tool_name, date_key)
      )
    `);

    // Terminal status table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS terminal_status (
        agent_id TEXT PRIMARY KEY,
        agent_name TEXT NOT NULL,
        agent_type TEXT NOT NULL,
        status TEXT NOT NULL,
        start_time INTEGER NOT NULL,
        end_time INTEGER,
        duration_ms INTEGER,
        session_id TEXT,
        source_app TEXT,
        progress INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);

    // Sync queue table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        operation_type TEXT NOT NULL,
        redis_key TEXT NOT NULL,
        redis_value TEXT,
        redis_score REAL,
        hash_field TEXT,
        ttl_seconds INTEGER,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        sync_status TEXT DEFAULT 'pending',
        sync_attempts INTEGER DEFAULT 0,
        last_sync_attempt INTEGER
      )
    `);
  }

  private createIndexes(): void {
    if (!this.db) throw new Error('Database not initialized');

    const indexes = [
      // Agent executions indexes
      'CREATE INDEX IF NOT EXISTS idx_agent_executions_status ON agent_executions(status)',
      'CREATE INDEX IF NOT EXISTS idx_agent_executions_session_id ON agent_executions(session_id)',
      'CREATE INDEX IF NOT EXISTS idx_agent_executions_agent_type ON agent_executions(agent_type)',
      'CREATE INDEX IF NOT EXISTS idx_agent_executions_start_time ON agent_executions(start_time)',
      
      // Agent metrics indexes
      'CREATE INDEX IF NOT EXISTS idx_agent_metrics_timestamp ON agent_metrics(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_agent_metrics_session_id ON agent_metrics(session_id)',
      'CREATE INDEX IF NOT EXISTS idx_agent_metrics_agent_type ON agent_metrics(agent_type)',
      'CREATE INDEX IF NOT EXISTS idx_agent_metrics_agent_name ON agent_metrics(agent_name)',
      'CREATE INDEX IF NOT EXISTS idx_agent_metrics_success ON agent_metrics(success)',
      'CREATE INDEX IF NOT EXISTS idx_agent_metrics_source_app ON agent_metrics(source_app)',
      
      // Agent timeline indexes
      'CREATE INDEX IF NOT EXISTS idx_agent_timeline_timestamp ON agent_timeline(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_agent_timeline_metric_type ON agent_timeline(metric_type)',
      'CREATE INDEX IF NOT EXISTS idx_agent_timeline_agent_type ON agent_timeline(agent_type)',
      'CREATE INDEX IF NOT EXISTS idx_agent_timeline_composite ON agent_timeline(timestamp, metric_type)',
      
      // Enhanced tool usage indexes
      'CREATE INDEX IF NOT EXISTS idx_tool_usage_enhanced_tool_name ON tool_usage_enhanced(tool_name)',
      'CREATE INDEX IF NOT EXISTS idx_tool_usage_enhanced_timestamp ON tool_usage_enhanced(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_tool_usage_enhanced_agent_type ON tool_usage_enhanced(agent_type)',
      
      // Agent performance indexes
      'CREATE INDEX IF NOT EXISTS idx_agent_performance_agent_name ON agent_performance(agent_name)',
      'CREATE INDEX IF NOT EXISTS idx_agent_performance_execution_time ON agent_performance(execution_time)',
      'CREATE INDEX IF NOT EXISTS idx_agent_performance_duration_ms ON agent_performance(duration_ms)',
      'CREATE INDEX IF NOT EXISTS idx_agent_performance_success ON agent_performance(success)',
      
      // Original indexes
      'CREATE INDEX IF NOT EXISTS idx_metrics_hourly_timestamp ON metrics_hourly(hour_timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_metrics_hourly_agent_type ON metrics_hourly(agent_type)',
      'CREATE INDEX IF NOT EXISTS idx_metrics_daily_timestamp ON metrics_daily(day_timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_tool_usage_date ON tool_usage(date_key)',
      'CREATE INDEX IF NOT EXISTS idx_terminal_status_status ON terminal_status(status)',
      'CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(sync_status)',
      'CREATE INDEX IF NOT EXISTS idx_sync_queue_created_at ON sync_queue(created_at)'
    ];

    indexes.forEach(indexSql => {
      this.db!.exec(indexSql);
    });
  }

  // Agent Execution Methods
  async insertAgentExecution(execution: AgentExecution): Promise<boolean> {
    if (!this.db) await this.initialize();

    try {
      const stmt = this.db!.prepare(`
        INSERT OR REPLACE INTO agent_executions 
        (agent_id, agent_name, agent_type, status, start_time, end_time, duration_ms,
         session_id, task_description, tools_granted, token_usage, performance_metrics,
         source_app, progress)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        execution.agent_id,
        execution.agent_name,
        execution.agent_type,
        execution.status,
        execution.start_time,
        execution.end_time || null,
        execution.duration_ms || null,
        execution.session_id || null,
        execution.task_description || null,
        execution.tools_granted ? JSON.stringify(execution.tools_granted) : null,
        execution.token_usage ? JSON.stringify(execution.token_usage) : null,
        execution.performance_metrics ? JSON.stringify(execution.performance_metrics) : null,
        execution.source_app || null,
        execution.progress || 0
      );

      // Queue sync operation - FIX: Ensure agent_id is string, not object
      const agentDataStr = JSON.stringify({
        agent_id: execution.agent_id,
        agent_name: execution.agent_name,
        start_time: new Date(execution.start_time).toISOString(),
        task_description: execution.task_description,
        tools_granted: execution.tools_granted,
        context_size: 0
      });

      await this.queueSyncOperation('hset', `agent:active:${execution.agent_id}`, agentDataStr, undefined, undefined, 300);
      await this.queueSyncOperation('sadd', 'agents:active', execution.agent_id);

      return true;
    } catch (error) {
      console.error('Error inserting agent execution:', error);
      return false;
    }
  }

  async updateAgentExecution(agentId: string, updates: Partial<AgentExecution>): Promise<boolean> {
    if (!this.db) await this.initialize();

    try {
      const allowedFields = ['status', 'end_time', 'duration_ms', 'token_usage', 'performance_metrics', 'progress'];
      const setClause = Object.keys(updates)
        .filter(key => allowedFields.includes(key))
        .map(key => `${key} = ?`)
        .join(', ');

      if (!setClause) return false;

      const values = Object.keys(updates)
        .filter(key => allowedFields.includes(key))
        .map(key => {
          const value = updates[key as keyof AgentExecution];
          if (key === 'token_usage' || key === 'performance_metrics') {
            return JSON.stringify(value);
          }
          return value;
        });

      const stmt = this.db!.prepare(`UPDATE agent_executions SET ${setClause}, updated_at = strftime('%s', 'now') WHERE agent_id = ?`);
      const result = stmt.run(...values, agentId);

      // If completed, queue removal from active agents - FIX: Pass agentId as string
      if (updates.status === 'complete' || updates.status === 'failed') {
        await this.queueSyncOperation('srem', 'agents:active', agentId);
        await this.queueSyncOperation('del', `agent:active:${agentId}`);
      }

      return result.changes > 0;
    } catch (error) {
      console.error('Error updating agent execution:', error);
      return false;
    }
  }

  async getAgentExecution(agentId: string): Promise<AgentExecution | null> {
    if (!this.db) await this.initialize();

    try {
      const stmt = this.db!.prepare('SELECT * FROM agent_executions WHERE agent_id = ?');
      const row = stmt.get(agentId) as any;

      if (!row) return null;

      return {
        agent_id: row.agent_id,
        agent_name: row.agent_name,
        agent_type: row.agent_type,
        status: row.status,
        start_time: row.start_time,
        end_time: row.end_time,
        duration_ms: row.duration_ms,
        session_id: row.session_id,
        task_description: row.task_description,
        tools_granted: row.tools_granted ? JSON.parse(row.tools_granted) : undefined,
        token_usage: row.token_usage ? JSON.parse(row.token_usage) : undefined,
        performance_metrics: row.performance_metrics ? JSON.parse(row.performance_metrics) : undefined,
        source_app: row.source_app,
        progress: row.progress
      };
    } catch (error) {
      console.error('Error getting agent execution:', error);
      return null;
    }
  }

  async getActiveAgentExecutions(): Promise<AgentExecution[]> {
    if (!this.db) await this.initialize();

    try {
      const stmt = this.db!.prepare('SELECT * FROM agent_executions WHERE status = ? ORDER BY start_time DESC');
      const rows = stmt.all('active') as any[];

      return rows.map(row => ({
        agent_id: row.agent_id,
        agent_name: row.agent_name,
        agent_type: row.agent_type,
        status: row.status,
        start_time: row.start_time,
        end_time: row.end_time,
        duration_ms: row.duration_ms,
        session_id: row.session_id,
        task_description: row.task_description,
        tools_granted: row.tools_granted ? JSON.parse(row.tools_granted) : undefined,
        token_usage: row.token_usage ? JSON.parse(row.token_usage) : undefined,
        performance_metrics: row.performance_metrics ? JSON.parse(row.performance_metrics) : undefined,
        source_app: row.source_app,
        progress: row.progress
      }));
    } catch (error) {
      console.error('Error getting active agent executions:', error);
      return [];
    }
  }

  // Metrics Methods
  async updateMetrics(agentData: any): Promise<void> {
    if (!this.db) await this.initialize();

    // Only process if we have valid agent data with required fields
    if (!agentData || !agentData.agent_type) {
      console.log('⚠️ Skipping metrics update - no valid agent_type found');
      return;
    }

    try {
      const now = new Date();
      const hourKey = `${now.toISOString().slice(0, 13)}:${agentData.agent_type}`;
      const dayKey = now.toISOString().split('T')[0];
      const hourTimestamp = Math.floor(now.getTime() / 3600000) * 3600000; // Round to hour
      const dayTimestamp = Math.floor(now.getTime() / 86400000) * 86400000; // Round to day

      // Update hourly metrics
      const hourlyStmt = this.db!.prepare(`
        INSERT OR REPLACE INTO metrics_hourly 
        (hour_key, agent_type, hour_timestamp, execution_count, success_count, failure_count,
         total_duration_ms, total_tokens, total_cost)
        VALUES (?, ?, ?, 
          COALESCE((SELECT execution_count FROM metrics_hourly WHERE hour_key = ?), 0) + 1,
          COALESCE((SELECT success_count FROM metrics_hourly WHERE hour_key = ?), 0) + ?,
          COALESCE((SELECT failure_count FROM metrics_hourly WHERE hour_key = ?), 0) + ?,
          COALESCE((SELECT total_duration_ms FROM metrics_hourly WHERE hour_key = ?), 0) + ?,
          COALESCE((SELECT total_tokens FROM metrics_hourly WHERE hour_key = ?), 0) + ?,
          COALESCE((SELECT total_cost FROM metrics_hourly WHERE hour_key = ?), 0) + ?
        )
      `);

      const isSuccess = agentData.status === 'success' ? 1 : 0;
      const isFailure = agentData.status === 'failure' ? 1 : 0;
      const duration = agentData.duration_ms || 0;
      const tokens = agentData.token_usage?.total_tokens || 0;
      const cost = agentData.token_usage?.estimated_cost || 0;

      hourlyStmt.run(
        hourKey, agentData.agent_type, hourTimestamp,
        hourKey, hourKey, isSuccess, hourKey, isFailure,
        hourKey, duration, hourKey, tokens, hourKey, cost
      );

      // Update daily metrics
      const dailyStmt = this.db!.prepare(`
        INSERT OR REPLACE INTO metrics_daily 
        (day_key, day_timestamp, total_executions, success_count, failure_count,
         total_duration_ms, total_tokens, total_cost)
        VALUES (?, ?, 
          COALESCE((SELECT total_executions FROM metrics_daily WHERE day_key = ?), 0) + 1,
          COALESCE((SELECT success_count FROM metrics_daily WHERE day_key = ?), 0) + ?,
          COALESCE((SELECT failure_count FROM metrics_daily WHERE day_key = ?), 0) + ?,
          COALESCE((SELECT total_duration_ms FROM metrics_daily WHERE day_key = ?), 0) + ?,
          COALESCE((SELECT total_tokens FROM metrics_daily WHERE day_key = ?), 0) + ?,
          COALESCE((SELECT total_cost FROM metrics_daily WHERE day_key = ?), 0) + ?
        )
      `);

      dailyStmt.run(
        dayKey, dayTimestamp,
        dayKey, dayKey, isSuccess, dayKey, isFailure,
        dayKey, duration, dayKey, tokens, dayKey, cost
      );

      // Update tool usage (both legacy and enhanced tracking)
      if (agentData.tools_used && Array.isArray(agentData.tools_used)) {
        for (const tool of agentData.tools_used) {
          await this.updateToolUsage(tool, dayKey, agentData.agent_name);
          // Also record in enhanced tool usage table
          await this.recordToolUsage(tool, agentData.agent_type, agentData.source_app);
        }
      }

      // Queue sync operations - FIX: Ensure proper parameter types and order
      await this.queueSyncOperation('hincrby', `metrics:hourly:${hourKey}`, '1', undefined, 'execution_count');
      await this.queueSyncOperation('hincrby', `metrics:daily:${dayKey}`, '1', undefined, 'total_executions');

    } catch (error) {
      console.error('Error updating metrics:', error);
    }
  }

  private async updateToolUsage(toolName: string, dateKey: string, agentName: string): Promise<void> {
    if (!this.db) return;

    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO tool_usage 
        (tool_name, date_key, usage_count, agents_using)
        VALUES (?, ?, 
          COALESCE((SELECT usage_count FROM tool_usage WHERE tool_name = ? AND date_key = ?), 0) + 1,
          ?
        )
      `);

      // Get existing agents using this tool
      const existingStmt = this.db.prepare('SELECT agents_using FROM tool_usage WHERE tool_name = ? AND date_key = ?');
      const existing = existingStmt.get(toolName, dateKey) as any;
      
      let agentsUsing: string[] = [];
      if (existing?.agents_using) {
        agentsUsing = JSON.parse(existing.agents_using);
      }
      
      if (!agentsUsing.includes(agentName)) {
        agentsUsing.push(agentName);
      }

      stmt.run(toolName, dateKey, toolName, dateKey, JSON.stringify(agentsUsing));

      // Queue sync operation - FIX: Correct parameter order for zincrby
      await this.queueSyncOperation('zincrby', `tools:usage:${dateKey}`, '1', 1.0, toolName);
    } catch (error) {
      console.error('Error updating tool usage:', error);
    }
  }

  // Enhanced Metrics Methods for Full Metrics Support
  async recordAgentMetric(event: any): Promise<boolean> {
    if (!this.db) await this.initialize();

    try {
      const timestamp = event.timestamp || Date.now();
      
      // Insert individual metrics record
      const stmt = this.db!.prepare(`
        INSERT INTO agent_metrics 
        (timestamp, session_id, agent_type, agent_name, tokens_used, duration_ms, 
         success, estimated_cost, tool_name, source_app)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const success = event.payload?.status === 'success' || event.payload?.status !== 'failure';
      const tokens = event.payload?.token_usage?.total_tokens || 0;
      const duration = event.payload?.duration_ms || 0;
      const cost = Math.round((event.payload?.token_usage?.estimated_cost || 0) * 10000); // Store as centi-cents
      const toolName = event.payload?.tool_name || null;
      
      stmt.run(
        timestamp,
        event.session_id,
        event.payload?.agent_type || 'unknown',
        event.payload?.agent_name || 'unknown',
        tokens,
        duration,
        success ? 1 : 0,
        cost,
        toolName,
        event.source_app
      );

      // Update aggregated data via existing updateMetrics method
      // Only update metrics for events that have agent_type (actual agent events)
      if (event.payload && event.payload.agent_type) {
        await this.updateMetrics(event.payload);
      }

      // Record performance data
      if (event.payload?.agent_name && duration > 0) {
        await this.recordAgentPerformance({
          agent_name: event.payload.agent_name,
          agent_type: event.payload.agent_type || 'unknown',
          execution_time: timestamp,
          duration_ms: duration,
          tokens_used: tokens,
          estimated_cost: cost,
          success: success,
          session_id: event.session_id,
          source_app: event.source_app
        });
      }

      // Record timeline data
      await this.recordTimelineData(timestamp, [
        { metric_type: 'executions', value: 1, agent_type: event.payload?.agent_type, source_app: event.source_app },
        { metric_type: 'tokens', value: tokens, agent_type: event.payload?.agent_type, source_app: event.source_app },
        { metric_type: 'duration', value: duration, agent_type: event.payload?.agent_type, source_app: event.source_app },
        { metric_type: 'cost', value: event.payload?.token_usage?.estimated_cost || 0, agent_type: event.payload?.agent_type, source_app: event.source_app }
      ]);

      return true;
    } catch (error) {
      console.error('Error recording agent metric:', error);
      return false;
    }
  }

  async getAgentMetrics(timeRange?: TimeRange): Promise<any> {
    if (!this.db) await this.initialize();

    try {
      const now = Date.now();
      const start = timeRange?.start || (now - 24 * 60 * 60 * 1000); // Default to last 24 hours
      const end = timeRange?.end || now;

      // Get aggregated metrics
      const metricsQuery = `
        SELECT 
          COUNT(*) as total_executions,
          SUM(tokens_used) as total_tokens,
          SUM(estimated_cost) as total_cost_centi_cents,
          AVG(duration_ms) as avg_duration_ms,
          SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as success_count,
          agent_type,
          COUNT(DISTINCT agent_name) as unique_agents
        FROM agent_metrics 
        WHERE timestamp BETWEEN ? AND ?
        GROUP BY agent_type
        ORDER BY total_executions DESC
      `;

      const stmt = this.db!.prepare(metricsQuery);
      const metrics = stmt.all(start, end) as any[];

      // Calculate totals
      const totals = metrics.reduce((acc, metric) => ({
        total_executions: acc.total_executions + metric.total_executions,
        total_tokens: acc.total_tokens + metric.total_tokens,
        total_cost: acc.total_cost + (metric.total_cost_centi_cents / 10000),
        total_duration_ms: acc.total_duration_ms + (metric.avg_duration_ms * metric.total_executions),
        success_count: acc.success_count + metric.success_count
      }), { total_executions: 0, total_tokens: 0, total_cost: 0, total_duration_ms: 0, success_count: 0 });

      // Get active agents count from agent executions
      const activeAgentsStmt = this.db!.prepare(
        'SELECT COUNT(*) as count FROM agent_executions WHERE status = ?'
      );
      const activeAgents = activeAgentsStmt.get('active') as any;

      return {
        active_agents: activeAgents?.count || 0,
        executions_today: totals.total_executions,
        success_rate: totals.total_executions > 0 ? totals.success_count / totals.total_executions : 0,
        avg_duration_ms: totals.total_executions > 0 ? Math.round(totals.total_duration_ms / totals.total_executions) : 0,
        tokens_used_today: totals.total_tokens,
        estimated_cost_today: totals.total_cost,
        agent_type_breakdown: metrics.map(m => ({
          type: m.agent_type,
          executions: m.total_executions,
          success_rate: m.total_executions > 0 ? m.success_count / m.total_executions : 0,
          avg_duration_ms: Math.round(m.avg_duration_ms || 0),
          unique_agents: m.unique_agents,
          total_tokens: m.total_tokens,
          estimated_cost: m.total_cost_centi_cents / 10000
        }))
      };
    } catch (error) {
      console.error('Error getting agent metrics:', error);
      return {
        active_agents: 0,
        executions_today: 0,
        success_rate: 0,
        avg_duration_ms: 0,
        tokens_used_today: 0,
        estimated_cost_today: 0,
        agent_type_breakdown: []
      };
    }
  }

  async getAgentTimeline(timeRange?: TimeRange): Promise<any> {
    if (!this.db) await this.initialize();

    try {
      const now = Date.now();
      const start = timeRange?.start || (now - 24 * 60 * 60 * 1000);
      const end = timeRange?.end || now;

      // Get hourly timeline data
      const timelineQuery = `
        SELECT 
          strftime('%Y-%m-%d %H:00:00', datetime(timestamp/1000, 'unixepoch')) as hour,
          metric_type,
          SUM(value) as total_value,
          agent_type,
          COUNT(*) as data_points
        FROM agent_timeline 
        WHERE timestamp BETWEEN ? AND ?
        GROUP BY hour, metric_type, agent_type
        ORDER BY timestamp
      `;

      const stmt = this.db!.prepare(timelineQuery);
      const timeline = stmt.all(start, end) as any[];

      // Group by hour and metric type
      const groupedData: any = {};
      
      timeline.forEach(row => {
        if (!groupedData[row.hour]) {
          groupedData[row.hour] = {
            timestamp: new Date(row.hour).toISOString(),
            executions: 0,
            tokens: 0,
            cost: 0,
            duration: 0,
            agent_types: new Set()
          };
        }
        
        groupedData[row.hour][row.metric_type] += row.total_value;
        if (row.agent_type) {
          groupedData[row.hour].agent_types.add(row.agent_type);
        }
      });

      // Convert to array format
      const timelineArray = Object.entries(groupedData).map(([hour, data]: [string, any]) => ({
        timestamp: data.timestamp,
        executions: data.executions || 0,
        tokens: data.tokens || 0,
        cost: data.cost || 0,
        avg_duration_ms: data.executions > 0 ? Math.round(data.duration / data.executions) : 0,
        agent_types_count: data.agent_types.size,
        dominant_agent_type: Array.from(data.agent_types)[0] || 'unknown'
      }));

      return {
        timeline: timelineArray.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        )
      };
    } catch (error) {
      console.error('Error getting agent timeline:', error);
      return { timeline: [] };
    }
  }

  async getAgentDistribution(): Promise<any> {
    if (!this.db) await this.initialize();

    try {
      const distributionQuery = `
        SELECT 
          agent_type,
          COUNT(*) as count,
          AVG(duration_ms) as avg_duration_ms,
          SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) * 1.0 / COUNT(*) as success_rate,
          GROUP_CONCAT(DISTINCT tool_name) as tools_used
        FROM agent_metrics 
        WHERE timestamp > ?
        GROUP BY agent_type
        ORDER BY count DESC
      `;

      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      const stmt = this.db!.prepare(distributionQuery);
      const distribution = stmt.all(oneDayAgo) as any[];

      const totalCount = distribution.reduce((sum, item) => sum + item.count, 0);

      return {
        distribution: distribution.map(item => ({
          type: item.agent_type,
          count: item.count,
          percentage: totalCount > 0 ? item.count / totalCount : 0,
          avg_duration_ms: Math.round(item.avg_duration_ms || 0),
          success_rate: item.success_rate || 0,
          common_tools: item.tools_used ? 
            item.tools_used.split(',').filter(Boolean).slice(0, 5) : []
        }))
      };
    } catch (error) {
      console.error('Error getting agent distribution:', error);
      return { distribution: [] };
    }
  }

  async getToolUsage(): Promise<any> {
    if (!this.db) await this.initialize();

    try {
      const toolUsageQuery = `
        SELECT 
          tool_name,
          SUM(usage_count) as usage_count,
          COUNT(DISTINCT agent_type) as agent_types_using
        FROM tool_usage_enhanced 
        WHERE timestamp > ?
        AND tool_name IS NOT NULL
        GROUP BY tool_name
        ORDER BY usage_count DESC
      `;

      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      const stmt = this.db!.prepare(toolUsageQuery);
      const toolUsage = stmt.all(oneDayAgo) as any[];

      const totalUsage = toolUsage.reduce((sum, item) => sum + item.usage_count, 0);

      return {
        period: new Date(oneDayAgo).toISOString().split('T')[0],
        tools: toolUsage.map(tool => ({
          name: tool.tool_name,
          usage_count: tool.usage_count,
          percentage: totalUsage > 0 ? tool.usage_count / totalUsage : 0,
          agent_types_using: tool.agent_types_using,
          avg_per_execution: 0 // Would need execution count to calculate
        })),
        insights: {
          most_used_tool: toolUsage[0]?.tool_name || 'None',
          least_used_tool: toolUsage[toolUsage.length - 1]?.tool_name || 'None',
          total_unique_tools: toolUsage.length
        }
      };
    } catch (error) {
      console.error('Error getting tool usage:', error);
      return {
        period: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        tools: [],
        insights: {
          most_used_tool: 'None',
          least_used_tool: 'None',
          total_unique_tools: 0
        }
      };
    }
  }

  async markAgentStarted(agentData: any): Promise<string> {
    if (!this.db) await this.initialize();

    try {
      const agentId = `ag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = Date.now();

      // Create agent execution record
      const execution = {
        agent_id: agentId,
        agent_name: agentData.agent_name || 'unknown',
        agent_type: agentData.agent_type || 'generic',
        status: 'active',
        start_time: now,
        session_id: agentData.session_id || '',
        task_description: agentData.task_description || '',
        tools_granted: agentData.tools || [],
        source_app: agentData.source_app || '',
        progress: 0
      };

      const success = await this.insertAgentExecution(execution);
      if (!success) {
        throw new Error('Failed to insert agent execution');
      }

      return agentId;
    } catch (error) {
      console.error('Error marking agent as started:', error);
      throw error;
    }
  }

  async markAgentCompleted(agentData: any): Promise<boolean> {
    if (!this.db) await this.initialize();

    try {
      const agentId = agentData.agent_id;
      const now = Date.now();

      // Update agent execution with completion data
      const updates = {
        status: agentData.error ? 'failed' : 'complete',
        end_time: now,
        duration_ms: agentData.duration_ms || 0,
        token_usage: agentData.token_usage,
        performance_metrics: agentData.performance_metrics,
        progress: 100
      };

      const success = await this.updateAgentExecution(agentId, updates);
      if (!success) {
        console.warn(`Failed to update agent execution for ${agentId}`);
      }

      // Record the completion metric
      await this.recordAgentMetric({
        timestamp: now,
        session_id: agentData.session_id || '',
        source_app: agentData.source_app || '',
        payload: {
          agent_name: agentData.agent_name,
          agent_type: agentData.agent_type || 'generic',
          status: agentData.error ? 'failure' : 'success',
          duration_ms: agentData.duration_ms || 0,
          token_usage: agentData.token_usage,
          tools_used: agentData.tools_used
        }
      });

      return true;
    } catch (error) {
      console.error('Error marking agent as completed:', error);
      return false;
    }
  }

  // Helper methods for metrics support
  private async recordAgentPerformance(data: any): Promise<void> {
    if (!this.db) return;

    try {
      const stmt = this.db.prepare(`
        INSERT INTO agent_performance 
        (agent_name, agent_type, execution_time, duration_ms, tokens_used, 
         estimated_cost, success, session_id, source_app)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        data.agent_name,
        data.agent_type,
        data.execution_time,
        data.duration_ms,
        data.tokens_used || 0,
        data.estimated_cost || 0,
        data.success ? 1 : 0,
        data.session_id || null,
        data.source_app || null
      );
    } catch (error) {
      console.error('Error recording agent performance:', error);
    }
  }

  private async recordTimelineData(timestamp: number, metrics: Array<{
    metric_type: string;
    value: number;
    agent_type?: string;
    source_app?: string;
  }>): Promise<void> {
    if (!this.db) return;

    try {
      const stmt = this.db.prepare(`
        INSERT INTO agent_timeline (timestamp, metric_type, value, agent_type, source_app)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const metric of metrics) {
        if (metric.value > 0) { // Only record non-zero values
          stmt.run(
            timestamp,
            metric.metric_type,
            metric.value,
            metric.agent_type || null,
            metric.source_app || null
          );
        }
      }
    } catch (error) {
      console.error('Error recording timeline data:', error);
    }
  }

  // Tool usage recording for enhanced metrics
  async recordToolUsage(toolName: string, agentType: string, sourceApp?: string): Promise<void> {
    if (!this.db) await this.initialize();

    try {
      const stmt = this.db!.prepare(`
        INSERT INTO tool_usage_enhanced (tool_name, agent_type, timestamp, source_app)
        VALUES (?, ?, ?, ?)
      `);

      stmt.run(toolName, agentType, Date.now(), sourceApp || null);
    } catch (error) {
      console.error('Error recording tool usage:', error);
    }
  }

  // Terminal Status Methods
  async setTerminalStatus(agentStatus: AgentStatus): Promise<void> {
    if (!this.db) await this.initialize();

    try {
      const stmt = this.db!.prepare(`
        INSERT OR REPLACE INTO terminal_status 
        (agent_id, agent_name, agent_type, status, start_time, end_time, duration_ms,
         session_id, source_app, progress)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        agentStatus.agent_id,
        agentStatus.agent_name,
        agentStatus.agent_type,
        agentStatus.status,
        agentStatus.start_time,
        agentStatus.duration_ms ? agentStatus.start_time + agentStatus.duration_ms : null,
        agentStatus.duration_ms || null,
        agentStatus.session_id || null,
        agentStatus.source_app || null,
        agentStatus.progress || 0
      );

      // Queue sync operation
      const redisKey = agentStatus.status === 'complete' 
        ? `terminal:completed:${agentStatus.agent_id}`
        : `terminal:status:${agentStatus.agent_id}`;
      const ttl = agentStatus.status === 'complete' ? 60 : 300;

      await this.queueSyncOperation('setex', redisKey, JSON.stringify(agentStatus), undefined, undefined, ttl);
    } catch (error) {
      console.error('Error setting terminal status:', error);
    }
  }

  async getTerminalStatus(): Promise<{
    active_agents: AgentStatus[];
    recent_completions: AgentStatus[];
    timestamp: number;
  }> {
    if (!this.db) await this.initialize();

    try {
      // Get active agents
      const activeStmt = this.db!.prepare('SELECT * FROM terminal_status WHERE status = ? ORDER BY start_time DESC');
      const activeRows = activeStmt.all('active') as any[];

      // Get recent completions
      const completedStmt = this.db!.prepare('SELECT * FROM terminal_status WHERE status = ? ORDER BY start_time DESC LIMIT 5');
      const completedRows = completedStmt.all('complete') as any[];

      const mapRow = (row: any): AgentStatus => ({
        agent_id: row.agent_id,
        agent_name: row.agent_name,
        agent_type: row.agent_type,
        status: row.status,
        start_time: row.start_time,
        duration_ms: row.duration_ms,
        session_id: row.session_id,
        source_app: row.source_app,
        progress: row.progress,
        task_description: ''
      });

      return {
        active_agents: activeRows.map(mapRow),
        recent_completions: completedRows.map(mapRow),
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error getting terminal status:', error);
      return {
        active_agents: [],
        recent_completions: [],
        timestamp: Date.now()
      };
    }
  }

  // Session Handoff Methods
  async saveSessionHandoff(projectName: string, handoffContent: string, metadata?: Record<string, any>): Promise<boolean> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${projectName}_${timestamp.slice(0, 19)}.json`;
      const filepath = join(this.storageDir, 'handoffs', filename);
      const latestPath = join(this.storageDir, 'handoffs', `latest_${projectName}.json`);

      const handoff: SessionHandoff = {
        project_name: projectName,
        timestamp: new Date().toISOString(),
        handoff_content: handoffContent,
        metadata
      };

      writeFileSync(filepath, JSON.stringify(handoff, null, 2));
      writeFileSync(latestPath, JSON.stringify(handoff, null, 2));

      // Queue sync to Redis
      const redisKey = `handoff:project:${projectName}:${new Date().toISOString().replace(/[:.]/g, '').slice(0, 15)}`;
      await this.queueSyncOperation('setex', redisKey, handoffContent, undefined, undefined, 86400 * 30); // 30 days

      return true;
    } catch (error) {
      console.error('Error saving session handoff:', error);
      return false;
    }
  }

  async getLatestSessionHandoff(projectName: string): Promise<string> {
    try {
      const latestPath = join(this.storageDir, 'handoffs', `latest_${projectName}.json`);
      
      if (existsSync(latestPath)) {
        const content = readFileSync(latestPath, 'utf-8');
        const handoff: SessionHandoff = JSON.parse(content);
        return handoff.handoff_content;
      }

      // Fall back to searching timestamped files
      const handoffsDir = join(this.storageDir, 'handoffs');
      if (!existsSync(handoffsDir)) return '';

      const files = readdirSync(handoffsDir)
        .filter(f => f.startsWith(projectName) && f.endsWith('.json') && !f.startsWith('latest_'))
        .sort()
        .reverse();

      if (files.length > 0) {
        const content = readFileSync(join(handoffsDir, files[0]), 'utf-8');
        const handoff: SessionHandoff = JSON.parse(content);
        return handoff.handoff_content;
      }

      return '';
    } catch (error) {
      console.error('Error getting session handoff:', error);
      return '';
    }
  }

  // Sync Queue Methods - FIXED parameter handling
  private async queueSyncOperation(
    operationType: string,
    redisKey: string,
    redisValue?: string,
    redisScore?: number,
    hashField?: string,
    ttlSeconds?: number
  ): Promise<void> {
    if (!this.db) return;

    try {
      const stmt = this.db.prepare(`
        INSERT INTO sync_queue 
        (operation_type, redis_key, redis_value, redis_score, hash_field, ttl_seconds)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      // Ensure all parameters are properly typed
      const sanitizedValue = redisValue ? String(redisValue) : null;
      const sanitizedScore = redisScore !== undefined ? Number(redisScore) : null;
      const sanitizedHashField = hashField ? String(hashField) : null;
      const sanitizedTtl = ttlSeconds !== undefined ? Number(ttlSeconds) : null;

      stmt.run(operationType, redisKey, sanitizedValue, sanitizedScore, sanitizedHashField, sanitizedTtl);
    } catch (error) {
      console.error('Error queuing sync operation:', error);
    }
  }

  async getPendingSyncOperations(limit: number = 100): Promise<SyncOperation[]> {
    if (!this.db) await this.initialize();

    try {
      const stmt = this.db!.prepare(`
        SELECT * FROM sync_queue 
        WHERE sync_status = 'pending' AND sync_attempts < ?
        ORDER BY created_at 
        LIMIT ?
      `);

      const rows = stmt.all(this.config.max_retries, limit) as any[];
      return rows.map(row => ({
        id: row.id,
        operation_type: row.operation_type,
        redis_key: row.redis_key,
        redis_value: row.redis_value,
        redis_score: row.redis_score,
        hash_field: row.hash_field,
        ttl_seconds: row.ttl_seconds,
        sync_status: row.sync_status,
        sync_attempts: row.sync_attempts,
        last_sync_attempt: row.last_sync_attempt
      }));
    } catch (error) {
      console.error('Error getting pending sync operations:', error);
      return [];
    }
  }

  async markSyncOperationComplete(operationId: number): Promise<void> {
    if (!this.db) return;

    try {
      const stmt = this.db.prepare('UPDATE sync_queue SET sync_status = ?, last_sync_attempt = ? WHERE id = ?');
      stmt.run('synced', Date.now(), operationId);
    } catch (error) {
      console.error('Error marking sync operation complete:', error);
    }
  }

  async markSyncOperationFailed(operationId: number): Promise<void> {
    if (!this.db) return;

    try {
      const stmt = this.db.prepare(`
        UPDATE sync_queue 
        SET sync_attempts = sync_attempts + 1, last_sync_attempt = ?, 
            sync_status = CASE WHEN sync_attempts >= ? THEN 'failed' ELSE 'pending' END
        WHERE id = ?
      `);
      stmt.run(Date.now(), this.config.max_retries, operationId);
    } catch (error) {
      console.error('Error marking sync operation failed:', error);
    }
  }

  // Cleanup and Maintenance
  async cleanup(): Promise<void> {
    if (!this.db) return;

    try {
      const cutoffTime = Date.now() - (this.config.retention_days * 24 * 60 * 60 * 1000);

      // Clean up old agent executions
      this.db.exec(`DELETE FROM agent_executions WHERE created_at < ${cutoffTime / 1000}`);

      // Clean up old metrics
      this.db.exec(`DELETE FROM metrics_hourly WHERE hour_timestamp < ${cutoffTime}`);
      this.db.exec(`DELETE FROM metrics_daily WHERE day_timestamp < ${cutoffTime}`);

      // Clean up completed sync operations
      this.db.exec(`DELETE FROM sync_queue WHERE sync_status = 'synced' AND created_at < ${(Date.now() - 86400000) / 1000}`);

      // Clean up old handoff files
      const handoffsDir = join(this.storageDir, 'handoffs');
      if (existsSync(handoffsDir)) {
        const files = readdirSync(handoffsDir);
        files.forEach(file => {
          const filepath = join(handoffsDir, file);
          const stats = statSync(filepath);
          if (stats.mtime.getTime() < cutoffTime && !file.startsWith('latest_')) {
            try {
              require('fs').unlinkSync(filepath);
            } catch (e) {
              // Ignore file deletion errors
            }
          }
        });
      }

      console.log('Fallback storage cleanup completed');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  async getStorageStats(): Promise<{
    total_size_mb: number;
    record_counts: Record<string, number>;
    pending_sync_operations: number;
  }> {
    if (!this.db) await this.initialize();

    try {
      const tables = ['agent_executions', 'metrics_hourly', 'metrics_daily', 'tool_usage', 'terminal_status', 'sync_queue'];
      const recordCounts: Record<string, number> = {};

      for (const table of tables) {
        const stmt = this.db!.prepare(`SELECT COUNT(*) as count FROM ${table}`);
        const result = stmt.get() as { count: number };
        recordCounts[table] = result.count;
      }

      // Get pending sync operations
      const pendingStmt = this.db!.prepare('SELECT COUNT(*) as count FROM sync_queue WHERE sync_status = ?');
      const pendingResult = pendingStmt.get('pending') as { count: number };

      // Calculate total size (approximate)
      let totalSize = 0;
      try {
        const dbPath = join(this.storageDir, 'storage.db');
        if (existsSync(dbPath)) {
          totalSize += statSync(dbPath).size;
        }

        // Add handoffs directory size
        const handoffsDir = join(this.storageDir, 'handoffs');
        if (existsSync(handoffsDir)) {
          const files = readdirSync(handoffsDir);
          files.forEach(file => {
            totalSize += statSync(join(handoffsDir, file)).size;
          });
        }
      } catch (e) {
        // Ignore size calculation errors
      }

      return {
        total_size_mb: Math.round(totalSize / (1024 * 1024) * 100) / 100,
        record_counts: recordCounts,
        pending_sync_operations: pendingResult.count
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return {
        total_size_mb: 0,
        record_counts: {},
        pending_sync_operations: 0
      };
    }
  }

  // Get configuration
  getConfig(): FallbackConfig {
    return { ...this.config };
  }

  // Check if fallback is enabled
  isEnabled(): boolean {
    return this.config.enabled;
  }

  // Close database connection
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
    }
  }
}

// Create singleton instance
export const fallbackStorage = new FallbackStorageService();

export default FallbackStorageService;