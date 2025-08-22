-- Migration 005: Sessions Table
-- Purpose: Create dedicated sessions table for comprehensive session tracking
-- Date: 2025-01-08

-- Create sessions table for tracking complete session lifecycle
CREATE TABLE IF NOT EXISTS sessions (
    session_id TEXT PRIMARY KEY,
    source_app TEXT NOT NULL,
    session_type TEXT DEFAULT 'main' CHECK (session_type IN ('main', 'subagent', 'wave', 'continuation', 'isolated')),
    parent_session_id TEXT,
    start_time INTEGER NOT NULL, -- Unix timestamp in milliseconds
    end_time INTEGER, -- When session ended (null if still active)
    duration_ms INTEGER, -- Calculated duration when session ends
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'timeout', 'cancelled')),
    agent_count INTEGER DEFAULT 0, -- Number of subagents spawned
    total_tokens INTEGER DEFAULT 0, -- Total tokens used (if available)
    session_metadata TEXT, -- JSON blob for additional session data
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    
    -- Foreign key constraint (optional, can be enforced at application level)
    FOREIGN KEY (parent_session_id) REFERENCES sessions (session_id) ON DELETE SET NULL
);

-- Create indexes for sessions table
CREATE INDEX IF NOT EXISTS idx_sessions_source_app ON sessions(source_app);
CREATE INDEX IF NOT EXISTS idx_sessions_type ON sessions(session_type);
CREATE INDEX IF NOT EXISTS idx_sessions_parent ON sessions(parent_session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_sessions_end_time ON sessions(end_time);
CREATE INDEX IF NOT EXISTS idx_sessions_created ON sessions(created_at);

-- Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_sessions_app_type ON sessions(source_app, session_type);
CREATE INDEX IF NOT EXISTS idx_sessions_parent_start ON sessions(parent_session_id, start_time);
CREATE INDEX IF NOT EXISTS idx_sessions_status_start ON sessions(status, start_time);
CREATE INDEX IF NOT EXISTS idx_sessions_type_start ON sessions(session_type, start_time);

-- Create trigger to automatically update updated_at timestamp
CREATE TRIGGER sessions_updated_at 
    AFTER UPDATE ON sessions
    BEGIN
        UPDATE sessions SET updated_at = (strftime('%s', 'now') * 1000) WHERE session_id = NEW.session_id;
    END;

-- Create trigger to calculate duration when session ends
CREATE TRIGGER sessions_calculate_duration
    AFTER UPDATE OF end_time ON sessions
    WHEN NEW.end_time IS NOT NULL AND OLD.end_time IS NULL
    BEGIN
        UPDATE sessions SET duration_ms = NEW.end_time - NEW.start_time WHERE session_id = NEW.session_id;
    END;

-- Rollback script (run this to undo the migration):
-- DROP TRIGGER IF EXISTS sessions_calculate_duration;
-- DROP TRIGGER IF EXISTS sessions_updated_at;
-- DROP INDEX IF EXISTS idx_sessions_type_start;
-- DROP INDEX IF EXISTS idx_sessions_status_start;
-- DROP INDEX IF EXISTS idx_sessions_parent_start;
-- DROP INDEX IF EXISTS idx_sessions_app_type;
-- DROP INDEX IF EXISTS idx_sessions_created;
-- DROP INDEX IF EXISTS idx_sessions_end_time;
-- DROP INDEX IF EXISTS idx_sessions_start_time;
-- DROP INDEX IF EXISTS idx_sessions_status;
-- DROP INDEX IF EXISTS idx_sessions_parent;
-- DROP INDEX IF EXISTS idx_sessions_type;
-- DROP INDEX IF EXISTS idx_sessions_source_app;
-- DROP TABLE IF EXISTS sessions;