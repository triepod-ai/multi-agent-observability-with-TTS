import { ref, computed, reactive } from 'vue';
import { useEducationalMode } from './useEducationalMode';
import type { HookFlowStep } from '../types';

interface FlowConnection {
  from: string;
  to: string;
  type: 'sequential' | 'conditional' | 'parallel';
  label?: string;
  strength: number;
}

interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ZoomPoint {
  x: number;
  y: number;
}

export function useFlowDiagram() {
  // Composables
  const { getHookFlowSteps, getHookColor } = useEducationalMode();
  
  // Reactive state
  const zoom = ref(1.0);
  const selectedNodeId = ref<string | null>(null);
  const hoveredNodeId = ref<string | null>(null);
  const isSimulating = ref(false);
  const currentSimulationStep = ref(-1);
  const simulationSpeed = ref(1000); // milliseconds
  
  const viewBox = reactive<ViewBox>({
    x: -100,
    y: -50,
    width: 1200,
    height: 700
  });

  // Initialize nodes with optimized layout
  const nodes = ref<HookFlowStep[]>([]);
  const connections = ref<FlowConnection[]>([]);

  const initializeLayout = () => {
    const hookSteps = getHookFlowSteps();
    
    // Create a more sophisticated layout
    const layoutConfig = {
      rows: 2,
      cols: 4,
      nodeSpacing: { x: 250, y: 200 },
      startPosition: { x: 150, y: 150 }
    };

    // Position nodes in a grid with some organic variation
    nodes.value = hookSteps.map((step, index) => {
      const row = Math.floor(index / layoutConfig.cols);
      const col = index % layoutConfig.cols;
      
      // Add some organic positioning variation
      const variance = {
        x: (Math.random() - 0.5) * 40,
        y: (Math.random() - 0.5) * 30
      };
      
      return {
        ...step,
        position: {
          x: layoutConfig.startPosition.x + (col * layoutConfig.nodeSpacing.x) + variance.x,
          y: layoutConfig.startPosition.y + (row * layoutConfig.nodeSpacing.y) + variance.y
        }
      };
    });

    // Create connections based on flow sequence
    connections.value = [];
    for (let i = 0; i < nodes.value.length - 1; i++) {
      const currentNode = nodes.value[i];
      const nextNode = nodes.value[i + 1];
      
      connections.value.push({
        from: currentNode.id,
        to: nextNode.id,
        type: getConnectionType(currentNode.id, nextNode.id),
        strength: 0.8
      });
    }

    // Add some conditional connections
    addConditionalConnections();
  };

  const getConnectionType = (fromId: string, toId: string): 'sequential' | 'conditional' | 'parallel' => {
    // Special connection types based on hook relationships
    const conditionalPairs = [
      ['pre_tool_use', 'post_tool_use'],
      ['user_prompt_submit', 'notification'],
      ['stop', 'precompact']
    ];

    const parallelPairs = [
      ['post_tool_use', 'subagent_stop']
    ];

    if (conditionalPairs.some(([from, to]) => fromId === from && toId === to)) {
      return 'conditional';
    }
    
    if (parallelPairs.some(([from, to]) => fromId === from && toId === to)) {
      return 'parallel';
    }
    
    return 'sequential';
  };

  const addConditionalConnections = () => {
    // Add some additional logical connections
    const additionalConnections: Array<[string, string]> = [
      ['notification', 'user_prompt_submit'], // User response to notification
      ['precompact', 'session_start'], // Session continuity
      ['subagent_stop', 'stop'] // Subagent completion leads to session end
    ];

    additionalConnections.forEach(([from, to]) => {
      const fromNode = nodes.value.find(n => n.id === from);
      const toNode = nodes.value.find(n => n.id === to);
      
      if (fromNode && toNode) {
        connections.value.push({
          from,
          to,
          type: 'conditional',
          strength: 0.5
        });
      }
    });
  };

  // Zoom and pan functionality
  const zoomIn = (point?: ZoomPoint) => {
    const newZoom = Math.min(3.0, zoom.value * 1.2);
    updateViewBox(newZoom, point);
  };

  const zoomOut = (point?: ZoomPoint) => {
    const newZoom = Math.max(0.3, zoom.value * 0.8);
    updateViewBox(newZoom, point);
  };

  const updateViewBox = (newZoom: number, point?: ZoomPoint) => {
    if (point) {
      // Zoom towards a specific point
      const zoomRatio = newZoom / zoom.value;
      const centerX = viewBox.x + (viewBox.width / 2);
      const centerY = viewBox.y + (viewBox.height / 2);
      
      const targetX = point.x * viewBox.width + viewBox.x;
      const targetY = point.y * viewBox.height + viewBox.y;
      
      const newWidth = viewBox.width / zoomRatio;
      const newHeight = viewBox.height / zoomRatio;
      
      viewBox.x = targetX - (newWidth * point.x);
      viewBox.y = targetY - (newHeight * point.y);
      viewBox.width = newWidth;
      viewBox.height = newHeight;
    } else {
      // Zoom towards center
      const zoomRatio = newZoom / zoom.value;
      const centerX = viewBox.x + (viewBox.width / 2);
      const centerY = viewBox.y + (viewBox.height / 2);
      
      const newWidth = viewBox.width / zoomRatio;
      const newHeight = viewBox.height / zoomRatio;
      
      viewBox.x = centerX - (newWidth / 2);
      viewBox.y = centerY - (newHeight / 2);
      viewBox.width = newWidth;
      viewBox.height = newHeight;
    }
    
    zoom.value = newZoom;
  };

  const resetView = () => {
    zoom.value = 1.0;
    viewBox.x = -100;
    viewBox.y = -50;
    viewBox.width = 1200;
    viewBox.height = 700;
    selectedNodeId.value = null;
    hoveredNodeId.value = null;
  };

  // Node selection
  const selectNode = (nodeId: string) => {
    selectedNodeId.value = nodeId === selectedNodeId.value ? null : nodeId;
  };

  const deselectNode = () => {
    selectedNodeId.value = null;
  };

  // Animation controls
  let simulationTimer: number | null = null;

  const startSimulation = () => {
    if (isSimulating.value) return;
    
    isSimulating.value = true;
    currentSimulationStep.value = 0;
    
    const animateStep = () => {
      if (!isSimulating.value || currentSimulationStep.value >= nodes.value.length) {
        stopSimulation();
        return;
      }
      
      // Activate current node
      const currentNode = nodes.value[currentSimulationStep.value];
      if (currentNode) {
        currentNode.isActive = true;
        
        // Deactivate previous node after delay
        setTimeout(() => {
          if (currentSimulationStep.value > 0) {
            const prevNode = nodes.value[currentSimulationStep.value - 1];
            if (prevNode) {
              prevNode.isActive = false;
            }
          }
        }, simulationSpeed.value * 0.6);
      }
      
      currentSimulationStep.value++;
      
      simulationTimer = window.setTimeout(animateStep, simulationSpeed.value);
    };
    
    animateStep();
  };

  const stopSimulation = () => {
    isSimulating.value = false;
    currentSimulationStep.value = -1;
    
    if (simulationTimer) {
      clearTimeout(simulationTimer);
      simulationTimer = null;
    }
    
    // Reset all node states
    nodes.value.forEach(node => {
      node.isActive = false;
    });
  };

  const pauseSimulation = () => {
    if (simulationTimer) {
      clearTimeout(simulationTimer);
      simulationTimer = null;
    }
  };

  const resumeSimulation = () => {
    if (isSimulating.value && !simulationTimer) {
      startSimulation();
    }
  };

  // Layout algorithms
  const applyForceDirectedLayout = () => {
    // Simple force-directed layout implementation
    const iterations = 100;
    const repulsion = 8000;
    const attraction = 0.1;
    const damping = 0.9;
    
    for (let iter = 0; iter < iterations; iter++) {
      const forces = new Map<string, { x: number; y: number }>();
      
      // Initialize forces
      nodes.value.forEach(node => {
        forces.set(node.id, { x: 0, y: 0 });
      });
      
      // Calculate repulsion forces between all nodes
      nodes.value.forEach(nodeA => {
        nodes.value.forEach(nodeB => {
          if (nodeA.id === nodeB.id) return;
          
          const dx = nodeA.position.x - nodeB.position.x;
          const dy = nodeA.position.y - nodeB.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 0) {
            const force = repulsion / (distance * distance);
            const fx = (dx / distance) * force;
            const fy = (dy / distance) * force;
            
            const nodeForce = forces.get(nodeA.id)!;
            nodeForce.x += fx;
            nodeForce.y += fy;
          }
        });
      });
      
      // Calculate attraction forces for connected nodes
      connections.value.forEach(connection => {
        const nodeA = nodes.value.find(n => n.id === connection.from);
        const nodeB = nodes.value.find(n => n.id === connection.to);
        
        if (nodeA && nodeB) {
          const dx = nodeB.position.x - nodeA.position.x;
          const dy = nodeB.position.y - nodeA.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 0) {
            const force = attraction * distance;
            const fx = (dx / distance) * force;
            const fy = (dy / distance) * force;
            
            const forceA = forces.get(nodeA.id)!;
            const forceB = forces.get(nodeB.id)!;
            forceA.x += fx;
            forceA.y += fy;
            forceB.x -= fx;
            forceB.y -= fy;
          }
        }
      });
      
      // Apply forces to node positions
      nodes.value.forEach(node => {
        const force = forces.get(node.id)!;
        node.position.x += force.x * damping;
        node.position.y += force.y * damping;
        
        // Keep nodes within bounds
        node.position.x = Math.max(50, Math.min(1100, node.position.x));
        node.position.y = Math.max(50, Math.min(550, node.position.y));
      });
    }
  };

  const applyCircularLayout = () => {
    const centerX = 600;
    const centerY = 350;
    const radius = 200;
    const angleStep = (2 * Math.PI) / nodes.value.length;
    
    nodes.value.forEach((node, index) => {
      const angle = index * angleStep;
      node.position.x = centerX + Math.cos(angle) * radius;
      node.position.y = centerY + Math.sin(angle) * radius;
    });
  };

  const applyHierarchicalLayout = () => {
    // Group nodes by their flow position for hierarchical layout
    const levels = new Map<number, HookFlowStep[]>();
    
    nodes.value.forEach(node => {
      const hookExplanation = getHookExplanation(node.id);
      const level = hookExplanation?.flowPosition || 1;
      
      if (!levels.has(level)) {
        levels.set(level, []);
      }
      levels.get(level)!.push(node);
    });
    
    // Position nodes by levels
    let currentY = 100;
    const levelHeight = 150;
    const nodeSpacing = 200;
    
    Array.from(levels.entries())
      .sort(([a], [b]) => a - b)
      .forEach(([level, levelNodes]) => {
        const startX = (1200 - (levelNodes.length - 1) * nodeSpacing) / 2;
        
        levelNodes.forEach((node, index) => {
          node.position.x = startX + index * nodeSpacing;
          node.position.y = currentY;
        });
        
        currentY += levelHeight;
      });
  };

  // Performance optimization
  const visibleNodes = computed(() => {
    // Only return nodes that are in the current viewport
    return nodes.value.filter(node => {
      const nodeRight = node.position.x + 120;
      const nodeBottom = node.position.y + 60;
      
      return !(
        node.position.x > viewBox.x + viewBox.width ||
        nodeRight < viewBox.x ||
        node.position.y > viewBox.y + viewBox.height ||
        nodeBottom < viewBox.y
      );
    });
  });

  const visibleConnections = computed(() => {
    const visibleNodeIds = new Set(visibleNodes.value.map(n => n.id));
    return connections.value.filter(conn =>
      visibleNodeIds.has(conn.from) && visibleNodeIds.has(conn.to)
    );
  });

  // Helper to get hook explanation (for backward compatibility)
  const { getHookExplanation } = useEducationalMode();

  // Initialize layout on creation
  initializeLayout();

  return {
    // State
    nodes,
    connections,
    zoom,
    viewBox,
    selectedNodeId,
    hoveredNodeId,
    isSimulating,
    currentSimulationStep,
    simulationSpeed,
    
    // Computed
    visibleNodes,
    visibleConnections,
    
    // Methods
    zoomIn,
    zoomOut,
    updateViewBox,
    resetView,
    selectNode,
    deselectNode,
    startSimulation,
    stopSimulation,
    pauseSimulation,
    resumeSimulation,
    applyForceDirectedLayout,
    applyCircularLayout,
    applyHierarchicalLayout,
    initializeLayout
  };
}