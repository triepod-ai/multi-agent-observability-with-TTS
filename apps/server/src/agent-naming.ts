import type { Server } from 'bun';
import { 
  getAgentName, 
  insertAgentName, 
  getSessionName, 
  insertSessionName,
  insertAgentExecution,
  updateAgentExecution,
  getAgentExecution,
  getActiveAgentExecutions,
  cleanupExpiredNames,
  type AgentName,
  type SessionName,
  type AgentExecution
} from './db';

export function setupAgentNamingRoutes(server: Server) {
  return {
    // Get agent name by cache key
    '/api/agent-names/:cacheKey': {
      GET: async (req: Request): Promise<Response> => {
        try {
          const url = new URL(req.url);
          const cacheKey = url.pathname.split('/').pop();
          
          if (!cacheKey) {
            return new Response(JSON.stringify({
              success: false,
              error: 'Cache key is required'
            }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          const agentName = getAgentName(cacheKey);
          
          if (!agentName) {
            return new Response(JSON.stringify({
              success: false,
              error: 'Agent name not found'
            }), {
              status: 404,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          return new Response(JSON.stringify({
            success: true,
            data: agentName
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
          
        } catch (error) {
          console.error('Error getting agent name:', error);
          return new Response(JSON.stringify({
            success: false,
            error: 'Internal server error'
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    },

    // Create/update agent name
    '/api/agent-names': {
      POST: async (req: Request): Promise<Response> => {
        try {
          const body = await req.json();
          
          if (!body.cache_key || !body.name || !body.agent_type) {
            return new Response(JSON.stringify({
              success: false,
              error: 'cache_key, name, and agent_type are required'
            }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          const agentName: Omit<AgentName, 'id' | 'created_at' | 'updated_at'> = {
            cache_key: body.cache_key,
            name: body.name,
            agent_type: body.agent_type,
            context: body.context,
            generation_method: body.generation_method || 'llm',
            expires_at: body.ttl ? Date.now() + (body.ttl * 1000) : undefined,
            usage_count: body.usage_count || 0,
            last_used_at: body.last_used_at,
            metadata: body.metadata ? JSON.stringify(body.metadata) : undefined
          };
          
          const success = insertAgentName(agentName);
          
          if (!success) {
            return new Response(JSON.stringify({
              success: false,
              error: 'Failed to insert agent name'
            }), {
              status: 500,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          return new Response(JSON.stringify({
            success: true,
            message: 'Agent name created successfully'
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
          
        } catch (error) {
          console.error('Error creating agent name:', error);
          return new Response(JSON.stringify({
            success: false,
            error: 'Internal server error'
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    },

    // Get session name
    '/api/session-names/:sessionId': {
      GET: async (req: Request): Promise<Response> => {
        try {
          const url = new URL(req.url);
          const sessionId = url.pathname.split('/').pop();
          
          if (!sessionId) {
            return new Response(JSON.stringify({
              success: false,
              error: 'Session ID is required'
            }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          const sessionName = getSessionName(sessionId);
          
          if (!sessionName) {
            return new Response(JSON.stringify({
              success: false,
              error: 'Session name not found'
            }), {
              status: 404,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          return new Response(JSON.stringify({
            success: true,
            data: sessionName
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
          
        } catch (error) {
          console.error('Error getting session name:', error);
          return new Response(JSON.stringify({
            success: false,
            error: 'Internal server error'
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    },

    // Create session name
    '/api/session-names': {
      POST: async (req: Request): Promise<Response> => {
        try {
          const body = await req.json();
          
          if (!body.session_id || !body.name || !body.session_type) {
            return new Response(JSON.stringify({
              success: false,
              error: 'session_id, name, and session_type are required'
            }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          const sessionName: Omit<SessionName, 'id' | 'created_at' | 'updated_at'> = {
            session_id: body.session_id,
            name: body.name,
            session_type: body.session_type,
            agent_count: body.agent_count || 1,
            context: body.context,
            generation_method: body.generation_method || 'llm',
            metadata: body.metadata ? JSON.stringify(body.metadata) : undefined
          };
          
          const success = insertSessionName(sessionName);
          
          if (!success) {
            return new Response(JSON.stringify({
              success: false,
              error: 'Failed to insert session name'
            }), {
              status: 500,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          return new Response(JSON.stringify({
            success: true,
            message: 'Session name created successfully'
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
          
        } catch (error) {
          console.error('Error creating session name:', error);
          return new Response(JSON.stringify({
            success: false,
            error: 'Internal server error'
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    },

    // Agent executions endpoint
    '/api/agent-executions': {
      POST: async (req: Request): Promise<Response> => {
        try {
          const body = await req.json();
          
          if (!body.agent_id || !body.session_id || !body.display_name || !body.agent_type) {
            return new Response(JSON.stringify({
              success: false,
              error: 'agent_id, session_id, display_name, and agent_type are required'
            }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          const execution: Omit<AgentExecution, 'id' | 'created_at' | 'updated_at'> = {
            agent_id: body.agent_id,
            session_id: body.session_id,
            display_name: body.display_name,
            agent_type: body.agent_type,
            status: body.status || 'pending',
            task_description: body.task_description,
            context: body.context,
            start_time: body.start_time || Date.now(),
            end_time: body.end_time,
            duration_ms: body.duration_ms,
            token_usage: body.token_usage || 0,
            estimated_cost: body.estimated_cost || 0.0,
            tools_used: body.tools_used ? JSON.stringify(body.tools_used) : undefined,
            success_indicators: body.success_indicators ? JSON.stringify(body.success_indicators) : undefined,
            performance_metrics: body.performance_metrics ? JSON.stringify(body.performance_metrics) : undefined,
            error_info: body.error_info ? JSON.stringify(body.error_info) : undefined
          };
          
          const success = insertAgentExecution(execution);
          
          if (!success) {
            return new Response(JSON.stringify({
              success: false,
              error: 'Failed to create agent execution'
            }), {
              status: 500,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          return new Response(JSON.stringify({
            success: true,
            message: 'Agent execution created successfully'
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
          
        } catch (error) {
          console.error('Error creating agent execution:', error);
          return new Response(JSON.stringify({
            success: false,
            error: 'Internal server error'
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      },
      
      GET: async (req: Request): Promise<Response> => {
        try {
          const activeExecutions = getActiveAgentExecutions();
          
          return new Response(JSON.stringify({
            success: true,
            data: activeExecutions
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
          
        } catch (error) {
          console.error('Error getting active executions:', error);
          return new Response(JSON.stringify({
            success: false,
            error: 'Internal server error'
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    },

    // Update agent execution
    '/api/agent-executions/:agentId': {
      PUT: async (req: Request): Promise<Response> => {
        try {
          const url = new URL(req.url);
          const agentId = url.pathname.split('/').pop();
          
          if (!agentId) {
            return new Response(JSON.stringify({
              success: false,
              error: 'Agent ID is required'
            }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          const body = await req.json();
          
          // Process JSON fields
          const updates: Partial<AgentExecution> = { ...body };
          if (body.tools_used && Array.isArray(body.tools_used)) {
            updates.tools_used = JSON.stringify(body.tools_used);
          }
          if (body.success_indicators && Array.isArray(body.success_indicators)) {
            updates.success_indicators = JSON.stringify(body.success_indicators);
          }
          if (body.performance_metrics && typeof body.performance_metrics === 'object') {
            updates.performance_metrics = JSON.stringify(body.performance_metrics);
          }
          if (body.error_info && typeof body.error_info === 'object') {
            updates.error_info = JSON.stringify(body.error_info);
          }
          
          const success = updateAgentExecution(agentId, updates);
          
          if (!success) {
            return new Response(JSON.stringify({
              success: false,
              error: 'Failed to update agent execution or agent not found'
            }), {
              status: 404,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          return new Response(JSON.stringify({
            success: true,
            message: 'Agent execution updated successfully'
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
          
        } catch (error) {
          console.error('Error updating agent execution:', error);
          return new Response(JSON.stringify({
            success: false,
            error: 'Internal server error'
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      },
      
      GET: async (req: Request): Promise<Response> => {
        try {
          const url = new URL(req.url);
          const agentId = url.pathname.split('/').pop();
          
          if (!agentId) {
            return new Response(JSON.stringify({
              success: false,
              error: 'Agent ID is required'
            }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          const execution = getAgentExecution(agentId);
          
          if (!execution) {
            return new Response(JSON.stringify({
              success: false,
              error: 'Agent execution not found'
            }), {
              status: 404,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          // Parse JSON fields for response
          const response = { ...execution };
          if (execution.tools_used) {
            try {
              response.tools_used = JSON.parse(execution.tools_used);
            } catch (e) {
              // Keep as string if not valid JSON
            }
          }
          if (execution.success_indicators) {
            try {
              response.success_indicators = JSON.parse(execution.success_indicators);
            } catch (e) {
              // Keep as string if not valid JSON
            }
          }
          if (execution.performance_metrics) {
            try {
              response.performance_metrics = JSON.parse(execution.performance_metrics);
            } catch (e) {
              // Keep as string if not valid JSON
            }
          }
          if (execution.error_info) {
            try {
              response.error_info = JSON.parse(execution.error_info);
            } catch (e) {
              // Keep as string if not valid JSON
            }
          }
          
          return new Response(JSON.stringify({
            success: true,
            data: response
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
          
        } catch (error) {
          console.error('Error getting agent execution:', error);
          return new Response(JSON.stringify({
            success: false,
            error: 'Internal server error'
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    },

    // Cleanup expired names
    '/api/agent-names/cleanup': {
      POST: async (req: Request): Response => {
        try {
          const cleaned = cleanupExpiredNames();
          
          return new Response(JSON.stringify({
            success: true,
            message: `Cleaned up ${cleaned} expired names`
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
          
        } catch (error) {
          console.error('Error cleaning up expired names:', error);
          return new Response(JSON.stringify({
            success: false,
            error: 'Internal server error'
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    }
  };
}