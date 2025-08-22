import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { AgentStatus, TerminalStatusData, WebSocketMessage } from '../types';

export function useTerminalStatus(wsUrl: string) {
  const terminalStatus = ref<TerminalStatusData | null>(null);
  const isConnected = ref(false);
  const error = ref<string | null>(null);
  
  let ws: WebSocket | null = null;
  let reconnectTimeout: number | null = null;
  let heartbeatInterval: number | null = null;
  
  const connect = () => {
    try {
      ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('Terminal Status WebSocket connected');
        isConnected.value = true;
        error.value = null;
        
        // Start heartbeat to keep connection alive
        heartbeatInterval = window.setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000); // Ping every 30 seconds
        
        // Request initial terminal status
        requestTerminalStatus();
      };
      
      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          if (message.type === 'terminal_status') {
            terminalStatus.value = message.data as TerminalStatusData;
          } else if (message.type === 'agent_status_update') {
            handleAgentStatusUpdate(message.data as AgentStatus);
          }
        } catch (err) {
          console.error('Failed to parse terminal status WebSocket message:', err);
        }
      };
      
      ws.onerror = (err) => {
        console.error('Terminal Status WebSocket error:', err);
        error.value = 'Terminal status connection error';
      };
      
      ws.onclose = () => {
        console.log('Terminal Status WebSocket disconnected');
        isConnected.value = false;
        
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
        
        // Attempt to reconnect after 3 seconds
        reconnectTimeout = window.setTimeout(() => {
          console.log('Attempting to reconnect terminal status...');
          connect();
        }, 3000);
      };
    } catch (err) {
      console.error('Failed to connect terminal status:', err);
      error.value = 'Failed to connect to terminal status';
    }
  };
  
  const disconnect = () => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
    
    if (ws) {
      ws.close();
      ws = null;
    }
  };
  
  const requestTerminalStatus = () => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'get_terminal_status' }));
    }
  };
  
  const handleAgentStatusUpdate = (agentStatus: AgentStatus) => {
    if (!terminalStatus.value) {
      terminalStatus.value = {
        active_agents: [],
        recent_completions: [],
        timestamp: Date.now()
      };
    }
    
    const currentStatus = terminalStatus.value;
    
    if (agentStatus.status === 'complete' || agentStatus.status === 'failed') {
      // Move from active to recent completions
      currentStatus.active_agents = currentStatus.active_agents.filter(
        agent => agent.agent_id !== agentStatus.agent_id
      );
      
      // Add to recent completions (keep only last 10)
      currentStatus.recent_completions = [
        agentStatus,
        ...currentStatus.recent_completions.filter(
          agent => agent.agent_id !== agentStatus.agent_id
        )
      ].slice(0, 10);
    } else {
      // Update or add to active agents
      const existingIndex = currentStatus.active_agents.findIndex(
        agent => agent.agent_id === agentStatus.agent_id
      );
      
      if (existingIndex >= 0) {
        currentStatus.active_agents[existingIndex] = agentStatus;
      } else {
        currentStatus.active_agents.push(agentStatus);
      }
      
      // Sort active agents by start time (newest first)
      currentStatus.active_agents.sort((a, b) => b.start_time - a.start_time);
    }
    
    currentStatus.timestamp = Date.now();
  };
  
  // Computed properties for easy access
  const activeAgents = computed(() => 
    terminalStatus.value?.active_agents || []
  );
  
  const recentCompletions = computed(() => 
    terminalStatus.value?.recent_completions || []
  );
  
  const totalActiveAgents = computed(() => 
    activeAgents.value.length
  );
  
  const totalCompletionsToday = computed(() => {
    const today = new Date().toDateString();
    return recentCompletions.value.filter(agent => {
      const agentDate = new Date(agent.start_time).toDateString();
      return agentDate === today;
    }).length;
  });
  
  const hasActivity = computed(() => 
    totalActiveAgents.value > 0 || recentCompletions.value.length > 0
  );
  
  // Agent type statistics
  const agentTypeStats = computed(() => {
    const stats: Record<string, { active: number; completed: number; color: string }> = {};
    
    activeAgents.value.forEach(agent => {
      if (!stats[agent.agent_type]) {
        stats[agent.agent_type] = { active: 0, completed: 0, color: '#6B7280' };
      }
      stats[agent.agent_type].active++;
    });
    
    recentCompletions.value.forEach(agent => {
      if (!stats[agent.agent_type]) {
        stats[agent.agent_type] = { active: 0, completed: 0, color: '#6B7280' };
      }
      stats[agent.agent_type].completed++;
    });
    
    return stats;
  });
  
  // Performance metrics
  const performanceMetrics = computed(() => {
    const completedAgents = recentCompletions.value.filter(
      agent => agent.duration_ms !== undefined
    );
    
    if (completedAgents.length === 0) {
      return {
        averageDuration: 0,
        totalOperations: 0,
        successRate: 0
      };
    }
    
    const totalDuration = completedAgents.reduce(
      (sum, agent) => sum + (agent.duration_ms || 0), 
      0
    );
    
    const successfulAgents = completedAgents.filter(
      agent => agent.status === 'complete'
    );
    
    return {
      averageDuration: Math.round(totalDuration / completedAgents.length),
      totalOperations: completedAgents.length,
      successRate: Math.round((successfulAgents.length / completedAgents.length) * 100)
    };
  });
  
  // Auto-connect when composable is used
  onMounted(() => {
    connect();
  });
  
  onUnmounted(() => {
    disconnect();
  });
  
  return {
    // State
    terminalStatus,
    isConnected,
    error,
    
    // Computed data
    activeAgents,
    recentCompletions,
    totalActiveAgents,
    totalCompletionsToday,
    hasActivity,
    agentTypeStats,
    performanceMetrics,
    
    // Methods
    connect,
    disconnect,
    requestTerminalStatus
  };
}