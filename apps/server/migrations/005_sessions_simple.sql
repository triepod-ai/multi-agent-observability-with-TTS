-- Migration 005: Sessions Table (Simple Version)
-- Purpose: Create dedicated sessions table for comprehensive session tracking
-- Date: 2025-01-08

-- Create sessions table for tracking complete session lifecycle
CREATE TABLE IF NOT EXISTS sessions (
    session_id TEXT PRIMARY KEY,
    source_app TEXT NOT NULL,
    session_type TEXT DEFAULT 'main' CHECK (session_type IN ('main', 'subagent', 'wave', 'continuation', 'isolated')),
    parent_session_id TEXT,
    start_time INTEGER NOT NULL,
    end_time INTEGER,
    duration_ms INTEGER,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'timeout', 'cancelled')),
    agent_count INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    session_metadata TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
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
CREATE INDEX IF NOT EXISTS idx_sessions_app_type ON sessions(source_app, session_type);
CREATE INDEX IF NOT EXISTS idx_sessions_parent_start ON sessions(parent_session_id, start_time);
CREATE INDEX IF NOT EXISTS idx_sessions_status_start ON sessions(status, start_time);
CREATE INDEX IF NOT EXISTS idx_sessions_type_start ON sessions(session_type, start_time);

-- Rollback script (run this to undo the migration):
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