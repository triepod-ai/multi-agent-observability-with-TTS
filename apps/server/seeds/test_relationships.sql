-- Test Data for Session Relationships
-- Purpose: Sample data showing various session relationship patterns
-- Date: 2025-01-08

-- Insert test sessions first (parent sessions must exist before relationships)  
INSERT INTO sessions (session_id, source_app, session_type, start_time, status, agent_count, total_tokens, session_metadata, created_at, updated_at) VALUES
-- Main session that spawns subagents
('main-session-001', 'claude-code', 'main', 1704672000000, 'completed', 3, 15000, '{"project": "multi-agent-observability", "user": "developer", "complexity": "high"}', 1704672000000, 1704672000000),

-- Child subagents spawned by main session
('subagent-001', 'claude-code', 'subagent', 1704672030000, 'completed', 0, 3500, '{"task": "code-review", "agent_type": "qa", "specialization": "security"}', 1704672030000, 1704672030000),
('subagent-002', 'claude-code', 'subagent', 1704672035000, 'completed', 0, 4200, '{"task": "performance-analysis", "agent_type": "performance", "specialization": "bottlenecks"}', 1704672035000, 1704672035000),
('subagent-003', 'claude-code', 'subagent', 1704672040000, 'completed', 1, 5800, '{"task": "architecture-review", "agent_type": "architect", "specialization": "patterns"}', 1704672040000, 1704672040000),

-- Nested hierarchy: subagent-003 spawns its own child
('subagent-003-child', 'claude-code', 'subagent', 1704672055000, 'completed', 0, 2100, '{"task": "pattern-analysis", "agent_type": "analyzer", "parent": "subagent-003"}', 1704672055000, 1704672055000),

-- Wave orchestration example
('wave-main-001', 'claude-code', 'main', 1704675600000, 'active', 4, 8900, '{"wave_id": "wave-001", "strategy": "systematic", "phase": "implementation"}', 1704675600000, 1704675600000),
('wave-review-001', 'claude-code', 'wave', 1704675630000, 'completed', 0, 2200, '{"wave_id": "wave-001", "phase": "review", "focus": "security"}', 1704675630000, 1704675630000),
('wave-plan-001', 'claude-code', 'wave', 1704675635000, 'completed', 0, 1800, '{"wave_id": "wave-001", "phase": "planning", "focus": "architecture"}', 1704675635000, 1704675635000),
('wave-implement-001', 'claude-code', 'wave', 1704675640000, 'active', 0, 3400, '{"wave_id": "wave-001", "phase": "implementation", "focus": "features"}', 1704675640000, 1704675640000),
('wave-validate-001', 'claude-code', 'wave', 1704675645000, 'active', 0, 1500, '{"wave_id": "wave-001", "phase": "validation", "focus": "testing"}', 1704675645000, 1704675645000),

-- Session continuation example
('continuation-001', 'claude-code', 'continuation', 1704679200000, 'active', 2, 6700, '{"previous_session": "main-session-001", "context": "resumed_after_timeout"}', 1704679200000, 1704679200000),

-- Sibling sessions (multiple main sessions working on same project)
('sibling-main-001', 'claude-code', 'main', 1704682800000, 'completed', 1, 4500, '{"project": "multi-agent-observability", "branch": "feature-ui"}', 1704682800000, 1704682800000),
('sibling-main-002', 'claude-code', 'main', 1704682900000, 'completed', 1, 3800, '{"project": "multi-agent-observability", "branch": "feature-backend"}', 1704682900000, 1704682900000);

-- Insert session relationships
INSERT INTO session_relationships (parent_session_id, child_session_id, relationship_type, spawn_reason, delegation_type, depth_level, session_path, spawn_metadata, created_at) VALUES

-- Main session with 3 child subagents (parallel delegation)
('main-session-001', 'subagent-001', 'parent/child', 'subagent_delegation', 'parallel', 1, 'main-session-001.subagent-001', 
 '{"delegation_strategy": "parallel_quality", "focus_area": "security", "estimated_duration": 300}', 1704672030000),

('main-session-001', 'subagent-002', 'parent/child', 'subagent_delegation', 'parallel', 1, 'main-session-001.subagent-002',
 '{"delegation_strategy": "parallel_performance", "focus_area": "bottlenecks", "estimated_duration": 450}', 1704672035000),

('main-session-001', 'subagent-003', 'parent/child', 'subagent_delegation', 'sequential', 1, 'main-session-001.subagent-003',
 '{"delegation_strategy": "sequential_architecture", "focus_area": "patterns", "depends_on": ["subagent-001", "subagent-002"]}', 1704672040000),

-- Nested hierarchy: subagent-003 spawns its own child (depth level 2)
('subagent-003', 'subagent-003-child', 'parent/child', 'task_tool', 'isolated', 2, 'main-session-001.subagent-003.subagent-003-child',
 '{"nested_analysis": true, "specialization": "pattern_extraction", "isolation_reason": "deep_focus"}'),

-- Wave orchestration relationships (all are wave members)
('wave-main-001', 'wave-review-001', 'wave_member', 'wave_orchestration', 'sequential', 1, 'wave-main-001.wave-review-001',
 '{"wave_id": "wave-001", "phase_order": 1, "strategy": "systematic_review"}'),

('wave-main-001', 'wave-plan-001', 'wave_member', 'wave_orchestration', 'sequential', 1, 'wave-main-001.wave-plan-001',
 '{"wave_id": "wave-001", "phase_order": 2, "depends_on": ["wave-review-001"]}'),

('wave-main-001', 'wave-implement-001', 'wave_member', 'wave_orchestration', 'sequential', 1, 'wave-main-001.wave-implement-001',
 '{"wave_id": "wave-001", "phase_order": 3, "depends_on": ["wave-plan-001"]}'),

('wave-main-001', 'wave-validate-001', 'wave_member', 'wave_orchestration', 'parallel', 1, 'wave-main-001.wave-validate-001',
 '{"wave_id": "wave-001", "phase_order": 4, "parallel_with": ["wave-implement-001"]}'),

-- Session continuation relationship
('main-session-001', 'continuation-001', 'continuation', 'continuation', 'isolated', 1, 'main-session-001.continuation-001',
 '{"continuation_reason": "timeout_recovery", "context_preserved": true, "previous_state": "interrupted"}'),

-- Sibling relationships (same project, different branches)
('sibling-main-001', 'sibling-main-002', 'sibling', 'manual', 'parallel', 0, 'project-root.sibling-main-001,sibling-main-002',
 '{"sibling_type": "parallel_development", "shared_project": "multi-agent-observability", "coordination": "git_merge"}');

-- Sample events data that references the relationship structure
INSERT OR IGNORE INTO events (source_app, session_id, parent_session_id, session_depth, wave_id, hook_event_type, payload, delegation_context, timestamp) VALUES

-- Main session events
('claude-code', 'main-session-001', NULL, 0, NULL, 'session_start', '{"project": "multi-agent-observability", "mode": "analysis"}', NULL, 1704672000000),
('claude-code', 'main-session-001', NULL, 0, NULL, 'subagent_spawn', '{"target_session": "subagent-001", "reason": "quality_review"}', '{"delegation_type": "parallel", "focus": "security"}', 1704672030000),
('claude-code', 'main-session-001', NULL, 0, NULL, 'subagent_spawn', '{"target_session": "subagent-002", "reason": "performance_analysis"}', '{"delegation_type": "parallel", "focus": "performance"}', 1704672035000),

-- Subagent events with parent context
('claude-code', 'subagent-001', 'main-session-001', 1, NULL, 'subagent_start', '{"task": "security_review", "parent": "main-session-001"}', '{"inherited_context": true, "focus_area": "vulnerabilities"}', 1704672031000),
('claude-code', 'subagent-001', 'main-session-001', 1, NULL, 'analysis_complete', '{"findings": 5, "issues": 2, "recommendations": 3}', NULL, 1704672080000),
('claude-code', 'subagent-001', 'main-session-001', 1, NULL, 'subagent_stop', '{"duration": 49000, "status": "completed", "results_count": 5}', NULL, 1704672081000),

-- Nested subagent events (depth 2)
('claude-code', 'subagent-003-child', 'subagent-003', 2, NULL, 'subagent_start', '{"task": "pattern_analysis", "grandparent": "main-session-001"}', '{"nested_level": 2, "specialization": "deep_patterns"}', 1704672056000),

-- Wave orchestration events
('claude-code', 'wave-main-001', NULL, 0, 'wave-001', 'wave_start', '{"strategy": "systematic", "phases": 4}', NULL, 1704675600000),
('claude-code', 'wave-review-001', 'wave-main-001', 1, 'wave-001', 'wave_phase_start', '{"phase": "review", "order": 1}', '{"wave_strategy": "systematic"}', 1704675630000),
('claude-code', 'wave-plan-001', 'wave-main-001', 1, 'wave-001', 'wave_phase_start', '{"phase": "planning", "order": 2}', '{"depends_on": ["wave-review-001"]}', 1704675635000);