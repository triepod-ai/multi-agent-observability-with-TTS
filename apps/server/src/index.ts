import { initDatabase, insertEvent, getFilterOptions, getRecentEvents, getDatabase, classifyAgentType } from './db';
import type { HookEvent, SessionRelationship, SpawnContext } from './types';
import {
  insertSessionRelationship,
  updateRelationshipCompletion,
  getSessionRelationships,
  buildSessionTree,
  getSessionChildren,
  getSessionSiblings,
  getRelationshipStats
} from './services/relationshipService';
import { 
  createTheme, 
  updateThemeById, 
  getThemeById, 
  searchThemes, 
  deleteThemeById, 
  exportThemeById, 
  importTheme,
  getThemeStats 
} from './theme';
import { setupAgentNamingRoutes } from './agent-naming';
import {
  getCurrentMetrics,
  getAgentTimeline,
  getAgentTypeDistribution,
  getAgentPerformance,
  getToolUsage,
  updateAgentMetrics,
  markAgentStarted,
  markAgentCompleted,
  setWebSocketClients,
  getTerminalStatus,
  getAgentTypeColor
} from './agents';
import { unifiedMetricsService } from './services/unifiedMetricsService';
import {
  setWebSocketClients as setHookCoverageClients,
  broadcastHookCoverage,
  getHookCoverageAPI
} from './services/hookCoverageService';
import {
  calculateEnhancedHookContext,
  calculatePerformanceMetrics,
  getRecentHookEvents
} from './services/enhancedHookService';
import { redisConnectivity } from './services/redisConnectivityService';
import { fallbackStorage } from './services/fallbackStorageService';
import { fallbackSync } from './services/fallbackSyncService';
import { agentsService } from './services/agentsService';

// Initialize database
initDatabase();

// Store WebSocket clients
const wsClients = new Set<any>();

// Initialize agent module with WebSocket clients
setWebSocketClients(wsClients);

// Initialize hook coverage module with WebSocket clients
setHookCoverageClients(wsClients);

// Initialize relationship module with WebSocket clients
import { setWebSocketClientsForRelationships } from './db';
setWebSocketClientsForRelationships(wsClients);

/**
 * Process event metrics through the unified metrics service
 * Handles agent lifecycle events and general metric recording
 */
async function processEventMetrics(event: HookEvent, savedEvent: any): Promise<void> {
  try {
    console.log(`🔄 Processing metrics for ${event.hook_event_type} event (session: ${event.session_id})`);
    
    // Record basic metric for all events to the unified service
    await unifiedMetricsService.recordMetric(event);
    console.log(`✅ Basic metrics recorded for ${event.hook_event_type}`);
    
    // Handle specialized agent lifecycle events
    if (event.hook_event_type === 'SubagentStart' && event.payload) {
      await processSubagentStartEvent(event, savedEvent);
    } else if (event.hook_event_type === 'SubagentStop' && event.payload) {
      await processSubagentStopEvent(event, savedEvent);
    }
    
    // Extract and record tool usage from any event that contains tools
    if (event.payload && event.payload.tools_used && Array.isArray(event.payload.tools_used)) {
      console.log(`🔧 Recording tool usage: ${event.payload.tools_used.join(', ')}`);
    }
    
  } catch (error) {
    console.error(`❌ Error processing metrics for ${event.hook_event_type}:`, error);
    // Don't throw - metrics recording shouldn't break event processing
  }
}

/**
 * Process SubagentStart events
 */
async function processSubagentStartEvent(event: HookEvent, savedEvent: any): Promise<void> {
  try {
    const agentName = event.payload.agent_name || event.payload.subagent_type || 'unknown';
    const agentData = {
      agent_name: agentName,
      agent_type: classifyAgentType(agentName, event.payload),
      task_description: event.payload.task || event.payload.description || '',
      tools: event.payload.tools || [],
      session_id: event.session_id,
      source_app: event.source_app,
      start_time: event.timestamp || Date.now()
    };
    
    console.log(`🚀 Agent starting: ${agentData.agent_name} (type: ${agentData.agent_type})`);
    
    // Use unified metrics service for agent started tracking
    const agentId = await unifiedMetricsService.markAgentStarted(agentData);
    
    // Store agent ID in event payload for correlation
    savedEvent.payload.agent_id = agentId;
    
    console.log(`✅ Agent ${agentData.agent_name} started with ID: ${agentId}`);
    
  } catch (error) {
    console.error('❌ Error processing SubagentStart event:', error);
    // Fallback to legacy system if unified service fails
    try {
      const agentName = event.payload.agent_name || 'unknown';
      const agentId = await markAgentStarted({
        agent_name: agentName,
        agent_type: classifyAgentType(agentName, event.payload),
        session_id: event.session_id,
        source_app: event.source_app
      });
      savedEvent.payload.agent_id = agentId;
      console.log(`⚠️ Fallback: Agent started with legacy system: ${agentId}`);
    } catch (fallbackError) {
      console.error('❌ Both unified and legacy agent start failed:', fallbackError);
    }
  }
}

/**
 * Extract tools used from session events in the database
 */
function extractToolsFromSession(sessionId: string): string[] {
  try {
    const db = getDatabase();
    if (!db) return [];

    // Query for PreToolUse and PostToolUse events in this session
    const stmt = db.prepare(`
      SELECT DISTINCT json_extract(payload, '$.tool_name') as tool_name
      FROM hook_events
      WHERE session_id = ?
      AND hook_event_type IN ('PreToolUse', 'PostToolUse')
      AND json_extract(payload, '$.tool_name') IS NOT NULL
    `);

    const rows = stmt.all(sessionId) as any[];
    const tools = rows
      .map(row => row.tool_name)
      .filter(tool => tool && typeof tool === 'string');

    console.log(`🔍 Extracted ${tools.length} tools from session ${sessionId}: ${tools.join(', ')}`);
    return tools;
  } catch (error) {
    console.error('Error extracting tools from session:', error);
    return [];
  }
}

/**
 * Process SubagentStop events
 */
async function processSubagentStopEvent(event: HookEvent, savedEvent: any): Promise<void> {
  try {
    const agentName = event.payload.agent_name || 'unknown';

    // Extract tools from payload, or fall back to extracting from session events
    let toolsUsed = event.payload.tools_used || [];
    if (!toolsUsed || toolsUsed.length === 0) {
      toolsUsed = extractToolsFromSession(event.session_id);
      console.log(`📦 Using extracted tools (${toolsUsed.length}) for agent: ${agentName}`);
    }

    const agentData = {
      agent_name: agentName,
      agent_type: classifyAgentType(agentName, event.payload),
      agent_id: event.payload.agent_id || `ag_${Date.now()}`,
      duration: event.payload.duration || 0,
      tokens: event.payload.tokens_used || 0,
      success: event.payload.result !== false && !event.payload.error,
      status: event.payload.result ? 'success' : (event.payload.error ? 'failed' : 'unknown'),
      token_usage: {
        total_tokens: event.payload.tokens_used || 0,
        estimated_cost: Math.round((event.payload.tokens_used || 0) * 0.01) // in cents
      },
      tools_used: toolsUsed,
      session_id: event.session_id,
      source_app: event.source_app,
      end_time: event.timestamp || Date.now()
    };
    
    console.log(`🏁 Agent completed: ${agentData.agent_name} (${agentData.status}, ${agentData.tokens} tokens, ${agentData.duration}ms)`);
    
    // Use unified metrics service for agent completion tracking
    const success = await unifiedMetricsService.markAgentCompleted(agentData);
    
    if (success) {
      console.log(`✅ Agent ${agentData.agent_name} completed successfully`);
    } else {
      console.warn(`⚠️ Failed to mark agent ${agentData.agent_name} as completed`);
    }
    
  } catch (error) {
    console.error('❌ Error processing SubagentStop event:', error);
    // Fallback to legacy system if unified service fails
    try {
      const agentName = event.payload.agent_name || 'unknown';

      // Extract tools from payload, or fall back to extracting from session events
      let toolsUsed = event.payload.tools_used || [];
      if (!toolsUsed || toolsUsed.length === 0) {
        toolsUsed = extractToolsFromSession(event.session_id);
        console.log(`📦 Fallback: Using extracted tools (${toolsUsed.length}) for agent: ${agentName}`);
      }

      const agentData = {
        agent_name: agentName,
        agent_type: classifyAgentType(agentName, event.payload),
        agent_id: event.payload.agent_id || `ag_${Date.now()}`,
        duration_ms: event.payload.duration || 0,
        status: event.payload.result ? 'success' : 'failed',
        token_usage: {
          total_tokens: event.payload.tokens_used || 0,
          estimated_cost: Math.round((event.payload.tokens_used || 0) * 0.01)
        },
        tools_used: toolsUsed,
        session_id: event.session_id,
        source_app: event.source_app
      };
      
      await updateAgentMetrics(agentData);
      
      if (event.payload.agent_id) {
        await markAgentCompleted(event.payload.agent_id, agentData);
      }
      
      console.log(`⚠️ Fallback: Agent completed using legacy system`);
    } catch (fallbackError) {
      console.error('❌ Both unified and legacy agent completion failed:', fallbackError);
    }
  }
}

// Create Bun server with HTTP and WebSocket support
const server = Bun.serve({
  port: process.env.PORT ? parseInt(process.env.PORT) : 4056,
  
  async fetch(req: Request) {
    const url = new URL(req.url);
    
    // Handle CORS
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers });
    }
    
    // POST /events - Receive new events
    if (url.pathname === '/events' && req.method === 'POST') {
      try {
        const event: HookEvent = await req.json();
        
        // Validate required fields
        if (!event.source_app || !event.session_id || !event.hook_event_type || !event.payload) {
          return new Response(JSON.stringify({ error: 'Missing required fields' }), {
            status: 400,
            headers: { ...headers, 'Content-Type': 'application/json' }
          });
        }
        
        // Insert event into database
        const savedEvent = insertEvent(event);
        
        // Process event through unified metrics service
        await processEventMetrics(event, savedEvent);
        
        // Process relationship events
        if (event.hook_event_type === 'SessionStart' && event.parent_session_id) {
          // Auto-create relationship when a child session starts
          try {
            const relationship: Omit<SessionRelationship, 'id'> = {
              parent_session_id: event.parent_session_id,
              child_session_id: event.session_id,
              relationship_type: event.wave_id ? 'wave_member' : 'parent/child',
              spawn_reason: event.payload.spawn_reason || 'auto_detected',
              delegation_type: event.payload.delegation_type || 'isolated',
              spawn_metadata: event.delegation_context || event.payload,
              created_at: event.timestamp || Date.now(),
              depth_level: event.session_depth || 1,
              session_path: `${event.parent_session_id}.${event.session_id}`
            };
            
            insertSessionRelationship(relationship);
            
            // Broadcast relationship created event
            const relationshipMessage = JSON.stringify({
              type: 'relationship_created',
              data: relationship
            });
            wsClients.forEach(client => {
              try {
                client.send(relationshipMessage);
              } catch (err) {
                wsClients.delete(client);
              }
            });
          } catch (error) {
            console.error('Error creating relationship from SessionStart event:', error);
          }
        }
        
        if (event.hook_event_type === 'SessionEnd' && event.parent_session_id) {
          // Update relationship completion when child session ends
          try {
            updateRelationshipCompletion(event.parent_session_id, event.session_id, event.timestamp);
            
            // Broadcast relationship updated event
            const relationshipMessage = JSON.stringify({
              type: 'relationship_updated',
              data: {
                parent_session_id: event.parent_session_id,
                child_session_id: event.session_id,
                completed_at: event.timestamp
              }
            });
            wsClients.forEach(client => {
              try {
                client.send(relationshipMessage);
              } catch (err) {
                wsClients.delete(client);
              }
            });
          } catch (error) {
            console.error('Error updating relationship from SessionEnd event:', error);
          }
        }
        
        // Broadcast to all WebSocket clients
        const message = JSON.stringify({ type: 'event', data: savedEvent });
        wsClients.forEach(client => {
          try {
            client.send(message);
          } catch (err) {
            // Client disconnected, remove from set
            wsClients.delete(client);
          }
        });
        
        // Broadcast updated hook coverage
        broadcastHookCoverage(getDatabase());
        
        return new Response(JSON.stringify(savedEvent), {
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Error processing event:', error);
        return new Response(JSON.stringify({ error: 'Invalid request' }), {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // GET /events/filter-options - Get available filter options
    if (url.pathname === '/events/filter-options' && req.method === 'GET') {
      const options = getFilterOptions();
      return new Response(JSON.stringify(options), {
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }
    
    // GET /events/recent - Get recent events
    if (url.pathname === '/events/recent' && req.method === 'GET') {
      const limit = parseInt(url.searchParams.get('limit') || '100');
      const events = getRecentEvents(limit);
      return new Response(JSON.stringify(events), {
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // GET /events/correlated - Get correlated PreToolUse/PostToolUse events
    if (url.pathname === '/events/correlated' && req.method === 'GET') {
      try {
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const correlationId = url.searchParams.get('correlation_id');

        const db = getDatabase();
        let stmt;
        let rows;

        if (correlationId) {
          // Get specific correlated events by correlation_id
          stmt = db.prepare(`
            SELECT id, source_app, session_id, hook_event_type, payload, chat, summary, timestamp,
                   parent_session_id, session_depth, wave_id, delegation_context, correlation_id
            FROM events
            WHERE correlation_id = ?
            ORDER BY timestamp ASC
          `);
          rows = stmt.all(correlationId);
        } else {
          // Get all correlated event pairs (events that have correlation_id and appear as pairs)
          stmt = db.prepare(`
            SELECT id, source_app, session_id, hook_event_type, payload, chat, summary, timestamp,
                   parent_session_id, session_depth, wave_id, delegation_context, correlation_id
            FROM events
            WHERE correlation_id IS NOT NULL
            ORDER BY correlation_id, timestamp ASC
            LIMIT ?
          `);
          rows = stmt.all(limit);
        }

        const events = rows.map((row: any) => ({
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
          correlation_id: row.correlation_id
        }));

        return new Response(JSON.stringify(events), {
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Error fetching correlated events:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch correlated events' }), {
          status: 500,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }
    }

    // Theme API endpoints
    
    // POST /api/themes - Create a new theme
    if (url.pathname === '/api/themes' && req.method === 'POST') {
      try {
        const themeData = await req.json();
        const result = await createTheme(themeData);
        
        const status = result.success ? 201 : 400;
        return new Response(JSON.stringify(result), {
          status,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Error creating theme:', error);
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Invalid request body' 
        }), {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // GET /api/themes - Search themes
    if (url.pathname === '/api/themes' && req.method === 'GET') {
      const query = {
        query: url.searchParams.get('query') || undefined,
        isPublic: url.searchParams.get('isPublic') ? url.searchParams.get('isPublic') === 'true' : undefined,
        authorId: url.searchParams.get('authorId') || undefined,
        sortBy: url.searchParams.get('sortBy') as any || undefined,
        sortOrder: url.searchParams.get('sortOrder') as any || undefined,
        limit: url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : undefined,
        offset: url.searchParams.get('offset') ? parseInt(url.searchParams.get('offset')!) : undefined,
      };
      
      const result = await searchThemes(query);
      return new Response(JSON.stringify(result), {
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }
    
    // GET /api/themes/:id - Get a specific theme
    if (url.pathname.startsWith('/api/themes/') && req.method === 'GET') {
      const id = url.pathname.split('/')[3];
      if (!id) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Theme ID is required' 
        }), {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }
      
      const result = await getThemeById(id);
      const status = result.success ? 200 : 404;
      return new Response(JSON.stringify(result), {
        status,
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }
    
    // PUT /api/themes/:id - Update a theme
    if (url.pathname.startsWith('/api/themes/') && req.method === 'PUT') {
      const id = url.pathname.split('/')[3];
      if (!id) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Theme ID is required' 
        }), {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }
      
      try {
        const updates = await req.json();
        const result = await updateThemeById(id, updates);
        
        const status = result.success ? 200 : 400;
        return new Response(JSON.stringify(result), {
          status,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Error updating theme:', error);
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Invalid request body' 
        }), {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // DELETE /api/themes/:id - Delete a theme
    if (url.pathname.startsWith('/api/themes/') && req.method === 'DELETE') {
      const id = url.pathname.split('/')[3];
      if (!id) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Theme ID is required' 
        }), {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }
      
      const authorId = url.searchParams.get('authorId');
      const result = await deleteThemeById(id, authorId || undefined);
      
      const status = result.success ? 200 : (result.error?.includes('not found') ? 404 : 403);
      return new Response(JSON.stringify(result), {
        status,
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }
    
    // GET /api/themes/:id/export - Export a theme
    if (url.pathname.match(/^\/api\/themes\/[^\/]+\/export$/) && req.method === 'GET') {
      const id = url.pathname.split('/')[3];
      
      const result = await exportThemeById(id);
      if (!result.success) {
        const status = result.error?.includes('not found') ? 404 : 400;
        return new Response(JSON.stringify(result), {
          status,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify(result.data), {
        headers: { 
          ...headers, 
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${result.data.theme.name}.json"`
        }
      });
    }
    
    // POST /api/themes/import - Import a theme
    if (url.pathname === '/api/themes/import' && req.method === 'POST') {
      try {
        const importData = await req.json();
        const authorId = url.searchParams.get('authorId');
        
        const result = await importTheme(importData, authorId || undefined);
        
        const status = result.success ? 201 : 400;
        return new Response(JSON.stringify(result), {
          status,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Error importing theme:', error);
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Invalid import data' 
        }), {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // GET /api/themes/stats - Get theme statistics
    if (url.pathname === '/api/themes/stats' && req.method === 'GET') {
      const result = await getThemeStats();
      return new Response(JSON.stringify(result), {
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }
    
    // Agent API endpoints
    
    // GET /api/agents/metrics/current - Get current agent metrics
    if (url.pathname === '/api/agents/metrics/current' && req.method === 'GET') {
      try {
        console.log('🔍 Fetching current agent metrics via unified service...');
        
        // Parse optional time range from query parameters
        const startParam = url.searchParams.get('start');
        const endParam = url.searchParams.get('end');
        
        let timeRange = undefined;
        if (startParam && endParam) {
          timeRange = {
            start: parseInt(startParam),
            end: parseInt(endParam)
          };
        }
        
        const metrics = await unifiedMetricsService.getMetrics(timeRange);
        console.log(`✅ Retrieved metrics: ${metrics.executions_today} executions, ${metrics.active_agents} active agents`);
        
        return new Response(JSON.stringify(metrics), {
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('❌ Error getting agent metrics from unified service:', error);
        
        // Fallback to legacy system
        try {
          console.log('⚠️ Attempting fallback to legacy metrics system...');
          const metrics = await getCurrentMetrics();
          return new Response(JSON.stringify(metrics), {
            headers: { ...headers, 'Content-Type': 'application/json' }
          });
        } catch (fallbackError) {
          console.error('❌ Legacy metrics fallback also failed:', fallbackError);
          return new Response(JSON.stringify({ 
            error: 'Failed to get metrics from both unified and legacy systems',
            details: error instanceof Error ? error.message : 'Unknown error'
          }), {
            status: 500,
            headers: { ...headers, 'Content-Type': 'application/json' }
          });
        }
      }
    }
    
    // GET /api/agents/metrics/timeline - Get agent execution timeline
    if (url.pathname === '/api/agents/metrics/timeline' && req.method === 'GET') {
      try {
        console.log('🔍 Fetching agent timeline via unified service...');
        
        // Parse time range parameters
        const hours = parseInt(url.searchParams.get('hours') || '24');
        const startParam = url.searchParams.get('start');
        const endParam = url.searchParams.get('end');
        
        let timeRange = undefined;
        if (startParam && endParam) {
          timeRange = {
            start: parseInt(startParam),
            end: parseInt(endParam)
          };
        } else if (hours) {
          // Convert hours to time range
          const endTime = Date.now();
          const startTime = endTime - (hours * 60 * 60 * 1000);
          timeRange = { start: startTime, end: endTime };
        }
        
        const timeline = await unifiedMetricsService.getTimeline(timeRange);
        console.log(`✅ Retrieved timeline with ${timeline.timeline.length} data points`);
        
        return new Response(JSON.stringify(timeline), {
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('❌ Error getting agent timeline from unified service:', error);
        
        // Fallback to legacy system
        try {
          console.log('⚠️ Attempting fallback to legacy timeline system...');
          const hours = parseInt(url.searchParams.get('hours') || '24');
          const timeline = await getAgentTimeline(hours);
          return new Response(JSON.stringify(timeline), {
            headers: { ...headers, 'Content-Type': 'application/json' }
          });
        } catch (fallbackError) {
          console.error('❌ Legacy timeline fallback also failed:', fallbackError);
          return new Response(JSON.stringify({ 
            error: 'Failed to get timeline from both unified and legacy systems',
            details: error instanceof Error ? error.message : 'Unknown error'
          }), {
            status: 500,
            headers: { ...headers, 'Content-Type': 'application/json' }
          });
        }
      }
    }
    
    // GET /api/agents/types/distribution - Get agent type distribution
    if (url.pathname === '/api/agents/types/distribution' && req.method === 'GET') {
      try {
        console.log('🔍 Fetching agent type distribution via unified service...');
        
        const distribution = await unifiedMetricsService.getDistribution();
        console.log(`✅ Retrieved distribution with ${distribution.distribution.length} agent types`);
        
        return new Response(JSON.stringify(distribution), {
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('❌ Error getting agent distribution from unified service:', error);
        
        // Fallback to legacy system
        try {
          console.log('⚠️ Attempting fallback to legacy distribution system...');
          const distribution = await getAgentTypeDistribution();
          return new Response(JSON.stringify(distribution), {
            headers: { ...headers, 'Content-Type': 'application/json' }
          });
        } catch (fallbackError) {
          console.error('❌ Legacy distribution fallback also failed:', fallbackError);
          return new Response(JSON.stringify({ 
            error: 'Failed to get distribution from both unified and legacy systems',
            details: error instanceof Error ? error.message : 'Unknown error'
          }), {
            status: 500,
            headers: { ...headers, 'Content-Type': 'application/json' }
          });
        }
      }
    }
    
    // GET /api/agents/performance/:agentName - Get agent performance history
    if (url.pathname.startsWith('/api/agents/performance/') && req.method === 'GET') {
      try {
        const pathParts = url.pathname.split('/');
        const agentName = pathParts[4];
        const days = parseInt(url.searchParams.get('days') || '7');
        
        if (!agentName) {
          return new Response(JSON.stringify({ error: 'Agent name required' }), {
            status: 400,
            headers: { ...headers, 'Content-Type': 'application/json' }
          });
        }
        
        const performance = await getAgentPerformance(agentName, days);
        return new Response(JSON.stringify(performance), {
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Error getting agent performance:', error);
        return new Response(JSON.stringify({ error: 'Failed to get performance' }), {
          status: 500,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // GET /api/agents/tools/usage - Get tool usage analytics
    if (url.pathname === '/api/agents/tools/usage' && req.method === 'GET') {
      try {
        console.log('🔍 Fetching tool usage analytics via unified service...');
        
        const usage = await unifiedMetricsService.getToolUsage();
        console.log(`✅ Retrieved tool usage with ${usage.tools.length} tools analyzed`);
        
        return new Response(JSON.stringify(usage), {
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('❌ Error getting tool usage from unified service:', error);
        
        // Fallback to legacy system
        try {
          console.log('⚠️ Attempting fallback to legacy tool usage system...');
          const period = (url.searchParams.get('period') || 'day') as 'day' | 'week';
          const usage = await getToolUsage(period);
          return new Response(JSON.stringify(usage), {
            headers: { ...headers, 'Content-Type': 'application/json' }
          });
        } catch (fallbackError) {
          console.error('❌ Legacy tool usage fallback also failed:', fallbackError);
          return new Response(JSON.stringify({ 
            error: 'Failed to get tool usage from both unified and legacy systems',
            details: error instanceof Error ? error.message : 'Unknown error'
          }), {
            status: 500,
            headers: { ...headers, 'Content-Type': 'application/json' }
          });
        }
      }
    }
    
    // GET /api/terminal/status - Get current terminal status
    if (url.pathname === '/api/terminal/status' && req.method === 'GET') {
      try {
        const status = await getTerminalStatus();
        return new Response(JSON.stringify(status), {
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Error getting terminal status:', error);
        return new Response(JSON.stringify({ error: 'Failed to get terminal status' }), {
          status: 500,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // GET /api/terminal/agent-colors - Get agent type color mapping
    if (url.pathname === '/api/terminal/agent-colors' && req.method === 'GET') {
      try {
        const agentTypes = [
          'analyzer', 'debugger', 'builder', 'tester', 'reviewer', 'optimizer',
          'security', 'writer', 'deployer', 'data-processor', 'monitor',
          'configurator', 'context', 'collector', 'storage', 'searcher',
          'api-handler', 'integrator', 'ui-developer', 'designer', 'ml-engineer',
          'predictor', 'database-admin', 'data-manager', 'translator', 'generator',
          'linter', 'generic'
        ];
        
        const colorMapping = agentTypes.reduce((map, type) => {
          map[type] = getAgentTypeColor(type);
          return map;
        }, {} as Record<string, string>);
        
        return new Response(JSON.stringify(colorMapping), {
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Error getting agent colors:', error);
        return new Response(JSON.stringify({ error: 'Failed to get agent colors' }), {
          status: 500,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Hook Coverage API endpoint
    // GET /api/hooks/coverage - Get current hook coverage status
    if (url.pathname === '/api/hooks/coverage' && req.method === 'GET') {
      try {
        const db = getDatabase();
        const hookCoverage = getHookCoverageAPI(db);
        return new Response(JSON.stringify(hookCoverage), {
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Error getting hook coverage:', error);
        return new Response(JSON.stringify({ error: 'Failed to get hook coverage' }), {
          status: 500,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }
    }

    // Enhanced Hook API endpoints
    // GET /api/hooks/:hookType/context - Get enhanced context for a specific hook
    if (url.pathname.startsWith('/api/hooks/') && url.pathname.endsWith('/context') && req.method === 'GET') {
      try {
        const pathParts = url.pathname.split('/');
        const hookType = pathParts[3]; // /api/hooks/:hookType/context
        
        const db = getDatabase();
        const context = calculateEnhancedHookContext(db, hookType);
        
        return new Response(JSON.stringify(context), {
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Error getting hook context:', error);
        return new Response(JSON.stringify({ error: 'Failed to get hook context' }), {
          status: 500,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }
    }

    // GET /api/hooks/:hookType/events - Get recent events for a specific hook
    if (url.pathname.startsWith('/api/hooks/') && url.pathname.endsWith('/events') && req.method === 'GET') {
      try {
        const pathParts = url.pathname.split('/');
        const hookType = pathParts[3]; // /api/hooks/:hookType/events
        
        const urlParams = new URLSearchParams(url.search);
        const limit = parseInt(urlParams.get('limit') || '50');
        
        const db = getDatabase();
        const events = getRecentHookEvents(db, hookType, limit);
        
        return new Response(JSON.stringify(events), {
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Error getting hook events:', error);
        return new Response(JSON.stringify({ error: 'Failed to get hook events' }), {
          status: 500,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }
    }

    // GET /api/hooks/:hookType/metrics - Get performance metrics for a specific hook
    if (url.pathname.startsWith('/api/hooks/') && url.pathname.endsWith('/metrics') && req.method === 'GET') {
      try {
        const pathParts = url.pathname.split('/');
        const hookType = pathParts[3]; // /api/hooks/:hookType/metrics
        
        const db = getDatabase();
        const metrics = calculatePerformanceMetrics(db, hookType);
        
        return new Response(JSON.stringify(metrics), {
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Error getting hook metrics:', error);
        return new Response(JSON.stringify({ error: 'Failed to get hook metrics' }), {
          status: 500,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }
    }

    // GET /api/hooks/:hookType/execution-context - Get execution context for a specific hook
    if (url.pathname.startsWith('/api/hooks/') && url.pathname.endsWith('/execution-context') && req.method === 'GET') {
      try {
        const pathParts = url.pathname.split('/');
        const hookType = pathParts[3]; // /api/hooks/:hookType/execution-context
        
        const db = getDatabase();
        const context = calculateEnhancedHookContext(db, hookType);
        
        // Return a subset of the context focused on execution details
        const executionContext = {
          sourceApps: context.sourceApps,
          activeSessions: context.activeSessions,
          sessionDepthRange: context.sessionDepthRange,
          executionEnvironments: context.executionEnvironments,
          userContext: context.userContext,
          toolUsage: context.toolUsage,
          agentActivity: context.agentActivity,
          sessionContext: context.sessionContext,
          recentErrors: context.recentErrors,
          systemContext: context.systemContext
        };
        
        return new Response(JSON.stringify(executionContext), {
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Error getting hook execution context:', error);
        return new Response(JSON.stringify({ error: 'Failed to get hook execution context' }), {
          status: 500,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // POST /api/agents/start - Mark agent as started
    if (url.pathname === '/api/agents/start' && req.method === 'POST') {
      try {
        const agentData = await req.json();
        console.log(`🚀 API request to start agent: ${agentData.agent_name || 'unknown'}`);
        
        // Use unified metrics service
        const agentId = await unifiedMetricsService.markAgentStarted(agentData);
        console.log(`✅ Agent started via unified service: ${agentId}`);
        
        // Broadcast to WebSocket clients
        const message = JSON.stringify({ 
          type: 'agent_started', 
          data: { agent_id: agentId, ...agentData }
        });
        wsClients.forEach(client => {
          try {
            client.send(message);
          } catch (err) {
            wsClients.delete(client);
          }
        });
        
        return new Response(JSON.stringify({ agent_id: agentId }), {
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('❌ Error marking agent started via unified service:', error);
        
        // Fallback to legacy system
        try {
          console.log('⚠️ Attempting fallback to legacy agent start system...');
          const agentData = await req.json();
          const agentId = await markAgentStarted(agentData);
          
          const message = JSON.stringify({ 
            type: 'agent_started', 
            data: { agent_id: agentId, ...agentData }
          });
          wsClients.forEach(client => {
            try {
              client.send(message);
            } catch (err) {
              wsClients.delete(client);
            }
          });
          
          return new Response(JSON.stringify({ agent_id: agentId }), {
            headers: { ...headers, 'Content-Type': 'application/json' }
          });
        } catch (fallbackError) {
          console.error('❌ Legacy agent start fallback also failed:', fallbackError);
          return new Response(JSON.stringify({ 
            error: 'Failed to mark agent started in both unified and legacy systems',
            details: error instanceof Error ? error.message : 'Unknown error'
          }), {
            status: 500,
            headers: { ...headers, 'Content-Type': 'application/json' }
          });
        }
      }
    }
    
    // POST /api/agents/complete - Mark agent as completed and update metrics
    if (url.pathname === '/api/agents/complete' && req.method === 'POST') {
      try {
        const agentData = await req.json();
        console.log(`🏁 API request to complete agent: ${agentData.agent_name || agentData.agent_id || 'unknown'}`);
        
        // Use unified metrics service to mark as completed
        const success = await unifiedMetricsService.markAgentCompleted(agentData);
        
        if (success) {
          console.log(`✅ Agent completed via unified service: ${agentData.agent_name || agentData.agent_id}`);
        } else {
          console.warn(`⚠️ Agent completion reported as failed: ${agentData.agent_name || agentData.agent_id}`);
        }
        
        // Broadcast to WebSocket clients
        const message = JSON.stringify({ 
          type: 'agent_completed', 
          data: agentData 
        });
        wsClients.forEach(client => {
          try {
            client.send(message);
          } catch (err) {
            wsClients.delete(client);
          }
        });
        
        return new Response(JSON.stringify({ success }), {
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('❌ Error marking agent completed via unified service:', error);
        
        // Fallback to legacy system
        try {
          console.log('⚠️ Attempting fallback to legacy agent completion system...');
          const agentData = await req.json();
          
          // Update metrics
          await updateAgentMetrics(agentData);
          
          // Mark as completed
          if (agentData.agent_id) {
            await markAgentCompleted(agentData.agent_id, agentData);
          }
          
          // Broadcast to WebSocket clients
          const message = JSON.stringify({ 
            type: 'agent_completed', 
            data: agentData 
          });
          wsClients.forEach(client => {
            try {
              client.send(message);
            } catch (err) {
              wsClients.delete(client);
            }
          });
          
          return new Response(JSON.stringify({ success: true }), {
            headers: { ...headers, 'Content-Type': 'application/json' }
          });
        } catch (fallbackError) {
          console.error('❌ Legacy agent completion fallback also failed:', fallbackError);
          return new Response(JSON.stringify({ 
            error: 'Failed to mark agent completed in both unified and legacy systems',
            details: error instanceof Error ? error.message : 'Unknown error'
          }), {
            status: 500,
            headers: { ...headers, 'Content-Type': 'application/json' }
          });
        }
      }
    }
    
    // Session Relationship API endpoints
    
    // GET /api/sessions/:id/relationships - Get all relationships for a session
    if (url.pathname.match(/^\/api\/sessions\/[^\/]+\/relationships$/) && req.method === 'GET') {
      try {
        const sessionId = url.pathname.split('/')[3];
        if (!sessionId) {
          return new Response(JSON.stringify({ error: 'Session ID is required' }), {
            status: 400,
            headers: { ...headers, 'Content-Type': 'application/json' }
          });
        }
        
        const includeParent = url.searchParams.get('includeParent') !== 'false';
        const includeChildren = url.searchParams.get('includeChildren') !== 'false';
        const includeSiblings = url.searchParams.get('includeSiblings') === 'true';
        const maxDepth = parseInt(url.searchParams.get('maxDepth') || '5');
        
        const relationships = getSessionRelationships(sessionId, {
          includeParent,
          includeChildren,
          includeSiblings,
          maxDepth
        });
        
        if (!relationships) {
          return new Response(JSON.stringify({ error: 'Session not found' }), {
            status: 404,
            headers: { ...headers, 'Content-Type': 'application/json' }
          });
        }
        
        return new Response(JSON.stringify(relationships), {
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Error getting session relationships:', error);
        return new Response(JSON.stringify({ error: 'Failed to get session relationships' }), {
          status: 500,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // GET /api/sessions/:id/children - Get child sessions
    if (url.pathname.match(/^\/api\/sessions\/[^\/]+\/children$/) && req.method === 'GET') {
      try {
        const sessionId = url.pathname.split('/')[3];
        if (!sessionId) {
          return new Response(JSON.stringify({ error: 'Session ID is required' }), {
            status: 400,
            headers: { ...headers, 'Content-Type': 'application/json' }
          });
        }
        
        const children = getSessionChildren(sessionId);
        return new Response(JSON.stringify(children), {
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Error getting session children:', error);
        return new Response(JSON.stringify({ error: 'Failed to get session children' }), {
          status: 500,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // GET /api/sessions/:id/tree - Get full hierarchy tree
    if (url.pathname.match(/^\/api\/sessions\/[^\/]+\/tree$/) && req.method === 'GET') {
      try {
        const sessionId = url.pathname.split('/')[3];
        if (!sessionId) {
          return new Response(JSON.stringify({ error: 'Session ID is required' }), {
            status: 400,
            headers: { ...headers, 'Content-Type': 'application/json' }
          });
        }
        
        const maxDepth = parseInt(url.searchParams.get('maxDepth') || '5');
        const tree = buildSessionTree(sessionId, maxDepth);
        
        if (!tree) {
          return new Response(JSON.stringify({ error: 'Session not found or cycle detected' }), {
            status: 404,
            headers: { ...headers, 'Content-Type': 'application/json' }
          });
        }
        
        return new Response(JSON.stringify({ tree }), {
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Error getting session tree:', error);
        return new Response(JSON.stringify({ error: 'Failed to get session tree' }), {
          status: 500,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // POST /api/sessions/spawn - Register spawn attempt
    if (url.pathname === '/api/sessions/spawn' && req.method === 'POST') {
      try {
        const requestBody = await req.json();
        const { parent_session_id, spawn_context }: { parent_session_id: string; spawn_context: SpawnContext } = requestBody;
        
        if (!parent_session_id || !spawn_context) {
          return new Response(JSON.stringify({ error: 'parent_session_id and spawn_context are required' }), {
            status: 400,
            headers: { ...headers, 'Content-Type': 'application/json' }
          });
        }
        
        // Generate child session ID (in practice, this would come from the actual session creation)
        const child_session_id = `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
        
        const relationship: Omit<SessionRelationship, 'id'> = {
          parent_session_id,
          child_session_id,
          relationship_type: spawn_context.spawn_method === 'wave_orchestration' ? 'wave_member' : 'parent/child',
          spawn_reason: spawn_context.spawn_method || 'manual',
          delegation_type: spawn_context.delegation_type || 'isolated',
          spawn_metadata: spawn_context,
          created_at: Date.now(),
          depth_level: 1, // This should be calculated based on parent depth
          session_path: `${parent_session_id}.${child_session_id}`
        };
        
        const savedRelationship = insertSessionRelationship(relationship);
        
        // Broadcast spawn event to WebSocket clients
        const message = JSON.stringify({ 
          type: 'session_spawn', 
          data: {
            parent_session_id,
            child_session_id,
            relationship: savedRelationship,
            spawn_context
          }
        });
        wsClients.forEach(client => {
          try {
            client.send(message);
          } catch (err) {
            wsClients.delete(client);
          }
        });
        
        return new Response(JSON.stringify({ 
          child_session_id, 
          relationship: savedRelationship 
        }), {
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Error registering spawn attempt:', error);
        return new Response(JSON.stringify({ error: 'Failed to register spawn attempt' }), {
          status: 500,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // POST /api/sessions/:id/child_completed - Notify parent of child completion
    if (url.pathname.match(/^\/api\/sessions\/[^\/]+\/child_completed$/) && req.method === 'POST') {
      try {
        const parentId = url.pathname.split('/')[3];
        const requestBody = await req.json();
        const { child_session_id, completion_data } = requestBody;
        
        if (!parentId || !child_session_id) {
          return new Response(JSON.stringify({ error: 'Parent ID and child_session_id are required' }), {
            status: 400,
            headers: { ...headers, 'Content-Type': 'application/json' }
          });
        }
        
        const updated = updateRelationshipCompletion(parentId, child_session_id);
        
        if (updated) {
          // Broadcast completion event to WebSocket clients
          const message = JSON.stringify({ 
            type: 'child_session_completed', 
            data: {
              parent_session_id: parentId,
              child_session_id,
              completion_data,
              completed_at: Date.now()
            }
          });
          wsClients.forEach(client => {
            try {
              client.send(message);
            } catch (err) {
              wsClients.delete(client);
            }
          });
        }
        
        return new Response(JSON.stringify({ success: updated }), {
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Error marking child completed:', error);
        return new Response(JSON.stringify({ error: 'Failed to mark child completed' }), {
          status: 500,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // GET /api/relationships/stats - Get relationship statistics
    if (url.pathname === '/api/relationships/stats' && req.method === 'GET') {
      try {
        const timeRangeStart = url.searchParams.get('start');
        const timeRangeEnd = url.searchParams.get('end');
        
        let timeRange: { start: number; end: number } | undefined;
        if (timeRangeStart && timeRangeEnd) {
          timeRange = {
            start: parseInt(timeRangeStart),
            end: parseInt(timeRangeEnd)
          };
        }
        
        const stats = getRelationshipStats(timeRange);
        return new Response(JSON.stringify(stats), {
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Error getting relationship stats:', error);
        return new Response(JSON.stringify({ error: 'Failed to get relationship stats' }), {
          status: 500,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Agent Naming System routes
    const agentNamingRoutes = setupAgentNamingRoutes(server);
    
    for (const [path, methods] of Object.entries(agentNamingRoutes)) {
      // Handle exact path matches
      if (url.pathname === path) {
        const handler = methods[req.method as keyof typeof methods];
        if (handler) {
          const response = await handler(req);
          return new Response(response.body, {
            status: response.status,
            headers: { ...headers, ...Object.fromEntries(response.headers.entries()) }
          });
        }
      }
      
      // Handle parameterized paths (e.g., /api/agent-names/:cacheKey)
      if (path.includes(':')) {
        const pathPattern = path.replace(/:[^/]+/g, '[^/]+');
        const regex = new RegExp(`^${pathPattern}$`);
        if (regex.test(url.pathname)) {
          const handler = methods[req.method as keyof typeof methods];
          if (handler) {
            const response = await handler(req);
            return new Response(response.body, {
              status: response.status,
              headers: { ...headers, ...Object.fromEntries(response.headers.entries()) }
            });
          }
        }
      }
    }
    
    // Fallback System Routes
    
    // GET /api/fallback/status - Get fallback system status
    if (url.pathname === '/api/fallback/status' && req.method === 'GET') {
      try {
        const redisStatus = await redisConnectivity.getConnectionInfo();
        const storageStats = await fallbackStorage.getStorageStats();
        const syncStats = await fallbackSync.getSyncStats();
        
        return new Response(JSON.stringify({
          redis: redisStatus,
          fallback_storage: {
            enabled: fallbackStorage.isEnabled(),
            stats: storageStats
          },
          sync_service: {
            enabled: fallbackSync.getConfig().enabled,
            is_syncing: fallbackSync.isSyncInProgress(),
            stats: syncStats
          },
          overall_status: {
            mode: redisStatus.status.isConnected ? 'redis' : 'fallback',
            operational: true,
            last_update: Date.now()
          }
        }), {
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Error getting fallback status:', error);
        return new Response(JSON.stringify({ 
          error: 'Failed to get fallback status',
          details: error instanceof Error ? error.message : 'Unknown error'
        }), {
          status: 500,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // POST /api/fallback/test-redis - Test Redis connectivity
    if (url.pathname === '/api/fallback/test-redis' && req.method === 'POST') {
      try {
        const connectionStatus = await redisConnectivity.testConnection();
        const operationsTest = await redisConnectivity.testOperations();
        
        return new Response(JSON.stringify({
          connection: connectionStatus,
          operations: operationsTest,
          timestamp: Date.now()
        }), {
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Error testing Redis connectivity:', error);
        return new Response(JSON.stringify({ 
          error: 'Failed to test Redis connectivity',
          details: error instanceof Error ? error.message : 'Unknown error'
        }), {
          status: 500,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // POST /api/fallback/sync - Force sync to Redis
    if (url.pathname === '/api/fallback/sync' && req.method === 'POST') {
      try {
        if (!redisConnectivity.isConnected()) {
          return new Response(JSON.stringify({
            error: 'Redis not connected',
            message: 'Cannot sync when Redis is not available'
          }), {
            status: 400,
            headers: { ...headers, 'Content-Type': 'application/json' }
          });
        }

        const syncResult = await fallbackSync.forceSyncAll();
        
        return new Response(JSON.stringify({
          success: syncResult.success,
          operations_synced: syncResult.operations_synced,
          operations_failed: syncResult.operations_failed,
          duration_ms: syncResult.duration_ms,
          errors: syncResult.errors.length > 0 ? syncResult.errors : undefined,
          timestamp: Date.now()
        }), {
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Error forcing sync:', error);
        return new Response(JSON.stringify({ 
          error: 'Failed to force sync',
          details: error instanceof Error ? error.message : 'Unknown error'
        }), {
          status: 500,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // GET /api/agents/health - Unified metrics service health check
    if (url.pathname === '/api/agents/health' && req.method === 'GET') {
      try {
        console.log('🏥 Checking unified metrics service health...');
        
        const health = await unifiedMetricsService.getServiceHealth();
        const cacheStats = await unifiedMetricsService.getCacheStats();
        
        const response = {
          ...health,
          cache: cacheStats,
          metrics_available: health.status !== 'unhealthy',
          timestamp: Date.now()
        };
        
        console.log(`✅ Unified metrics service health: ${health.status} (SQLite: ${health.sqlite.status}, Redis: ${health.redis.status})`);
        
        const statusCode = health.status === 'unhealthy' ? 503 : 200;
        
        return new Response(JSON.stringify(response), {
          status: statusCode,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('❌ Error checking unified metrics service health:', error);
        return new Response(JSON.stringify({ 
          status: 'unhealthy',
          error: 'Health check failed',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now()
        }), {
          status: 503,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // GET /api/fallback/health - Health check endpoint
    if (url.pathname === '/api/fallback/health' && req.method === 'GET') {
      try {
        const redisConnected = redisConnectivity.isConnected();
        const fallbackEnabled = fallbackStorage.isEnabled();
        
        const health = {
          status: 'healthy',
          redis_available: redisConnected,
          fallback_enabled: fallbackEnabled,
          operational_mode: redisConnected ? 'redis' : 'fallback',
          timestamp: Date.now()
        };
        
        // If neither Redis nor fallback is working, mark as unhealthy
        let status = 200;
        if (!redisConnected && !fallbackEnabled) {
          health.status = 'unhealthy';
          status = 503;
        }
        
        return new Response(JSON.stringify(health), {
          status,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Error checking health:', error);
        return new Response(JSON.stringify({ 
          status: 'unhealthy',
          error: 'Health check failed',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now()
        }), {
          status: 503,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // GET /api/fallback/handoffs/:projectName - Get session handoffs for a project
    if (url.pathname.match(/^\/api\/fallback\/handoffs\/[^\/]+$/) && req.method === 'GET') {
      try {
        const projectName = url.pathname.split('/').pop()!;
        const handoffContent = await fallbackStorage.getLatestSessionHandoff(projectName);
        
        return new Response(JSON.stringify({
          project_name: projectName,
          handoff_content: handoffContent,
          has_content: handoffContent.length > 0,
          timestamp: Date.now()
        }), {
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Error getting session handoff:', error);
        return new Response(JSON.stringify({ 
          error: 'Failed to get session handoff',
          details: error instanceof Error ? error.message : 'Unknown error'
        }), {
          status: 500,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // POST /api/fallback/handoffs/:projectName - Save session handoff
    if (url.pathname.match(/^\/api\/fallback\/handoffs\/[^\/]+$/) && req.method === 'POST') {
      try {
        const projectName = url.pathname.split('/').pop()!;
        const body = await req.json();
        const { handoff_content, session_id, metadata } = body;
        
        if (!handoff_content) {
          return new Response(JSON.stringify({
            error: 'Missing handoff_content in request body'
          }), {
            status: 400,
            headers: { ...headers, 'Content-Type': 'application/json' }
          });
        }
        
        const success = await fallbackStorage.saveSessionHandoff(
          projectName, 
          handoff_content, 
          session_id, 
          metadata
        );
        
        if (success) {
          return new Response(JSON.stringify({
            success: true,
            message: 'Session handoff saved',
            project_name: projectName,
            timestamp: Date.now()
          }), {
            headers: { ...headers, 'Content-Type': 'application/json' }
          });
        } else {
          return new Response(JSON.stringify({
            error: 'Failed to save session handoff'
          }), {
            status: 500,
            headers: { ...headers, 'Content-Type': 'application/json' }
          });
        }
      } catch (error) {
        console.error('Error saving session handoff:', error);
        return new Response(JSON.stringify({ 
          error: 'Failed to save session handoff',
          details: error instanceof Error ? error.message : 'Unknown error'
        }), {
          status: 500,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // WebSocket upgrade
    if (url.pathname === '/stream') {
      const success = server.upgrade(req);
      if (success) {
        return undefined;
      }
    }
    
    // Default response
    return new Response('Multi-Agent Observability Server', {
      headers: { ...headers, 'Content-Type': 'text/plain' }
    });
  },
  
  websocket: {
    async open(ws) {
      console.log('WebSocket client connected');
      wsClients.add(ws);
      
      // Send recent events on connection
      // Increased from 50 to 500 to provide more context for agent detection
      const events = getRecentEvents(500);
      ws.send(JSON.stringify({ type: 'initial', data: events }));
      
      // Send current terminal status
      try {
        const terminalStatus = await getTerminalStatus();
        ws.send(JSON.stringify({ type: 'terminal_status', data: terminalStatus }));
      } catch (error) {
        console.error('Error sending terminal status on connection:', error);
      }
    },
    
    message(ws, message) {
      // Handle any client messages if needed
      console.log('Received message:', message);
    },
    
    close(ws) {
      console.log('WebSocket client disconnected');
      wsClients.delete(ws);
    },
    
    error(ws, error) {
      console.error('WebSocket error:', error);
      wsClients.delete(ws);
    }
  }
});

console.log(`🚀 Server running on http://localhost:${server.port}`);
console.log(`📊 WebSocket endpoint: ws://localhost:${server.port}/stream`);
console.log(`📮 POST events to: http://localhost:${server.port}/events`);