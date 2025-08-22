import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { 
  SessionRelationship, 
  SessionTreeNode, 
  SessionRelationshipStats,
  RelationshipWebSocketEvent 
} from '../types';

export function useSessionRelationships() {
  // Reactive state
  const relationships = ref<SessionRelationship[]>([]);
  const sessionTree = ref<SessionTreeNode | null>(null);
  const sessionTrees = ref<Map<string, SessionTreeNode>>(new Map());
  const relationshipStats = ref<SessionRelationshipStats>({
    total_sessions: 0,
    sessions_by_type: {},
    average_depth: 0,
    max_depth: 0,
    common_spawn_reasons: [],
    parent_child_ratio: 0,
    completion_rate: 0
  });
  
  const loading = ref(false);
  const error = ref<string | null>(null);
  
  // WebSocket connection for real-time updates
  let ws: WebSocket | null = null;
  let reconnectTimeout: number | null = null;
  
  // API endpoints
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

  // Fetch relationships for a specific session
  async function fetchRelationships(sessionId: string): Promise<SessionRelationship[]> {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await fetch(`${API_BASE}/sessions/${sessionId}/relationships`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch relationships: ${response.statusText}`);
      }
      
      const data = await response.json();
      relationships.value = data.relationships || [];
      
      return relationships.value;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch relationships';
      error.value = message;
      console.error('Error fetching relationships:', err);
      return [];
    } finally {
      loading.value = false;
    }
  }

  // Fetch complete session tree for a specific session
  async function fetchSessionTree(sessionId: string): Promise<SessionTreeNode | null> {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await fetch(`${API_BASE}/sessions/${sessionId}/tree`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch session tree: ${response.statusText}`);
      }
      
      const data = await response.json();
      const tree = data.tree ? enhanceTreeNode(data.tree) : null;
      
      if (tree) {
        sessionTree.value = tree;
        sessionTrees.value.set(sessionId, tree);
      }
      
      return tree;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch session tree';
      error.value = message;
      console.error('Error fetching session tree:', err);
      return null;
    } finally {
      loading.value = false;
    }
  }

  // Fetch children for a specific parent session
  async function fetchChildren(parentId: string): Promise<SessionTreeNode[]> {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await fetch(`${API_BASE}/sessions/${parentId}/children`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch children: ${response.statusText}`);
      }
      
      const data = await response.json();
      return (data.children || []).map((child: any) => enhanceTreeNode(child));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch children';
      error.value = message;
      console.error('Error fetching children:', err);
      return [];
    } finally {
      loading.value = false;
    }
  }

  // Fetch relationship statistics
  async function fetchRelationshipStats(): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/relationships/stats`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.statusText}`);
      }
      
      const data = await response.json();
      relationshipStats.value = data.stats || relationshipStats.value;
    } catch (err) {
      console.error('Error fetching relationship stats:', err);
    }
  }

  // Enhance tree node with UI state and computed properties
  function enhanceTreeNode(node: any): SessionTreeNode {
    const enhanced: SessionTreeNode = {
      session_id: node.session_id,
      session_type: node.session_type || 'main',
      relationship_type: node.relationship_type,
      spawn_reason: node.spawn_reason,
      agent_name: node.agent_name,
      start_time: node.start_time,
      end_time: node.end_time,
      duration_ms: node.duration_ms,
      status: determineStatus(node),
      depth: node.depth || 0,
      path: node.path || node.session_id,
      children: (node.children || []).map(enhanceTreeNode),
      expanded: false, // Default to collapsed
      token_usage: node.token_usage,
      tool_count: node.tool_count,
      error_count: node.error_count
    };

    return enhanced;
  }

  // Determine session status based on available data
  function determineStatus(node: any): 'active' | 'completed' | 'failed' | 'timeout' {
    if (node.error_count && node.error_count > 0) return 'failed';
    if (node.end_time) {
      const duration = node.end_time - node.start_time;
      if (duration > 300000) return 'timeout'; // > 5 minutes
      return 'completed';
    }
    return 'active';
  }

  // WebSocket subscription for real-time updates
  function subscribeToRelationshipUpdates(): void {
    const wsUrl = (import.meta.env.VITE_WS_URL || 'ws://localhost:4000').replace('/api', '') + '/stream';
    
    try {
      ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('Session relationship WebSocket connected');
        error.value = null;
      };
      
      ws.onmessage = (event) => {
        try {
          const message: RelationshipWebSocketEvent = JSON.parse(event.data);
          handleRealtimeUpdate(message);
        } catch (err) {
          console.error('Failed to parse relationship WebSocket message:', err);
        }
      };
      
      ws.onerror = (err) => {
        console.error('Session relationship WebSocket error:', err);
        error.value = 'WebSocket connection error';
      };
      
      ws.onclose = () => {
        console.log('Session relationship WebSocket disconnected');
        
        // Attempt to reconnect after 3 seconds
        reconnectTimeout = window.setTimeout(() => {
          console.log('Attempting to reconnect relationship WebSocket...');
          subscribeToRelationshipUpdates();
        }, 3000);
      };
    } catch (err) {
      console.error('Failed to connect to relationship WebSocket:', err);
      error.value = 'Failed to connect to server';
    }
  }

  // Handle real-time WebSocket updates
  function handleRealtimeUpdate(message: RelationshipWebSocketEvent): void {
    switch (message.type) {
      case 'session_spawn':
        handleSessionSpawn(message);
        break;
      case 'child_session_completed':
        handleChildSessionCompleted(message);
        break;
      case 'session_failed':
        handleSessionFailed(message);
        break;
      case 'session_timeout':
        handleSessionTimeout(message);
        break;
    }
    
    // Refresh stats
    fetchRelationshipStats();
  }

  // Handle session spawn event
  function handleSessionSpawn(message: RelationshipWebSocketEvent): void {
    if (!message.parent_session_id) return;
    
    const parentTree = sessionTrees.value.get(message.parent_session_id);
    if (parentTree) {
      // Add pending child to tree
      const newChild: SessionTreeNode = {
        session_id: message.session_id,
        session_type: 'subagent',
        relationship_type: message.relationship_type || 'spawn',
        spawn_reason: message.spawn_reason,
        agent_name: 'Spawning...',
        start_time: message.timestamp,
        status: 'active',
        depth: parentTree.depth + 1,
        path: `${parentTree.path}/${message.session_id}`,
        children: [],
        expanded: false
      };
      
      // Find parent node and add child
      addChildToTree(parentTree, message.parent_session_id, newChild);
    }
  }

  // Handle child session completion
  function handleChildSessionCompleted(message: RelationshipWebSocketEvent): void {
    sessionTrees.value.forEach((tree) => {
      updateNodeInTree(tree, message.session_id, {
        status: 'completed',
        end_time: message.timestamp,
        duration_ms: message.data?.duration_ms,
        token_usage: message.data?.token_usage,
        tool_count: message.data?.tool_count
      });
    });
  }

  // Handle session failure
  function handleSessionFailed(message: RelationshipWebSocketEvent): void {
    sessionTrees.value.forEach((tree) => {
      updateNodeInTree(tree, message.session_id, {
        status: 'failed',
        end_time: message.timestamp,
        error_count: message.data?.error_count || 1
      });
    });
  }

  // Handle session timeout
  function handleSessionTimeout(message: RelationshipWebSocketEvent): void {
    sessionTrees.value.forEach((tree) => {
      updateNodeInTree(tree, message.session_id, {
        status: 'timeout',
        end_time: message.timestamp
      });
    });
  }

  // Recursively add child to tree
  function addChildToTree(node: SessionTreeNode, parentId: string, child: SessionTreeNode): boolean {
    if (node.session_id === parentId) {
      node.children.push(child);
      node.expanded = true; // Auto-expand when new child added
      return true;
    }
    
    for (const childNode of node.children) {
      if (addChildToTree(childNode, parentId, child)) {
        return true;
      }
    }
    
    return false;
  }

  // Recursively update node in tree
  function updateNodeInTree(node: SessionTreeNode, sessionId: string, updates: Partial<SessionTreeNode>): boolean {
    if (node.session_id === sessionId) {
      Object.assign(node, updates);
      return true;
    }
    
    for (const child of node.children) {
      if (updateNodeInTree(child, sessionId, updates)) {
        return true;
      }
    }
    
    return false;
  }

  // Tree manipulation helpers
  function toggleNodeExpansion(sessionId: string): void {
    sessionTrees.value.forEach((tree) => {
      toggleNodeInTree(tree, sessionId);
    });
  }

  function toggleNodeInTree(node: SessionTreeNode, sessionId: string): boolean {
    if (node.session_id === sessionId) {
      node.expanded = !node.expanded;
      return true;
    }
    
    for (const child of node.children) {
      if (toggleNodeInTree(child, sessionId)) {
        return true;
      }
    }
    
    return false;
  }

  // Expand all nodes in tree
  function expandAll(): void {
    if (sessionTree.value) {
      expandAllInTree(sessionTree.value);
    }
  }

  function expandAllInTree(node: SessionTreeNode): void {
    node.expanded = true;
    node.children.forEach(expandAllInTree);
  }

  // Collapse all nodes in tree
  function collapseAll(): void {
    if (sessionTree.value) {
      collapseAllInTree(sessionTree.value);
    }
  }

  function collapseAllInTree(node: SessionTreeNode): void {
    node.expanded = false;
    node.children.forEach(collapseAllInTree);
  }

  // Computed properties
  const flattenedNodes = computed((): SessionTreeNode[] => {
    if (!sessionTree.value) return [];
    
    const nodes: SessionTreeNode[] = [];
    
    function traverse(node: SessionTreeNode): void {
      nodes.push(node);
      if (node.expanded) {
        node.children.forEach(traverse);
      }
    }
    
    traverse(sessionTree.value);
    return nodes;
  });

  const treeStats = computed(() => {
    if (!sessionTree.value) return { totalNodes: 0, visibleNodes: 0, maxDepth: 0 };
    
    let totalNodes = 0;
    let maxDepth = 0;
    
    function countNodes(node: SessionTreeNode): void {
      totalNodes++;
      maxDepth = Math.max(maxDepth, node.depth);
      node.children.forEach(countNodes);
    }
    
    countNodes(sessionTree.value);
    
    return {
      totalNodes,
      visibleNodes: flattenedNodes.value.length,
      maxDepth
    };
  });

  // Cleanup function
  function disconnect(): void {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    
    if (ws) {
      ws.close();
      ws = null;
    }
  }

  // Lifecycle hooks
  onMounted(() => {
    subscribeToRelationshipUpdates();
    fetchRelationshipStats();
  });

  onUnmounted(() => {
    disconnect();
  });

  return {
    // State
    relationships,
    sessionTree,
    sessionTrees,
    relationshipStats,
    loading,
    error,
    
    // Computed
    flattenedNodes,
    treeStats,
    
    // Methods
    fetchRelationships,
    fetchSessionTree,
    fetchChildren,
    fetchRelationshipStats,
    subscribeToRelationshipUpdates,
    toggleNodeExpansion,
    expandAll,
    collapseAll,
    disconnect
  };
}