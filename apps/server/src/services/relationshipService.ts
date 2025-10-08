import { Database } from 'bun:sqlite';
import type { 
  SessionRelationship, 
  Session, 
  HookEvent 
} from '../types';

let db: Database;

export function setDatabase(database: Database) {
  db = database;
}

// Core relationship database operations
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

export function updateRelationshipCompletion(parentId: string, childId: string, completedAt?: number): boolean {
  const stmt = db.prepare(`
    UPDATE session_relationships 
    SET completed_at = ? 
    WHERE parent_session_id = ? AND child_session_id = ?
  `);
  
  const result = stmt.run(completedAt || Date.now(), parentId, childId);
  return result.changes > 0;
}

export interface RelationshipOptions {
  includeParent?: boolean;
  includeChildren?: boolean;
  includeSiblings?: boolean;
  maxDepth?: number;
}

export function getSessionRelationships(sessionId: string, options: RelationshipOptions = {}) {
  const {
    includeParent = true,
    includeChildren = true,
    includeSiblings = false,
    maxDepth = 5
  } = options;

  // Get the session itself
  const session = getSession(sessionId);
  if (!session) {
    return null;
  }

  let parent: Session | null = null;
  let children: Session[] = [];
  let siblings: Session[] = [];

  // Get parent if requested
  if (includeParent && session.parent_session_id) {
    parent = getSession(session.parent_session_id);
  }

  // Get children if requested
  if (includeChildren) {
    children = getSessionChildren(sessionId);
  }

  // Get siblings if requested
  if (includeSiblings && session.parent_session_id) {
    siblings = getSessionSiblings(sessionId);
  }

  const depth = calculateDepth(sessionId);
  const path = generateSessionPath(sessionId);

  return {
    session,
    parent,
    children,
    siblings,
    depth,
    path
  };
}

// Tree building functions
export interface SessionTreeNode {
  session_id: string;
  session_type: string;
  relationship_type?: string;
  spawn_reason?: string;
  start_time: number;
  end_time?: number;
  duration_ms?: number;
  status: string;
  agent_count: number;
  children: SessionTreeNode[];
  depth: number;
  path: string;
}

export function buildSessionTree(rootSessionId: string, maxDepth: number = 5): SessionTreeNode | null {
  const session = getSession(rootSessionId);
  if (!session) return null;

  // Check for cycles to prevent infinite recursion
  if (detectCycles(rootSessionId)) {
    console.warn(`Cycle detected starting from session ${rootSessionId}`);
    return null;
  }

  const children: SessionTreeNode[] = [];
  
  if (maxDepth > 0) {
    const childRelationships = getDirectChildren(rootSessionId);
    
    for (const relationship of childRelationships) {
      const childTree = buildSessionTree(relationship.child_session_id, maxDepth - 1);
      if (childTree) {
        // Add relationship context to the child node
        childTree.relationship_type = relationship.relationship_type;
        childTree.spawn_reason = relationship.spawn_reason || undefined;
        children.push(childTree);
      }
    }
  }

  // Extract agent name from session metadata
  let agentName = 'Investigation Session';
  if (session.session_metadata) {
    try {
      const metadata = JSON.parse(session.session_metadata);
      agentName = metadata.agent_name || agentName;
    } catch (e) {
      // Ignore parsing errors
    }
  }

  return {
    session_id: session.session_id,
    session_type: session.session_type,
    agent_name: agentName,
    start_time: session.start_time,
    end_time: session.end_time,
    duration_ms: session.duration_ms,
    status: session.status,
    agent_count: session.agent_count,
    total_tokens: session.total_tokens,
    children,
    depth: calculateDepth(rootSessionId),
    path: generateSessionPath(rootSessionId)
  };
}

export function getSessionLineage(sessionId: string): string[] {
  const lineage: string[] = [];
  let currentId: string | null = sessionId;
  
  // Prevent infinite loops
  const visited = new Set<string>();
  
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    lineage.unshift(currentId);
    
    const session = getSession(currentId);
    currentId = session?.parent_session_id || null;
  }
  
  return lineage;
}

export function calculateDepth(sessionId: string): number {
  return getSessionLineage(sessionId).length - 1;
}

export function detectCycles(sessionId: string, visited: Set<string> = new Set()): boolean {
  if (visited.has(sessionId)) {
    return true;
  }
  
  visited.add(sessionId);
  
  const children = getDirectChildren(sessionId);
  for (const child of children) {
    if (detectCycles(child.child_session_id, new Set(visited))) {
      return true;
    }
  }
  
  return false;
}

function generateSessionPath(sessionId: string): string {
  return getSessionLineage(sessionId).join('.');
}

// Analytics functions
export function getSessionChildren(parentId: string): Session[] {
  const stmt = db.prepare(`
    SELECT s.* FROM sessions s
    INNER JOIN session_relationships sr ON s.session_id = sr.child_session_id
    WHERE sr.parent_session_id = ?
    ORDER BY sr.created_at
  `);
  
  const rows = stmt.all(parentId) as any[];
  return rows.map(mapRowToSession);
}

export function getSessionSiblings(sessionId: string): Session[] {
  const stmt = db.prepare(`
    SELECT s.* FROM sessions s
    INNER JOIN session_relationships sr1 ON s.session_id = sr1.child_session_id
    INNER JOIN session_relationships sr2 ON sr1.parent_session_id = sr2.parent_session_id
    WHERE sr2.child_session_id = ? AND s.session_id != ?
    ORDER BY sr1.created_at
  `);
  
  const rows = stmt.all(sessionId, sessionId) as any[];
  return rows.map(mapRowToSession);
}

function getDirectChildren(parentId: string): SessionRelationship[] {
  const stmt = db.prepare(`
    SELECT * FROM session_relationships 
    WHERE parent_session_id = ? 
    ORDER BY created_at
  `);
  
  const rows = stmt.all(parentId) as any[];
  return rows.map(mapRowToRelationship);
}

export interface RelationshipStats {
  totalRelationships: number;
  relationshipTypes: { [key: string]: number };
  spawnReasons: { [key: string]: number };
  delegationTypes: { [key: string]: number };
  averageDepth: number;
  maxDepth: number;
  completionRate: number;
}

export function getRelationshipStats(timeRange?: { start: number; end: number }): RelationshipStats {
  let baseWhere = '';
  const params: any[] = [];

  if (timeRange) {
    baseWhere = 'WHERE created_at BETWEEN ? AND ?';
    params.push(timeRange.start, timeRange.end);
  }

  // Get total relationships
  const totalStmt = db.prepare(`SELECT COUNT(*) as count FROM session_relationships ${baseWhere}`);
  const totalResult = totalStmt.get(...params) as any;
  const totalRelationships = totalResult.count;

  // Get relationship type distribution
  const typeStmt = db.prepare(`
    SELECT relationship_type, COUNT(*) as count
    FROM session_relationships ${baseWhere}
    GROUP BY relationship_type
  `);
  const typeRows = typeStmt.all(...params) as any[];
  const relationshipTypes: { [key: string]: number } = {};
  typeRows.forEach(row => {
    relationshipTypes[row.relationship_type] = row.count;
  });

  // Get spawn reason distribution
  const reasonWhere = baseWhere
    ? `${baseWhere} AND spawn_reason IS NOT NULL`
    : 'WHERE spawn_reason IS NOT NULL';

  const reasonStmt = db.prepare(`
    SELECT spawn_reason, COUNT(*) as count
    FROM session_relationships ${reasonWhere}
    GROUP BY spawn_reason
  `);
  const reasonRows = reasonStmt.all(...params) as any[];
  const spawnReasons: { [key: string]: number } = {};
  reasonRows.forEach(row => {
    spawnReasons[row.spawn_reason] = row.count;
  });

  // Get delegation type distribution
  const delegationWhere = baseWhere
    ? `${baseWhere} AND delegation_type IS NOT NULL`
    : 'WHERE delegation_type IS NOT NULL';

  const delegationStmt = db.prepare(`
    SELECT delegation_type, COUNT(*) as count
    FROM session_relationships ${delegationWhere}
    GROUP BY delegation_type
  `);
  const delegationRows = delegationStmt.all(...params) as any[];
  const delegationTypes: { [key: string]: number } = {};
  delegationRows.forEach(row => {
    delegationTypes[row.delegation_type] = row.count;
  });

  // Get depth statistics
  const depthStmt = db.prepare(`
    SELECT AVG(depth_level) as avgDepth, MAX(depth_level) as maxDepth
    FROM session_relationships ${baseWhere}
  `);
  const depthResult = depthStmt.get(...params) as any;

  // Get completion rate
  const completionStmt = db.prepare(`
    SELECT
      COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as completed,
      COUNT(*) as total
    FROM session_relationships ${baseWhere}
  `);
  const completionResult = completionStmt.get(...params) as any;
  const completionRate = completionResult.total > 0
    ? (completionResult.completed / completionResult.total)
    : 0;

  return {
    totalRelationships,
    relationshipTypes,
    spawnReasons,
    delegationTypes,
    averageDepth: depthResult.avgDepth || 0,
    maxDepth: depthResult.maxDepth || 0,
    completionRate
  };
}

// Helper functions
function getSession(sessionId: string): Session | null {
  const stmt = db.prepare('SELECT * FROM sessions WHERE session_id = ?');
  const row = stmt.get(sessionId) as any;
  
  if (!row) return null;
  return mapRowToSession(row);
}

function mapRowToSession(row: any): Session {
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

function mapRowToRelationship(row: any): SessionRelationship {
  return {
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
  };
}