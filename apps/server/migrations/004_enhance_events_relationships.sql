-- Migration 004: Enhance Events Table for Relationship Tracking
-- Purpose: Add session relationship fields to existing events table
-- Date: 2025-01-08

-- Add new columns to existing events table (nullable for backward compatibility)
ALTER TABLE events ADD COLUMN parent_session_id TEXT;
ALTER TABLE events ADD COLUMN session_depth INTEGER DEFAULT 0;
ALTER TABLE events ADD COLUMN wave_id TEXT;
ALTER TABLE events ADD COLUMN delegation_context TEXT; -- JSON blob for delegation metadata

-- Create indexes for the new columns to optimize relationship queries
CREATE INDEX IF NOT EXISTS idx_events_parent_session ON events(parent_session_id);
CREATE INDEX IF NOT EXISTS idx_events_wave ON events(wave_id);
CREATE INDEX IF NOT EXISTS idx_events_session_depth ON events(session_depth);

-- Create composite indexes for common relationship query patterns
CREATE INDEX IF NOT EXISTS idx_events_parent_timestamp ON events(parent_session_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_events_wave_timestamp ON events(wave_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_events_depth_type ON events(session_depth, hook_event_type);

-- Rollback script (run this to undo the migration):
-- Note: SQLite doesn't support DROP COLUMN, so we would need to recreate the table
-- For rollback, you would need to:
-- 1. CREATE TABLE events_backup AS SELECT id, source_app, session_id, hook_event_type, payload, chat, summary, timestamp FROM events;
-- 2. DROP TABLE events;
-- 3. ALTER TABLE events_backup RENAME TO events;
-- 4. Recreate original indexes