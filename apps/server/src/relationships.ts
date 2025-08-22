import { Database } from 'bun:sqlite';
import type { SessionRelationship, Session, SessionHierarchy, HookEvent } from './types';

let db: Database;

export function setDatabase(database: Database) {
  db = database;
}

// Session Relationship Functions

export function insertSessionRelationship(relationship: Omit<SessionRelationship, 'id'>): SessionRelationship {
  const stmt = db.prepare(`
    INSERT INTO session_relationships (
      parent_session_id, child_session_id, relationship_type, spawn_reason,
      delegation_type, spawn_metadata, created_at, completed_at, depth_level, session_path
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    relationship.parent_session_id,
    relationship.child_session_id,
    relationship.relationship_type,
    relationship.spawn_reason || null,
    relationship.delegation_type || null,
    relationship.spawn_metadata ? JSON.stringify(relationship.spawn_metadata) : null,
    relationship.created_at,
    relationship.completed_at || null,
    relationship.depth_level,
    relationship.session_path || null
  );
  
  return {
    ...relationship,
    id: result.lastInsertRowid as number
  };
}

export function getSessionChildren(parentSessionId: string): SessionRelationship[] {
  const stmt = db.prepare(`
    SELECT * FROM session_relationships 
    WHERE parent_session_id = ? 
    ORDER BY created_at
  `);
  
  const rows = stmt.all(parentSessionId) as any[];
  
  return rows.map(row => ({
    id: row.id,
    parent_session_id: row.parent_session_id,
    child_session_id: row.child_session_id,
    relationship_type: row.relationship_type,
    spawn_reason: row.spawn_reason,
    delegation_type: row.delegation_type,
    spawn_metadata: row.spawn_metadata ? JSON.parse(row.spawn_metadata) : undefined,
    created_at: row.created_at,
    completed_at: row.completed_at,
    depth_level: row.depth_level,
    session_path: row.session_path
  }));
}

export function getSessionHierarchy(rootSessionId: string, maxDepth: number = 5): SessionHierarchy | null {
  // Get the root session
  const session = getSession(rootSessionId);
  if (!session) return null;
  
  // Get direct relationships
  const relationships = getSessionChildren(rootSessionId);
  
  // Get events for this session
  const events = getSessionEvents(rootSessionId);
  
  // Recursively build children hierarchy
  const children: SessionHierarchy[] = [];
  for (const relationship of relationships) {
    if (relationship.depth_level < maxDepth) {
      const childHierarchy = getSessionHierarchy(relationship.child_session_id, maxDepth);
      if (childHierarchy) {
        children.push(childHierarchy);
      }
    }
  }
  
  return {
    session,
    relationships,
    children,
    events
  };
}

export function getWaveMembers(waveId: string): SessionRelationship[] {
  const stmt = db.prepare(`
    SELECT * FROM session_relationships 
    WHERE relationship_type = 'wave_member' 
    AND JSON_EXTRACT(spawn_metadata, '$.wave_id') = ?
    ORDER BY created_at
  `);
  
  const rows = stmt.all(waveId) as any[];
  
  return rows.map(row => ({
    id: row.id,
    parent_session_id: row.parent_session_id,
    child_session_id: row.child_session_id,
    relationship_type: row.relationship_type,
    spawn_reason: row.spawn_reason,
    delegation_type: row.delegation_type,
    spawn_metadata: row.spawn_metadata ? JSON.parse(row.spawn_metadata) : undefined,
    created_at: row.created_at,
    completed_at: row.completed_at,
    depth_level: row.depth_level,
    session_path: row.session_path
  }));
}

// Session Functions

export function insertSession(session: Session): Session {
  const stmt = db.prepare(`
    INSERT INTO sessions (
      session_id, source_app, session_type, parent_session_id, start_time,
      end_time, duration_ms, status, agent_count, total_tokens,
      session_metadata, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    session.session_id,
    session.source_app,
    session.session_type,
    session.parent_session_id || null,
    session.start_time,
    session.end_time || null,
    session.duration_ms || null,
    session.status,
    session.agent_count,
    session.total_tokens,
    session.session_metadata ? JSON.stringify(session.session_metadata) : null,
    session.created_at,
    session.updated_at
  );
  
  return session;
}

export function updateSession(sessionId: string, updates: Partial<Session>): boolean {
  const allowedFields = [
    'end_time', 'duration_ms', 'status', 'agent_count', 
    'total_tokens', 'session_metadata', 'updated_at'
  ];
  
  const setClause = Object.keys(updates)
    .filter(key => allowedFields.includes(key))
    .map(key => `${key} = ?`)
    .join(', ');
  
  if (!setClause) return false;
  
  const values = Object.keys(updates)
    .filter(key => allowedFields.includes(key))
    .map(key => {
      if (key === 'session_metadata') {
        return updates[key as keyof Session] ? JSON.stringify(updates[key as keyof Session]) : null;
      }
      return updates[key as keyof Session];
    });
  
  const stmt = db.prepare(`UPDATE sessions SET ${setClause} WHERE session_id = ?`);
  const result = stmt.run(...values, sessionId);
  
  return result.changes > 0;
}

export function getSession(sessionId: string): Session | null {
  const stmt = db.prepare('SELECT * FROM sessions WHERE session_id = ?');
  const row = stmt.get(sessionId) as any;
  
  if (!row) return null;
  
  return {
    session_id: row.session_id,
    source_app: row.source_app,
    session_type: row.session_type,
    parent_session_id: row.parent_session_id,
    start_time: row.start_time,
    end_time: row.end_time,
    duration_ms: row.duration_ms,
    status: row.status,
    agent_count: row.agent_count,
    total_tokens: row.total_tokens,
    session_metadata: row.session_metadata ? JSON.parse(row.session_metadata) : undefined,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export function getActiveSessions(): Session[] {
  const stmt = db.prepare(`
    SELECT * FROM sessions 
    WHERE status = 'active' 
    ORDER BY start_time DESC
  `);
  
  const rows = stmt.all() as any[];
  
  return rows.map(row => ({
    session_id: row.session_id,
    source_app: row.source_app,
    session_type: row.session_type,
    parent_session_id: row.parent_session_id,
    start_time: row.start_time,
    end_time: row.end_time,
    duration_ms: row.duration_ms,
    status: row.status,
    agent_count: row.agent_count,
    total_tokens: row.total_tokens,
    session_metadata: row.session_metadata ? JSON.parse(row.session_metadata) : undefined,
    created_at: row.created_at,
    updated_at: row.updated_at
  }));
}

// Enhanced Event Functions with Relationship Context

export function insertEventWithRelationship(event: HookEvent): HookEvent {
  const stmt = db.prepare(`
    INSERT INTO events (
      source_app, session_id, parent_session_id, session_depth, wave_id,
      hook_event_type, payload, delegation_context, chat, summary, timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const timestamp = event.timestamp || Date.now();
  const result = stmt.run(
    event.source_app,
    event.session_id,
    event.parent_session_id || null,
    event.session_depth || 0,
    event.wave_id || null,
    event.hook_event_type,
    JSON.stringify(event.payload),
    event.delegation_context ? JSON.stringify(event.delegation_context) : null,
    event.chat ? JSON.stringify(event.chat) : null,
    event.summary || null,
    timestamp
  );
  
  return {
    ...event,
    id: result.lastInsertRowid as number,
    timestamp
  };
}

export function getSessionEvents(sessionId: string): HookEvent[] {
  const stmt = db.prepare(`
    SELECT * FROM events 
    WHERE session_id = ? 
    ORDER BY timestamp
  `);
  
  const rows = stmt.all(sessionId) as any[];
  
  return rows.map(row => ({
    id: row.id,
    source_app: row.source_app,
    session_id: row.session_id,
    parent_session_id: row.parent_session_id,
    session_depth: row.session_depth,
    wave_id: row.wave_id,
    hook_event_type: row.hook_event_type,
    payload: JSON.parse(row.payload),
    delegation_context: row.delegation_context ? JSON.parse(row.delegation_context) : undefined,
    chat: row.chat ? JSON.parse(row.chat) : undefined,
    summary: row.summary || undefined,
    timestamp: row.timestamp
  }));
}

export function getWaveEvents(waveId: string): HookEvent[] {
  const stmt = db.prepare(`
    SELECT * FROM events 
    WHERE wave_id = ? 
    ORDER BY timestamp
  `);
  
  const rows = stmt.all(waveId) as any[];
  
  return rows.map(row => ({
    id: row.id,
    source_app: row.source_app,
    session_id: row.session_id,
    parent_session_id: row.parent_session_id,
    session_depth: row.session_depth,
    wave_id: row.wave_id,
    hook_event_type: row.hook_event_type,
    payload: JSON.parse(row.payload),
    delegation_context: row.delegation_context ? JSON.parse(row.delegation_context) : undefined,
    chat: row.chat ? JSON.parse(row.chat) : undefined,
    summary: row.summary || undefined,
    timestamp: row.timestamp
  }));
}

// Analytics and Reporting Functions

export function getSessionPerformanceMetrics(timeRange?: { start: number, end: number }) {
  let sql = `
    SELECT 
      s.session_type,
      COUNT(*) as session_count,
      AVG(s.duration_ms) as avg_duration,
      AVG(s.agent_count) as avg_agents,
      AVG(s.total_tokens) as avg_tokens,
      COUNT(CASE WHEN s.status = 'completed' THEN 1 END) as completed_count,
      COUNT(CASE WHEN s.status = 'failed' THEN 1 END) as failed_count
    FROM sessions s
  `;
  
  const params: any[] = [];
  
  if (timeRange) {
    sql += ' WHERE s.start_time BETWEEN ? AND ?';
    params.push(timeRange.start, timeRange.end);
  }
  
  sql += ' GROUP BY s.session_type ORDER BY session_count DESC';
  
  const stmt = db.prepare(sql);
  return stmt.all(...params);
}

export function getRelationshipAnalytics(timeRange?: { start: number, end: number }) {
  let sql = `
    SELECT 
      sr.relationship_type,
      sr.spawn_reason,
      sr.delegation_type,
      COUNT(*) as relationship_count,
      AVG(sr.depth_level) as avg_depth,
      COUNT(CASE WHEN sr.completed_at IS NOT NULL THEN 1 END) as completed_count
    FROM session_relationships sr
  `;
  
  const params: any[] = [];
  
  if (timeRange) {
    sql += ' WHERE sr.created_at BETWEEN ? AND ?';
    params.push(timeRange.start, timeRange.end);
  }
  
  sql += ' GROUP BY sr.relationship_type, sr.spawn_reason, sr.delegation_type ORDER BY relationship_count DESC';
  
  const stmt = db.prepare(sql);
  return stmt.all(...params);
}