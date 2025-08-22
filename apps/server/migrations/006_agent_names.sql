-- Migration 006: Agent Naming System
-- Add tables for agent and session name persistence with LLM-generated memorable names

-- Agent names cache table for LLM-generated names
CREATE TABLE IF NOT EXISTS agent_names (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cache_key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    agent_type TEXT NOT NULL,
    context TEXT,
    generation_method TEXT NOT NULL DEFAULT 'llm', -- 'llm', 'fallback', 'manual'
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    expires_at INTEGER, -- TTL for cache invalidation
    usage_count INTEGER DEFAULT 0,
    last_used_at INTEGER,
    metadata TEXT -- JSON metadata for extensibility
);

-- Session names table for memorable session identification
CREATE TABLE IF NOT EXISTS session_names (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    session_type TEXT NOT NULL DEFAULT 'main',
    agent_count INTEGER DEFAULT 1,
    context TEXT,
    generation_method TEXT NOT NULL DEFAULT 'llm',
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    metadata TEXT
);

-- Agent execution instances with names for tracking
CREATE TABLE IF NOT EXISTS agent_executions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT NOT NULL, -- Unique execution ID
    session_id TEXT NOT NULL,
    display_name TEXT NOT NULL, -- Generated memorable name
    agent_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, active, complete, failed
    task_description TEXT,
    context TEXT,
    start_time INTEGER NOT NULL,
    end_time INTEGER,
    duration_ms INTEGER,
    token_usage INTEGER DEFAULT 0,
    estimated_cost REAL DEFAULT 0.0,
    tools_used TEXT, -- JSON array of tools
    success_indicators TEXT, -- JSON array of success markers
    performance_metrics TEXT, -- JSON performance data
    error_info TEXT, -- JSON error information if failed
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    
    -- Foreign key relationships
    FOREIGN KEY (session_id) REFERENCES session_names(session_id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_names_cache_key ON agent_names(cache_key);
CREATE INDEX IF NOT EXISTS idx_agent_names_type ON agent_names(agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_names_expires_at ON agent_names(expires_at);
CREATE INDEX IF NOT EXISTS idx_agent_names_usage_count ON agent_names(usage_count);

CREATE INDEX IF NOT EXISTS idx_session_names_session_id ON session_names(session_id);
CREATE INDEX IF NOT EXISTS idx_session_names_type ON session_names(session_type);
CREATE INDEX IF NOT EXISTS idx_session_names_created_at ON session_names(created_at);

CREATE INDEX IF NOT EXISTS idx_agent_executions_agent_id ON agent_executions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_session_id ON agent_executions(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_type ON agent_executions(agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_executions_status ON agent_executions(status);
CREATE INDEX IF NOT EXISTS idx_agent_executions_start_time ON agent_executions(start_time);
CREATE INDEX IF NOT EXISTS idx_agent_executions_duration ON agent_executions(duration_ms);

-- Trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS trigger_agent_names_updated_at
    AFTER UPDATE ON agent_names
BEGIN
    UPDATE agent_names SET updated_at = strftime('%s', 'now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trigger_session_names_updated_at
    AFTER UPDATE ON session_names
BEGIN
    UPDATE session_names SET updated_at = strftime('%s', 'now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trigger_agent_executions_updated_at
    AFTER UPDATE ON agent_executions
BEGIN
    UPDATE agent_executions SET updated_at = strftime('%s', 'now') WHERE id = NEW.id;
END;

-- Trigger to clean expired cache entries
CREATE TRIGGER IF NOT EXISTS trigger_cleanup_expired_names
    AFTER INSERT ON agent_names
BEGIN
    DELETE FROM agent_names 
    WHERE expires_at IS NOT NULL 
    AND expires_at < strftime('%s', 'now');
END;

-- Insert some sample data for testing
INSERT OR IGNORE INTO agent_names (cache_key, name, agent_type, context, generation_method) VALUES
('sample001', 'CodeGuardian-Alpha', 'reviewer', 'code review agent', 'llm'),
('sample002', 'DataDetective-Pro', 'analyzer', 'data analysis agent', 'llm'),
('sample003', 'BugHealer-Max', 'debugger', 'debugging specialist', 'llm'),
('sample004', 'TestValidator-Prime', 'tester', 'testing automation', 'llm'),
('sample005', 'UIArtist-Nova', 'ui-developer', 'frontend development', 'llm');