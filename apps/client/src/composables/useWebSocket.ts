import { ref, onMounted, onUnmounted } from 'vue';
import type { HookEvent, WebSocketMessage, TerminalStatusData, AgentStatus, HookCoverageData } from '../types';

export function useWebSocket(url: string) {
  const events = ref<HookEvent[]>([]);
  const isConnected = ref(false);
  const error = ref<string | null>(null);
  const terminalStatus = ref<TerminalStatusData | null>(null);
  const hookCoverage = ref<HookCoverageData | null>(null);
  
  let ws: WebSocket | null = null;
  let reconnectTimeout: number | null = null;
  
  // Get max events from environment variable or use default
  const maxEvents = parseInt(import.meta.env.VITE_MAX_EVENTS_TO_DISPLAY || '100');
  
  const connect = () => {
    try {
      ws = new WebSocket(url);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        isConnected.value = true;
        error.value = null;
      };
      
      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          if (message.type === 'initial') {
            const initialEvents = Array.isArray(message.data) ? message.data : [];
            // Only keep the most recent events up to maxEvents
            events.value = initialEvents.slice(-maxEvents);
          } else if (message.type === 'event') {
            const newEvent = message.data as HookEvent;
            events.value.push(newEvent);
            
            // Limit events array to maxEvents, removing the oldest when exceeded
            if (events.value.length > maxEvents) {
              // Remove the oldest events (first 10) when limit is exceeded
              events.value = events.value.slice(events.value.length - maxEvents + 10);
            }
          } else if (message.type === 'terminal_status') {
            terminalStatus.value = message.data as TerminalStatusData;
          } else if (message.type === 'agent_status_update') {
            handleAgentStatusUpdate(message.data as AgentStatus);
          } else if (message.type === 'hook_status_update') {
            hookCoverage.value = message.data as HookCoverageData;
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };
      
      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        error.value = 'WebSocket connection error';
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected');
        isConnected.value = false;
        
        // Attempt to reconnect after 3 seconds
        reconnectTimeout = window.setTimeout(() => {
          console.log('Attempting to reconnect...');
          connect();
        }, 3000);
      };
    } catch (err) {
      console.error('Failed to connect:', err);
      error.value = 'Failed to connect to server';
    }
  };
  
  const disconnect = () => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    
    if (ws) {
      ws.close();
      ws = null;
    }
  };
  
  onMounted(() => {
    connect();
  });
  
  onUnmounted(() => {
    disconnect();
  });
  
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
  
  return {
    events,
    isConnected,
    error,
    terminalStatus,
    hookCoverage
  };
}