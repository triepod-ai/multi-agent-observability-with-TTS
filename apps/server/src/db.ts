import { Database } from 'bun:sqlite';
import type { HookEvent, FilterOptions, Theme, ThemeSearchQuery } from './types';
import { setDatabase } from './relationships';
import { setDatabase as setRelationshipServiceDb } from './services/relationshipService';

let db: Database;

// Prepared statements for relationship queries (performance optimization)
let getChildrenStmt: any;
let getTreeStmt: any;
let updateCompletionStmt: any;
let getRelationshipsBySessionStmt: any;

export function initDatabase(): void {
  db = new Database('events.db');
  
  // Enable WAL mode for better concurrent performance
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA synchronous = NORMAL');
  
  // Set database instance for relationships modules
  setDatabase(db);
  setRelationshipServiceDb(db);
  
  // Create events table
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_app TEXT NOT NULL,
      session_id TEXT NOT NULL,
      hook_event_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      chat TEXT,
      summary TEXT,
      timestamp INTEGER NOT NULL
    )
  `);
  
  // Check for missing columns and add them (for migration)
  try {
    const columns = db.prepare("PRAGMA table_info(events)").all() as any[];
    const columnNames = columns.map((col: any) => col.name);
    
    if (!columnNames.includes('chat')) {
      db.exec('ALTER TABLE events ADD COLUMN chat TEXT');
    }
    
    if (!columnNames.includes('summary')) {
      db.exec('ALTER TABLE events ADD COLUMN summary TEXT');
    }
    
    if (!columnNames.includes('parent_session_id')) {
      db.exec('ALTER TABLE events ADD COLUMN parent_session_id TEXT');
    }
    
    if (!columnNames.includes('session_depth')) {
      db.exec('ALTER TABLE events ADD COLUMN session_depth INTEGER DEFAULT 0');
    }
    
    if (!columnNames.includes('wave_id')) {
      db.exec('ALTER TABLE events ADD COLUMN wave_id TEXT');
    }
    
    if (!columnNames.includes('delegation_context')) {
      db.exec('ALTER TABLE events ADD COLUMN delegation_context TEXT');
    }

    if (!columnNames.includes('correlation_id')) {
      db.exec('ALTER TABLE events ADD COLUMN correlation_id TEXT');
    }
  } catch (error) {
    // If the table doesn't exist yet, the CREATE TABLE above will handle it
  }
  
  // Create indexes for common queries
  db.exec('CREATE INDEX IF NOT EXISTS idx_source_app ON events(source_app)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_session_id ON events(session_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_correlation_id ON events(correlation_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_hook_event_type ON events(hook_event_type)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_timestamp ON events(timestamp)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_parent_session_id ON events(parent_session_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_wave_id ON events(wave_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_session_depth ON events(session_depth)');
  
  // Create themes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS themes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      displayName TEXT NOT NULL,
      description TEXT,
      colors TEXT NOT NULL,
      isPublic INTEGER NOT NULL DEFAULT 0,
      authorId TEXT,
      authorName TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      tags TEXT,
      downloadCount INTEGER DEFAULT 0,
      rating REAL DEFAULT 0,
      ratingCount INTEGER DEFAULT 0
    )
  `);
  
  // Create theme shares table
  db.exec(`
    CREATE TABLE IF NOT EXISTS theme_shares (
      id TEXT PRIMARY KEY,
      themeId TEXT NOT NULL,
      shareToken TEXT NOT NULL UNIQUE,
      expiresAt INTEGER,
      isPublic INTEGER NOT NULL DEFAULT 0,
      allowedUsers TEXT,
      createdAt INTEGER NOT NULL,
      accessCount INTEGER DEFAULT 0,
      FOREIGN KEY (themeId) REFERENCES themes (id) ON DELETE CASCADE
    )
  `);
  
  // Create theme ratings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS theme_ratings (
      id TEXT PRIMARY KEY,
      themeId TEXT NOT NULL,
      userId TEXT NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT,
      createdAt INTEGER NOT NULL,
      UNIQUE(themeId, userId),
      FOREIGN KEY (themeId) REFERENCES themes (id) ON DELETE CASCADE
    )
  `);
  
  // Create indexes for theme tables
  db.exec('CREATE INDEX IF NOT EXISTS idx_themes_name ON themes(name)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_themes_isPublic ON themes(isPublic)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_themes_createdAt ON themes(createdAt)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_theme_shares_token ON theme_shares(shareToken)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_theme_ratings_theme ON theme_ratings(themeId)');
  
  // Run database migrations
  try {
    runSessionMigrations();
    console.log('Session migrations completed successfully');
    
    runAgentNamingMigration();
    console.log('Agent naming migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  }
  
  // Initialize prepared statements for better performance
  initializePreparedStatements();
}

export function insertEvent(event: HookEvent): HookEvent {
  const stmt = db.prepare(`
    INSERT INTO events (
      source_app, session_id, hook_event_type, payload, chat, summary, timestamp,
      parent_session_id, session_depth, wave_id, delegation_context, correlation_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const timestamp = event.timestamp || Date.now();
  const result = stmt.run(
    event.source_app,
    event.session_id,
    event.hook_event_type,
    JSON.stringify(event.payload),
    event.chat ? JSON.stringify(event.chat) : null,
    event.summary || null,
    timestamp,
    event.parent_session_id || null,
    event.session_depth || 0,
    event.wave_id || null,
    event.delegation_context ? JSON.stringify(event.delegation_context) : null,
    event.correlation_id || null
  );

  // Auto-create sessions and relationships based on events
  try {
    processEventForSessionManagement(event, timestamp);
  } catch (error) {
    console.error('Error processing event for session management:', error);
    // Don't fail the event insertion if session management fails
  }
  
  return {
    ...event,
    id: result.lastInsertRowid as number,
    timestamp
  };
}

// Process events to automatically create sessions and relationships
function processEventForSessionManagement(event: HookEvent, timestamp: number): void {
  // Ensure session exists for any event
  ensureSessionExists(event, timestamp);
  
  // Handle SubagentStart events for relationship creation
  if (event.hook_event_type === 'SubagentStart') {
    handleSubagentStart(event, timestamp);
  }
  
  // Handle SubagentStop events for session completion
  if (event.hook_event_type === 'SubagentStop') {
    handleSubagentStop(event, timestamp);
  }
  
  // Handle UserPromptSubmit events that might start main sessions
  if (event.hook_event_type === 'UserPromptSubmit') {
    handleUserPromptSubmit(event, timestamp);
  }
}

function ensureSessionExists(event: HookEvent, timestamp: number): void {
  // Check if session already exists
  const existingSession = db.prepare('SELECT session_id FROM sessions WHERE session_id = ?').get(event.session_id);
  
  if (!existingSession) {
    // Determine session type
    let sessionType = 'main';
    if (event.parent_session_id) {
      sessionType = 'subagent';
    }
    
    // Create the session
    const insertSessionStmt = db.prepare(`
      INSERT OR IGNORE INTO sessions (
        session_id, source_app, session_type, parent_session_id, 
        start_time, status, agent_count, total_tokens, session_metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    insertSessionStmt.run(
      event.session_id,
      event.source_app,
      sessionType,
      event.parent_session_id || null,
      timestamp,
      'active',
      0,
      0,
      null
    );
  }
}

function handleSubagentStart(event: HookEvent, timestamp: number): void {
  // Extract agent info from payload
  const payload = event.payload || {};
  let agentName = payload.agent_name || payload.subagent_type || 'Unknown Agent';
  
  // Map delegation types to valid schema values
  let delegationType = payload.delegation_type || 'sequential';
  if (delegationType === 'specialized') {
    delegationType = 'sequential'; // Map specialized to sequential
  }
  if (!['parallel', 'sequential', 'isolated'].includes(delegationType)) {
    delegationType = 'sequential'; // Default fallback
  }
  
  // Try to get a better agent name from the agent naming service
  try {
    const agentType = classifyAgentType(agentName, payload);
    const cacheKey = generateAgentCacheKey(agentName, agentType, payload);
    
    // Check if we have a cached name
    const cachedName = getAgentName(cacheKey);
    if (cachedName) {
      agentName = cachedName.name;
      
      // Update usage count
      updateAgentNameUsage(cacheKey);
    } else {
      // Generate a new name if we don't have one cached
      const generatedName = generateDisplayAgentName(agentName, agentType, payload);
      if (generatedName && generatedName !== agentName) {
        // Cache the generated name
        insertAgentName({
          cache_key: cacheKey,
          name: generatedName,
          agent_type: agentType,
          context: JSON.stringify(payload),
          generation_method: 'auto',
          expires_at: undefined, // No expiry for now
          usage_count: 1,
          last_used_at: timestamp,
          metadata: JSON.stringify({ session_id: event.session_id, source_app: event.source_app })
        });
        agentName = generatedName;
      }
    }
  } catch (error) {
    console.error('Error enhancing agent name:', error);
    // Fall back to original name
  }
  
  // Update session with agent information
  const updateSessionStmt = db.prepare(`
    UPDATE sessions 
    SET session_metadata = json_set(
      COALESCE(session_metadata, '{}'), 
      '$.agent_name', ?,
      '$.start_event_data', ?
    )
    WHERE session_id = ?
  `);
  
  updateSessionStmt.run(
    agentName, 
    JSON.stringify(payload), 
    event.session_id
  );
  
  // Create relationship if this is a child session
  if (event.parent_session_id) {
    createSessionRelationship(
      event.parent_session_id,
      event.session_id,
      'parent/child',
      'subagent_delegation',
      delegationType,
      {
        agent_name: agentName,
        spawn_event_type: event.hook_event_type,
        spawn_payload: payload
      },
      timestamp
    );
    
    // Increment parent's agent count
    const updateParentStmt = db.prepare(`
      UPDATE sessions 
      SET agent_count = agent_count + 1 
      WHERE session_id = ?
    `);
    updateParentStmt.run(event.parent_session_id);
    
    // Broadcast session spawn event via WebSocket
    broadcastRelationshipEvent({
      type: 'session_spawn',
      session_id: event.session_id,
      parent_session_id: event.parent_session_id,
      relationship_type: 'parent/child',
      spawn_reason: 'subagent_delegation',
      agent_name: agentName,
      timestamp: timestamp,
      data: {
        agent_type: classifyAgentType(agentName, payload),
        delegation_type: delegationType
      }
    });
  }
}

function handleSubagentStop(event: HookEvent, timestamp: number): void {
  // Update session status and end time
  const payload = event.payload || {};
  const completionStatus = payload.error ? 'failed' : 'completed';

  const updateSessionStmt = db.prepare(`
    UPDATE sessions
    SET
      end_time = ?,
      status = ?,
      session_metadata = json_set(
        COALESCE(session_metadata, '{}'),
        '$.completion_data', ?,
        '$.end_event_data', ?
      )
    WHERE session_id = ?
  `);

  updateSessionStmt.run(
    timestamp,
    completionStatus,
    JSON.stringify(payload),
    JSON.stringify(payload),
    event.session_id
  );

  // Extract parent session ID from subagent session ID if not provided
  // Task tool creates subagent session IDs with pattern: {parent_session_id}_{process_id}_{timestamp}
  let parentSessionId = event.parent_session_id;

  if (!parentSessionId && event.session_id) {
    const sessionIdParts = event.session_id.split('_');
    if (sessionIdParts.length >= 3) {
      // First part before first underscore should be the parent session ID (UUID format)
      const potentialParentId = sessionIdParts[0];
      // Validate it looks like a UUID (36 characters with hyphens)
      if (potentialParentId.length === 36 && potentialParentId.includes('-')) {
        parentSessionId = potentialParentId;
        console.log(`Extracted parent session ID from subagent session ID: ${parentSessionId} <- ${event.session_id}`);

        // Create the session relationship retroactively since it wasn't created at start
        try {
          createSessionRelationship(
            parentSessionId,
            event.session_id,
            'parent/child', // Valid relationship type per database constraint
            'task_tool', // Spawn reason: Valid constraint value for Task tool
            'parallel', // Delegation type: Valid constraint value (parallel/sequential/isolated)
            { created_from: 'subagent_stop', extracted_parent: true }, // Metadata
            timestamp // Use stop timestamp as creation time
          );
          console.log(`Created session relationship: ${parentSessionId} -> ${event.session_id}`);
        } catch (error) {
          console.error(`Failed to create session relationship for ${event.session_id}:`, error);
        }
      }
    }
  }

  // Update relationship completion time (now we might have created the relationship above)
  const updateRelationshipStmt = db.prepare(`
    UPDATE session_relationships
    SET completed_at = ?
    WHERE child_session_id = ?
  `);
  updateRelationshipStmt.run(timestamp, event.session_id);

  // Get parent session ID for WebSocket event (query again in case we just created the relationship)
  const relationshipQuery = db.prepare(`
    SELECT parent_session_id
    FROM session_relationships
    WHERE child_session_id = ?
    LIMIT 1
  `).get(event.session_id);

  // Broadcast session completion event via WebSocket
  if (relationshipQuery?.parent_session_id) {
    broadcastRelationshipEvent({
      type: 'child_session_completed',
      session_id: event.session_id,
      parent_session_id: relationshipQuery.parent_session_id,
      timestamp: timestamp,
      data: {
        status: completionStatus,
        duration_ms: payload.duration_ms,
        token_usage: payload.token_usage,
        tool_count: payload.tools_used?.length || 0
      }
    });
  }
}

function handleUserPromptSubmit(event: HookEvent, timestamp: number): void {
  // Update session metadata with user prompt info
  const payload = event.payload || {};
  
  const updateSessionStmt = db.prepare(`
    UPDATE sessions 
    SET session_metadata = json_set(
      COALESCE(session_metadata, '{}'),
      '$.initial_prompt', ?,
      '$.prompt_submitted_at', ?
    )
    WHERE session_id = ?
  `);
  
  updateSessionStmt.run(
    payload.message || '',
    timestamp,
    event.session_id
  );
}

function createSessionRelationship(
  parentSessionId: string,
  childSessionId: string,
  relationshipType: string,
  spawnReason: string,
  delegationType: string,
  metadata: any,
  timestamp: number
): void {
  // Calculate depth level
  const parentDepth = getSessionDepth(parentSessionId);
  const depthLevel = parentDepth + 1;
  
  // Generate session path
  const parentPath = getSessionPath(parentSessionId);
  const sessionPath = parentPath ? `${parentPath}.${childSessionId}` : childSessionId;
  
  const insertRelationshipStmt = db.prepare(`
    INSERT INTO session_relationships (
      parent_session_id, child_session_id, relationship_type, spawn_reason,
      delegation_type, spawn_metadata, created_at, depth_level, session_path
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  try {
    insertRelationshipStmt.run(
      parentSessionId,
      childSessionId,
      relationshipType,
      spawnReason,
      delegationType,
      JSON.stringify(metadata),
      timestamp,
      depthLevel,
      sessionPath
    );
  } catch (error) {
    console.error(`Error creating session relationship ${parentSessionId} -> ${childSessionId}:`, error);
  }
}

function getSessionDepth(sessionId: string): number {
  const depthQuery = db.prepare(`
    SELECT MAX(depth_level) as max_depth 
    FROM session_relationships 
    WHERE child_session_id = ?
  `).get(sessionId);
  
  return depthQuery?.max_depth || 0;
}

function getSessionPath(sessionId: string): string | null {
  const pathQuery = db.prepare(`
    SELECT session_path 
    FROM session_relationships 
    WHERE child_session_id = ? 
    ORDER BY created_at DESC 
    LIMIT 1
  `).get(sessionId);
  
  return pathQuery?.session_path || null;
}

// Helper functions for agent name enhancement
function classifyAgentType(agentName: string, payload: any): string {
  const lowerName = agentName.toLowerCase();
  
  // Specialized agent types based on name patterns
  if (lowerName.includes('screenshot') || lowerName.includes('analyze')) return 'analyzer';
  if (lowerName.includes('debug') || lowerName.includes('troubleshoot')) return 'debugger';
  if (lowerName.includes('review') || lowerName.includes('code')) return 'reviewer';
  if (lowerName.includes('test') || lowerName.includes('qa')) return 'tester';
  if (lowerName.includes('document') || lowerName.includes('write')) return 'writer';
  if (lowerName.includes('performance') || lowerName.includes('optimize')) return 'optimizer';
  if (lowerName.includes('security') || lowerName.includes('scan')) return 'security';
  if (lowerName.includes('lesson') || lowerName.includes('generate')) return 'generator';
  if (lowerName.includes('session') || lowerName.includes('context')) return 'context';
  if (lowerName.includes('git') || lowerName.includes('collect')) return 'collector';
  
  // Classification based on task tool usage patterns
  if (payload.tool_name === 'Task') return 'delegator';
  if (payload.subagent_type) return 'subagent';
  
  return 'generic';
}

function generateAgentCacheKey(agentName: string, agentType: string, payload: any): string {
  // Create a stable cache key based on agent characteristics
  const normalizedName = agentName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const payloadHash = JSON.stringify(payload).length; // Simple hash substitute
  
  return `${agentType}-${normalizedName}-${payloadHash}`;
}

function generateDisplayAgentName(agentName: string, agentType: string, payload: any): string {
  // Enhanced name generation based on agent type and context
  const baseNames = {
    analyzer: ['DataDetective', 'InsightFinder', 'PatternHunter', 'SystemScout'],
    debugger: ['BugHunter', 'ErrorTracker', 'IssueResolver', 'DiagnosticAgent'],
    reviewer: ['CodeGuardian', 'QualityAssurance', 'StandardsKeeper', 'ReviewMaster'],
    tester: ['TestRunner', 'QualityChecker', 'ValidationAgent', 'TestMaster'],
    writer: ['DocCreator', 'ContentCrafter', 'WritingAssistant', 'ScribeAgent'],
    optimizer: ['PerformanceTuner', 'SpeedBooster', 'EfficiencyExpert', 'OptimizationAgent'],
    security: ['SecurityGuard', 'ThreatHunter', 'VulnScanner', 'SecureAgent'],
    generator: ['ContentCreator', 'LessonMaker', 'GenerativeAgent', 'CreationBot'],
    context: ['ContextKeeper', 'SessionTracker', 'StateManager', 'ContextAgent'],
    collector: ['DataGatherer', 'InfoCollector', 'RepositoryAgent', 'CollectionBot'],
    delegator: ['TaskMaster', 'Orchestrator', 'DelegationAgent', 'WorkflowManager'],
    subagent: ['SubWorker', 'AssistantAgent', 'HelperBot', 'SubProcessor'],
    generic: ['WorkerAgent', 'GeneralAssistant', 'TaskAgent', 'ProcessorBot']
  };
  
  const names = baseNames[agentType as keyof typeof baseNames] || baseNames.generic;
  const randomIndex = Math.floor(Math.random() * names.length);
  const variants = ['Alpha', 'Beta', 'Prime', 'Pro', 'Plus', 'Max', 'Core', 'Elite'];
  const variantIndex = Math.floor(Math.random() * variants.length);
  
  return `${names[randomIndex]}-${variants[variantIndex]}`;
}

function updateAgentNameUsage(cacheKey: string): void {
  try {
    const updateStmt = db.prepare(`
      UPDATE agent_names 
      SET usage_count = usage_count + 1, 
          last_used_at = ? 
      WHERE cache_key = ?
    `);
    updateStmt.run(Date.now(), cacheKey);
  } catch (error) {
    console.error('Error updating agent name usage:', error);
  }
}

// WebSocket clients set (will be set by the main server)
let wsClients: Set<any> = new Set();

export function setWebSocketClientsForRelationships(clients: Set<any>): void {
  wsClients = clients;
}

function broadcastRelationshipEvent(event: any): void {
  try {
    const message = JSON.stringify(event);
    wsClients.forEach(client => {
      try {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(message);
        }
      } catch (error) {
        console.error('Error sending WebSocket message to client:', error);
      }
    });
  } catch (error) {
    console.error('Error broadcasting relationship event:', error);
  }
}

export function getFilterOptions(): FilterOptions {
  const sourceApps = db.prepare('SELECT DISTINCT source_app FROM events ORDER BY source_app').all() as { source_app: string }[];
  const sessionIds = db.prepare('SELECT DISTINCT session_id FROM events ORDER BY session_id DESC LIMIT 100').all() as { session_id: string }[];
  const hookEventTypes = db.prepare('SELECT DISTINCT hook_event_type FROM events ORDER BY hook_event_type').all() as { hook_event_type: string }[];
  
  return {
    source_apps: sourceApps.map(row => row.source_app),
    session_ids: sessionIds.map(row => row.session_id),
    hook_event_types: hookEventTypes.map(row => row.hook_event_type)
  };
}

export function getRecentEvents(limit: number = 100): HookEvent[] {
  const stmt = db.prepare(`
    SELECT id, source_app, session_id, hook_event_type, payload, chat, summary, timestamp,
           parent_session_id, session_depth, wave_id, delegation_context, correlation_id
    FROM events
    ORDER BY id DESC
    LIMIT ?
  `);

  const rows = stmt.all(limit) as any[];

  return rows.map(row => ({
    id: row.id,
    source_app: row.source_app,
    session_id: row.session_id,
    hook_event_type: row.hook_event_type,
    payload: JSON.parse(row.payload),
    chat: row.chat ? JSON.parse(row.chat) : undefined,
    summary: row.summary || undefined,
    timestamp: row.timestamp,
    parent_session_id: row.parent_session_id,
    session_depth: row.session_depth,
    wave_id: row.wave_id,
    delegation_context: row.delegation_context ? JSON.parse(row.delegation_context) : undefined,
    correlation_id: row.correlation_id || undefined
  }));
}

// Theme database functions
export function insertTheme(theme: Theme): Theme {
  const stmt = db.prepare(`
    INSERT INTO themes (id, name, displayName, description, colors, isPublic, authorId, authorName, createdAt, updatedAt, tags, downloadCount, rating, ratingCount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    theme.id,
    theme.name,
    theme.displayName,
    theme.description || null,
    JSON.stringify(theme.colors),
    theme.isPublic ? 1 : 0,
    theme.authorId || null,
    theme.authorName || null,
    theme.createdAt,
    theme.updatedAt,
    JSON.stringify(theme.tags),
    theme.downloadCount || 0,
    theme.rating || 0,
    theme.ratingCount || 0
  );
  
  return theme;
}

export function updateTheme(id: string, updates: Partial<Theme>): boolean {
  const allowedFields = ['displayName', 'description', 'colors', 'isPublic', 'updatedAt', 'tags'];
  const setClause = Object.keys(updates)
    .filter(key => allowedFields.includes(key))
    .map(key => `${key} = ?`)
    .join(', ');
  
  if (!setClause) return false;
  
  const values = Object.keys(updates)
    .filter(key => allowedFields.includes(key))
    .map(key => {
      if (key === 'colors' || key === 'tags') {
        return JSON.stringify(updates[key as keyof Theme]);
      }
      if (key === 'isPublic') {
        return updates[key as keyof Theme] ? 1 : 0;
      }
      return updates[key as keyof Theme];
    });
  
  const stmt = db.prepare(`UPDATE themes SET ${setClause} WHERE id = ?`);
  const result = stmt.run(...values, id);
  
  return result.changes > 0;
}

export function getTheme(id: string): Theme | null {
  const stmt = db.prepare('SELECT * FROM themes WHERE id = ?');
  const row = stmt.get(id) as any;
  
  if (!row) return null;
  
  return {
    id: row.id,
    name: row.name,
    displayName: row.displayName,
    description: row.description,
    colors: JSON.parse(row.colors),
    isPublic: Boolean(row.isPublic),
    authorId: row.authorId,
    authorName: row.authorName,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    tags: JSON.parse(row.tags || '[]'),
    downloadCount: row.downloadCount,
    rating: row.rating,
    ratingCount: row.ratingCount
  };
}

export function getThemes(query: ThemeSearchQuery = {}): Theme[] {
  let sql = 'SELECT * FROM themes WHERE 1=1';
  const params: any[] = [];
  
  if (query.isPublic !== undefined) {
    sql += ' AND isPublic = ?';
    params.push(query.isPublic ? 1 : 0);
  }
  
  if (query.authorId) {
    sql += ' AND authorId = ?';
    params.push(query.authorId);
  }
  
  if (query.query) {
    sql += ' AND (name LIKE ? OR displayName LIKE ? OR description LIKE ?)';
    const searchTerm = `%${query.query}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }
  
  // Add sorting
  const sortBy = query.sortBy || 'created';
  const sortOrder = query.sortOrder || 'desc';
  const sortColumn = {
    name: 'name',
    created: 'createdAt',
    updated: 'updatedAt',
    downloads: 'downloadCount',
    rating: 'rating'
  }[sortBy] || 'createdAt';
  
  sql += ` ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}`;
  
  // Add pagination
  if (query.limit) {
    sql += ' LIMIT ?';
    params.push(query.limit);
    
    if (query.offset) {
      sql += ' OFFSET ?';
      params.push(query.offset);
    }
  }
  
  const stmt = db.prepare(sql);
  const rows = stmt.all(...params) as any[];
  
  return rows.map(row => ({
    id: row.id,
    name: row.name,
    displayName: row.displayName,
    description: row.description,
    colors: JSON.parse(row.colors),
    isPublic: Boolean(row.isPublic),
    authorId: row.authorId,
    authorName: row.authorName,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    tags: JSON.parse(row.tags || '[]'),
    downloadCount: row.downloadCount,
    rating: row.rating,
    ratingCount: row.ratingCount
  }));
}

export function deleteTheme(id: string): boolean {
  const stmt = db.prepare('DELETE FROM themes WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

export function incrementThemeDownloadCount(id: string): boolean {
  const stmt = db.prepare('UPDATE themes SET downloadCount = downloadCount + 1 WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

// Initialize prepared statements for relationship queries
function initializePreparedStatements(): void {
  try {
    // Get children relationships for a session
    getChildrenStmt = db.prepare(`
      SELECT sr.*, s.session_type, s.status, s.start_time, s.end_time, s.agent_count
      FROM session_relationships sr
      LEFT JOIN sessions s ON sr.child_session_id = s.session_id
      WHERE sr.parent_session_id = ?
      ORDER BY sr.created_at
    `);
    
    // Recursive CTE for building session trees
    getTreeStmt = db.prepare(`
      WITH RECURSIVE session_tree AS (
        -- Base case: start with the root session
        SELECT 
          s.session_id,
          s.session_type,
          s.start_time,
          s.end_time,
          s.status,
          s.agent_count,
          0 as depth,
          s.session_id as path,
          CAST(NULL AS TEXT) as relationship_type,
          CAST(NULL AS TEXT) as spawn_reason
        FROM sessions s
        WHERE s.session_id = ?
        
        UNION ALL
        
        -- Recursive case: add children
        SELECT 
          s.session_id,
          s.session_type,
          s.start_time,
          s.end_time,
          s.status,
          s.agent_count,
          st.depth + 1,
          st.path || '.' || s.session_id,
          sr.relationship_type,
          sr.spawn_reason
        FROM session_tree st
        JOIN session_relationships sr ON st.session_id = sr.parent_session_id
        JOIN sessions s ON sr.child_session_id = s.session_id
        WHERE st.depth < ?
      )
      SELECT * FROM session_tree ORDER BY depth, session_id
    `);
    
    // Update completion time for a relationship
    updateCompletionStmt = db.prepare(`
      UPDATE session_relationships 
      SET completed_at = ? 
      WHERE parent_session_id = ? AND child_session_id = ?
    `);
    
    // Get all relationships for a session (as parent or child)
    getRelationshipsBySessionStmt = db.prepare(`
      SELECT 
        sr.*,
        'parent' as role,
        s.session_type as related_session_type,
        s.status as related_status
      FROM session_relationships sr
      LEFT JOIN sessions s ON sr.child_session_id = s.session_id
      WHERE sr.parent_session_id = ?
      
      UNION ALL
      
      SELECT 
        sr.*,
        'child' as role,
        s.session_type as related_session_type,
        s.status as related_status
      FROM session_relationships sr
      LEFT JOIN sessions s ON sr.parent_session_id = s.session_id
      WHERE sr.child_session_id = ?
      
      ORDER BY created_at
    `);
  } catch (error) {
    console.error('Error initializing prepared statements:', error);
  }
}

// Export prepared statements for use in relationship service
export function getPreparedStatements() {
  return {
    getChildrenStmt,
    getTreeStmt,
    updateCompletionStmt,
    getRelationshipsBySessionStmt
  };
}

// Session Management System Functions
export function runSessionMigrations(): void {
  try {
    // Create migration tracking table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        filename TEXT NOT NULL
      )
    `);

    // Check what migrations have been applied
    const appliedMigrations = db.prepare('SELECT version FROM schema_migrations ORDER BY version').all().map(row => row.version);
    
    // Session relationships migration (003)
    if (!appliedMigrations.includes('003')) {
      console.log('Running session relationships migration (003)...');
      db.exec(`
        CREATE TABLE IF NOT EXISTS session_relationships (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          parent_session_id TEXT NOT NULL,
          child_session_id TEXT NOT NULL,
          relationship_type TEXT DEFAULT 'parent/child' CHECK (relationship_type IN ('parent/child', 'sibling', 'continuation', 'wave_member')),
          spawn_reason TEXT CHECK (spawn_reason IN ('subagent_delegation', 'wave_orchestration', 'task_tool', 'continuation', 'manual')),
          delegation_type TEXT CHECK (delegation_type IN ('parallel', 'sequential', 'isolated')),
          spawn_metadata TEXT,
          created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
          completed_at INTEGER,
          depth_level INTEGER DEFAULT 1 CHECK (depth_level >= 0),
          session_path TEXT,
          UNIQUE(parent_session_id, child_session_id),
          CHECK(parent_session_id != child_session_id)
        )
      `);
      
      // Create indexes
      db.exec('CREATE INDEX IF NOT EXISTS idx_session_rel_parent ON session_relationships(parent_session_id)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_session_rel_child ON session_relationships(child_session_id)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_session_rel_type ON session_relationships(relationship_type)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_session_rel_created ON session_relationships(created_at)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_session_rel_depth ON session_relationships(depth_level)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_session_rel_spawn_reason ON session_relationships(spawn_reason)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_session_rel_parent_type ON session_relationships(parent_session_id, relationship_type)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_session_rel_child_created ON session_relationships(child_session_id, created_at)');
      
      db.prepare('INSERT INTO schema_migrations (version, filename) VALUES (?, ?)').run('003', '003_session_relationships.sql');
    }

    // Sessions table migration (005)
    if (!appliedMigrations.includes('005')) {
      console.log('Running sessions table migration (005)...');
      db.exec(`
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
        )
      `);
      
      // Create indexes
      db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_source_app ON sessions(source_app)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_type ON sessions(session_type)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_parent ON sessions(parent_session_id)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_end_time ON sessions(end_time)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_created ON sessions(created_at)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_app_type ON sessions(source_app, session_type)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_parent_start ON sessions(parent_session_id, start_time)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_status_start ON sessions(status, start_time)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_type_start ON sessions(session_type, start_time)');
      
      // Create triggers
      db.exec(`
        CREATE TRIGGER IF NOT EXISTS sessions_updated_at 
          AFTER UPDATE ON sessions
          BEGIN
            UPDATE sessions SET updated_at = (strftime('%s', 'now') * 1000) WHERE session_id = NEW.session_id;
          END
      `);
      
      db.exec(`
        CREATE TRIGGER IF NOT EXISTS sessions_calculate_duration
          AFTER UPDATE OF end_time ON sessions
          WHEN NEW.end_time IS NOT NULL AND OLD.end_time IS NULL
          BEGIN
            UPDATE sessions SET duration_ms = NEW.end_time - NEW.start_time WHERE session_id = NEW.session_id;
          END
      `);
      
      db.prepare('INSERT INTO schema_migrations (version, filename) VALUES (?, ?)').run('005', '005_sessions.sql');
    }
  } catch (error) {
    console.error('Session migrations failed:', error);
    throw error;
  }
}

// Agent Naming System Functions
export function runAgentNamingMigration(): void {
  try {
    // Check if agent_names table exists
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='agent_names'
    `).get();
    
    if (!tableExists) {
      console.log('Running agent naming migration...');
      
      // Agent names cache table
      db.exec(`
        CREATE TABLE agent_names (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cache_key TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          agent_type TEXT NOT NULL,
          context TEXT,
          generation_method TEXT NOT NULL DEFAULT 'llm',
          created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
          updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
          expires_at INTEGER,
          usage_count INTEGER DEFAULT 0,
          last_used_at INTEGER,
          metadata TEXT
        )
      `);
      
      // Session names table
      db.exec(`
        CREATE TABLE session_names (
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
        )
      `);
      
      // Agent executions table
      db.exec(`
        CREATE TABLE agent_executions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          agent_id TEXT NOT NULL,
          session_id TEXT NOT NULL,
          display_name TEXT NOT NULL,
          agent_type TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          task_description TEXT,
          context TEXT,
          start_time INTEGER NOT NULL,
          end_time INTEGER,
          duration_ms INTEGER,
          token_usage INTEGER DEFAULT 0,
          estimated_cost REAL DEFAULT 0.0,
          tools_used TEXT,
          success_indicators TEXT,
          performance_metrics TEXT,
          error_info TEXT,
          created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
          updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        )
      `);
      
      // Create indexes
      db.exec('CREATE INDEX idx_agent_names_cache_key ON agent_names(cache_key)');
      db.exec('CREATE INDEX idx_agent_names_type ON agent_names(agent_type)');
      db.exec('CREATE INDEX idx_agent_names_expires_at ON agent_names(expires_at)');
      db.exec('CREATE INDEX idx_session_names_session_id ON session_names(session_id)');
      db.exec('CREATE INDEX idx_agent_executions_agent_id ON agent_executions(agent_id)');
      db.exec('CREATE INDEX idx_agent_executions_session_id ON agent_executions(session_id)');
      db.exec('CREATE INDEX idx_agent_executions_status ON agent_executions(status)');
      
      console.log('Agent naming migration completed successfully');
    }
  } catch (error) {
    console.error('Agent naming migration failed:', error);
  }
}

export interface AgentName {
  id?: number;
  cache_key: string;
  name: string;
  agent_type: string;
  context?: string;
  generation_method: string;
  created_at: number;
  updated_at: number;
  expires_at?: number;
  usage_count: number;
  last_used_at?: number;
  metadata?: string;
}

export interface SessionName {
  id?: number;
  session_id: string;
  name: string;
  session_type: string;
  agent_count: number;
  context?: string;
  generation_method: string;
  created_at: number;
  updated_at: number;
  metadata?: string;
}

export interface AgentExecution {
  id?: number;
  agent_id: string;
  session_id: string;
  display_name: string;
  agent_type: string;
  status: string;
  task_description?: string;
  context?: string;
  start_time: number;
  end_time?: number;
  duration_ms?: number;
  token_usage: number;
  estimated_cost: number;
  tools_used?: string;
  success_indicators?: string;
  performance_metrics?: string;
  error_info?: string;
  created_at: number;
  updated_at: number;
}

export function getAgentName(cacheKey: string): AgentName | null {
  try {
    const stmt = db.prepare('SELECT * FROM agent_names WHERE cache_key = ?');
    const row = stmt.get(cacheKey) as any;
    
    if (!row) return null;
    
    // Update usage statistics
    db.prepare('UPDATE agent_names SET usage_count = usage_count + 1, last_used_at = ? WHERE id = ?')
      .run(Date.now(), row.id);
    
    return row as AgentName;
  } catch (error) {
    console.error('Error getting agent name:', error);
    return null;
  }
}

export function insertAgentName(agentName: Omit<AgentName, 'id' | 'created_at' | 'updated_at'>): boolean {
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO agent_names 
      (cache_key, name, agent_type, context, generation_method, expires_at, usage_count, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      agentName.cache_key,
      agentName.name,
      agentName.agent_type,
      agentName.context || null,
      agentName.generation_method,
      agentName.expires_at || null,
      agentName.usage_count || 0,
      agentName.metadata || null
    );
    
    return true;
  } catch (error) {
    console.error('Error inserting agent name:', error);
    return false;
  }
}

export function insertSessionName(sessionName: Omit<SessionName, 'id' | 'created_at' | 'updated_at'>): boolean {
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO session_names 
      (session_id, name, session_type, agent_count, context, generation_method, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      sessionName.session_id,
      sessionName.name,
      sessionName.session_type,
      sessionName.agent_count,
      sessionName.context || null,
      sessionName.generation_method,
      sessionName.metadata || null
    );
    
    return true;
  } catch (error) {
    console.error('Error inserting session name:', error);
    return false;
  }
}

export function getSessionName(sessionId: string): SessionName | null {
  try {
    const stmt = db.prepare('SELECT * FROM session_names WHERE session_id = ?');
    return stmt.get(sessionId) as SessionName | null;
  } catch (error) {
    console.error('Error getting session name:', error);
    return null;
  }
}

export function insertAgentExecution(execution: Omit<AgentExecution, 'id' | 'created_at' | 'updated_at'>): boolean {
  try {
    const stmt = db.prepare(`
      INSERT INTO agent_executions 
      (agent_id, session_id, display_name, agent_type, status, task_description, context,
       start_time, end_time, duration_ms, token_usage, estimated_cost, tools_used,
       success_indicators, performance_metrics, error_info)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      execution.agent_id,
      execution.session_id,
      execution.display_name,
      execution.agent_type,
      execution.status,
      execution.task_description || null,
      execution.context || null,
      execution.start_time,
      execution.end_time || null,
      execution.duration_ms || null,
      execution.token_usage || 0,
      execution.estimated_cost || 0.0,
      execution.tools_used || null,
      execution.success_indicators || null,
      execution.performance_metrics || null,
      execution.error_info || null
    );
    
    return true;
  } catch (error) {
    console.error('Error inserting agent execution:', error);
    return false;
  }
}

export function updateAgentExecution(agentId: string, updates: Partial<AgentExecution>): boolean {
  try {
    const allowedFields = ['status', 'end_time', 'duration_ms', 'token_usage', 'estimated_cost', 
                          'tools_used', 'success_indicators', 'performance_metrics', 'error_info'];
    const setClause = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .map(key => `${key} = ?`)
      .join(', ');
    
    if (!setClause) return false;
    
    const values = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .map(key => updates[key as keyof AgentExecution]);
    
    const stmt = db.prepare(`UPDATE agent_executions SET ${setClause} WHERE agent_id = ?`);
    const result = stmt.run(...values, agentId);
    
    return result.changes > 0;
  } catch (error) {
    console.error('Error updating agent execution:', error);
    return false;
  }
}

export function getAgentExecution(agentId: string): AgentExecution | null {
  try {
    const stmt = db.prepare('SELECT * FROM agent_executions WHERE agent_id = ?');
    return stmt.get(agentId) as AgentExecution | null;
  } catch (error) {
    console.error('Error getting agent execution:', error);
    return null;
  }
}

export function getActiveAgentExecutions(): AgentExecution[] {
  try {
    const stmt = db.prepare('SELECT * FROM agent_executions WHERE status IN (?, ?) ORDER BY start_time DESC');
    return stmt.all('pending', 'active') as AgentExecution[];
  } catch (error) {
    console.error('Error getting active agent executions:', error);
    return [];
  }
}

export function cleanupExpiredNames(): number {
  try {
    const stmt = db.prepare('DELETE FROM agent_names WHERE expires_at IS NOT NULL AND expires_at < ?');
    const result = stmt.run(Date.now());
    return result.changes;
  } catch (error) {
    console.error('Error cleaning up expired names:', error);
    return 0;
  }
}

// Export database instance for hook coverage service
export function getDatabase(): Database {
  return db;
}