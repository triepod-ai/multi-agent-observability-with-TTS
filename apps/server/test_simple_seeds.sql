-- Simple test seeds for verifying the schema works

-- Insert test sessions
INSERT INTO sessions (session_id, source_app, session_type, start_time, status, agent_count, total_tokens, created_at, updated_at) VALUES
('main-001', 'claude-code', 'main', 1704672000000, 'completed', 2, 10000, 1704672000000, 1704672000000),
('child-001', 'claude-code', 'subagent', 1704672030000, 'completed', 0, 3000, 1704672030000, 1704672030000),
('child-002', 'claude-code', 'subagent', 1704672040000, 'completed', 0, 4000, 1704672040000, 1704672040000);

-- Insert relationships
INSERT INTO session_relationships (parent_session_id, child_session_id, relationship_type, spawn_reason, depth_level, created_at) VALUES
('main-001', 'child-001', 'parent/child', 'subagent_delegation', 1, 1704672030000),
('main-001', 'child-002', 'parent/child', 'subagent_delegation', 1, 1704672040000);

-- Insert enhanced events
INSERT INTO events (source_app, session_id, parent_session_id, session_depth, hook_event_type, payload, timestamp) VALUES
('claude-code', 'main-001', NULL, 0, 'session_start', '{"project": "test"}', 1704672000000),
('claude-code', 'child-001', 'main-001', 1, 'subagent_start', '{"task": "analysis"}', 1704672030000),
('claude-code', 'child-002', 'main-001', 1, 'subagent_start', '{"task": "review"}', 1704672040000);