-- Migration 003: Session Relationships Tracking
-- Purpose: Add parent/child session tracking to monitor when Claude sessions spawn subagents
-- Date: 2025-01-08

-- Create session_relationships table
CREATE TABLE IF NOT EXISTS session_relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_session_id TEXT NOT NULL,
    child_session_id TEXT NOT NULL,
    relationship_type TEXT DEFAULT 'parent/child' CHECK (relationship_type IN ('parent/child', 'sibling', 'continuation', 'wave_member')),
    spawn_reason TEXT CHECK (spawn_reason IN ('subagent_delegation', 'wave_orchestration', 'task_tool', 'continuation', 'manual')),
    delegation_type TEXT CHECK (delegation_type IN ('parallel', 'sequential', 'isolated')),
    spawn_metadata TEXT, -- JSON blob for additional context
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000), -- Unix timestamp in milliseconds
    completed_at INTEGER, -- When the child session completed
    depth_level INTEGER DEFAULT 1 CHECK (depth_level >= 0),
    session_path TEXT, -- Dot-separated path like "root.child1.grandchild"
    
    -- Constraints
    UNIQUE(parent_session_id, child_session_id), -- Prevent duplicate relationships
    CHECK(parent_session_id != child_session_id) -- Prevent self-referencing
);

-- Create performance indexes for session_relationships
CREATE INDEX IF NOT EXISTS idx_session_rel_parent ON session_relationships(parent_session_id);
CREATE INDEX IF NOT EXISTS idx_session_rel_child ON session_relationships(child_session_id);
CREATE INDEX IF NOT EXISTS idx_session_rel_type ON session_relationships(relationship_type);
CREATE INDEX IF NOT EXISTS idx_session_rel_created ON session_relationships(created_at);
CREATE INDEX IF NOT EXISTS idx_session_rel_depth ON session_relationships(depth_level);
CREATE INDEX IF NOT EXISTS idx_session_rel_spawn_reason ON session_relationships(spawn_reason);

-- Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_session_rel_parent_type ON session_relationships(parent_session_id, relationship_type);
CREATE INDEX IF NOT EXISTS idx_session_rel_child_created ON session_relationships(child_session_id, created_at);

-- Rollback script (run this to undo the migration):
-- DROP INDEX IF EXISTS idx_session_rel_child_created;
-- DROP INDEX IF EXISTS idx_session_rel_parent_type;
-- DROP INDEX IF EXISTS idx_session_rel_spawn_reason;
-- DROP INDEX IF EXISTS idx_session_rel_depth;
-- DROP INDEX IF EXISTS idx_session_rel_created;
-- DROP INDEX IF EXISTS idx_session_rel_type;
-- DROP INDEX IF EXISTS idx_session_rel_child;
-- DROP INDEX IF EXISTS idx_session_rel_parent;
-- DROP TABLE IF EXISTS session_relationships;