import type { HookFlowStep } from '../types';

export interface LayoutConfig {
  width: number;
  height: number;
  padding: number;
  nodeSpacing: {
    x: number;
    y: number;
  };
}

export interface LayoutAlgorithm {
  name: string;
  description: string;
  apply: (nodes: HookFlowStep[], config: LayoutConfig) => void;
}

// Default layout configuration
export const defaultLayoutConfig: LayoutConfig = {
  width: 1200,
  height: 700,
  padding: 100,
  nodeSpacing: {
    x: 250,
    y: 200
  }
};

/**
 * Grid Layout - Arranges nodes in a simple grid pattern
 */
export const gridLayout: LayoutAlgorithm = {
  name: 'Grid',
  description: 'Arranges nodes in a regular grid pattern',
  apply: (nodes: HookFlowStep[], config: LayoutConfig) => {
    const cols = Math.ceil(Math.sqrt(nodes.length));
    const rows = Math.ceil(nodes.length / cols);
    
    const availableWidth = config.width - (2 * config.padding);
    const availableHeight = config.height - (2 * config.padding);
    
    const cellWidth = availableWidth / cols;
    const cellHeight = availableHeight / rows;
    
    nodes.forEach((node, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      
      node.position.x = config.padding + (col * cellWidth) + (cellWidth / 2) - 60;
      node.position.y = config.padding + (row * cellHeight) + (cellHeight / 2) - 30;
    });
  }
};

/**
 * Circular Layout - Arranges nodes in a circle
 */
export const circularLayout: LayoutAlgorithm = {
  name: 'Circular',
  description: 'Arranges nodes in a circular pattern',
  apply: (nodes: HookFlowStep[], config: LayoutConfig) => {
    const centerX = config.width / 2;
    const centerY = config.height / 2;
    const radius = Math.min(centerX, centerY) - config.padding;
    
    const angleStep = (2 * Math.PI) / nodes.length;
    const startAngle = -Math.PI / 2; // Start from top
    
    nodes.forEach((node, index) => {
      const angle = startAngle + (index * angleStep);
      node.position.x = centerX + Math.cos(angle) * radius - 60;
      node.position.y = centerY + Math.sin(angle) * radius - 30;
    });
  }
};

/**
 * Flow Layout - Arranges nodes based on their execution flow
 */
export const flowLayout: LayoutAlgorithm = {
  name: 'Flow',
  description: 'Arranges nodes based on execution sequence with optimal flow visualization',
  apply: (nodes: HookFlowStep[], config: LayoutConfig) => {
    // Sort nodes by their flow position
    const sortedNodes = [...nodes].sort((a, b) => {
      const getFlowPosition = (nodeId: string): number => {
        const flowOrder = [
          'session_start', 'user_prompt_submit', 'pre_tool_use', 
          'post_tool_use', 'subagent_stop', 'notification', 
          'stop', 'precompact'
        ];
        return flowOrder.indexOf(nodeId) !== -1 ? flowOrder.indexOf(nodeId) : 999;
      };
      
      return getFlowPosition(a.id) - getFlowPosition(b.id);
    });
    
    // Create a flowing S-curve layout
    const totalNodes = sortedNodes.length;
    const nodesPerRow = 4;
    const rows = Math.ceil(totalNodes / nodesPerRow);
    
    sortedNodes.forEach((node, index) => {
      const row = Math.floor(index / nodesPerRow);
      let col = index % nodesPerRow;
      
      // Alternate direction for each row (S-curve)
      if (row % 2 === 1) {
        col = nodesPerRow - 1 - col;
      }
      
      const x = config.padding + (col * config.nodeSpacing.x) + 
                (row % 2 === 1 ? 50 : 0); // Slight offset for alternating rows
      const y = config.padding + (row * config.nodeSpacing.y);
      
      node.position.x = x;
      node.position.y = y;
    });
  }
};

/**
 * Hierarchical Layout - Arranges nodes in levels based on their importance
 */
export const hierarchicalLayout: LayoutAlgorithm = {
  name: 'Hierarchical',
  description: 'Arranges nodes in hierarchical levels based on their role',
  apply: (nodes: HookFlowStep[], config: LayoutConfig) => {
    // Define hierarchy levels
    const levels = {
      essential: ['session_start', 'user_prompt_submit', 'stop'],
      security: ['pre_tool_use'],
      monitoring: ['post_tool_use', 'subagent_stop', 'notification'],
      advanced: ['precompact']
    };
    
    const levelOrder = ['essential', 'security', 'monitoring', 'advanced'];
    const levelHeight = (config.height - (2 * config.padding)) / levelOrder.length;
    
    levelOrder.forEach((levelName, levelIndex) => {
      const levelNodes = nodes.filter(node => 
        levels[levelName as keyof typeof levels].includes(node.id)
      );
      
      const y = config.padding + (levelIndex * levelHeight) + (levelHeight / 2) - 30;
      const totalWidth = levelNodes.length * config.nodeSpacing.x;
      const startX = (config.width - totalWidth) / 2;
      
      levelNodes.forEach((node, nodeIndex) => {
        node.position.x = startX + (nodeIndex * config.nodeSpacing.x) + (config.nodeSpacing.x / 2) - 60;
        node.position.y = y;
      });
    });
  }
};

/**
 * Force-Directed Layout - Uses physics simulation to arrange nodes
 */
export const forceDirectedLayout: LayoutAlgorithm = {
  name: 'Force-Directed',
  description: 'Uses physics simulation to create an organic layout',
  apply: (nodes: HookFlowStep[], config: LayoutConfig) => {
    // Initialize nodes at random positions
    nodes.forEach(node => {
      if (!node.position.x || !node.position.y) {
        node.position.x = config.padding + Math.random() * (config.width - 2 * config.padding);
        node.position.y = config.padding + Math.random() * (config.height - 2 * config.padding);
      }
    });
    
    // Physics simulation parameters
    const iterations = 300;
    const repulsion = 10000;
    const attraction = 0.1;
    const damping = 0.85;
    const centeringForce = 0.01;
    
    const centerX = config.width / 2;
    const centerY = config.height / 2;
    
    for (let iter = 0; iter < iterations; iter++) {
      const forces = new Map<string, { x: number; y: number }>();
      
      // Initialize forces
      nodes.forEach(node => {
        forces.set(node.id, { x: 0, y: 0 });
      });
      
      // Repulsion forces between all nodes
      nodes.forEach(nodeA => {
        nodes.forEach(nodeB => {
          if (nodeA.id === nodeB.id) return;
          
          const dx = nodeA.position.x - nodeB.position.x;
          const dy = nodeA.position.y - nodeB.position.y;
          let distance = Math.sqrt(dx * dx + dy * dy);
          
          // Avoid division by zero
          distance = Math.max(distance, 1);
          
          const force = repulsion / (distance * distance);
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;
          
          const nodeForce = forces.get(nodeA.id)!;
          nodeForce.x += fx;
          nodeForce.y += fy;
        });
      });
      
      // Centering force to prevent drift
      nodes.forEach(node => {
        const dx = centerX - node.position.x;
        const dy = centerY - node.position.y;
        
        const nodeForce = forces.get(node.id)!;
        nodeForce.x += dx * centeringForce;
        nodeForce.y += dy * centeringForce;
      });
      
      // Apply forces with damping
      nodes.forEach(node => {
        const force = forces.get(node.id)!;
        const velocityDamping = Math.pow(damping, iter / iterations + 0.1);
        
        node.position.x += force.x * velocityDamping;
        node.position.y += force.y * velocityDamping;
        
        // Keep nodes within bounds
        node.position.x = Math.max(config.padding, 
          Math.min(config.width - config.padding - 120, node.position.x));
        node.position.y = Math.max(config.padding, 
          Math.min(config.height - config.padding - 60, node.position.y));
      });
    }
  }
};

/**
 * Organic Layout - Creates a natural, organic arrangement
 */
export const organicLayout: LayoutAlgorithm = {
  name: 'Organic',
  description: 'Creates a natural, organic arrangement with slight randomization',
  apply: (nodes: HookFlowStep[], config: LayoutConfig) => {
    // Start with flow layout as base
    flowLayout.apply(nodes, config);
    
    // Add organic variation
    const maxVariation = 40;
    nodes.forEach(node => {
      const variationX = (Math.random() - 0.5) * maxVariation;
      const variationY = (Math.random() - 0.5) * maxVariation;
      
      node.position.x += variationX;
      node.position.y += variationY;
      
      // Ensure nodes stay within bounds
      node.position.x = Math.max(config.padding, 
        Math.min(config.width - config.padding - 120, node.position.x));
      node.position.y = Math.max(config.padding, 
        Math.min(config.height - config.padding - 60, node.position.y));
    });
  }
};

/**
 * Timeline Layout - Arranges nodes in a horizontal timeline
 */
export const timelineLayout: LayoutAlgorithm = {
  name: 'Timeline',
  description: 'Arranges nodes in a horizontal timeline showing execution sequence',
  apply: (nodes: HookFlowStep[], config: LayoutConfig) => {
    // Sort nodes by execution order
    const sortedNodes = [...nodes].sort((a, b) => {
      const flowOrder = [
        'session_start', 'user_prompt_submit', 'pre_tool_use', 
        'post_tool_use', 'subagent_stop', 'notification', 
        'stop', 'precompact'
      ];
      return flowOrder.indexOf(a.id) - flowOrder.indexOf(b.id);
    });
    
    const y = config.height / 2 - 30;
    const totalWidth = (sortedNodes.length - 1) * config.nodeSpacing.x;
    const startX = (config.width - totalWidth) / 2;
    
    sortedNodes.forEach((node, index) => {
      node.position.x = startX + (index * config.nodeSpacing.x);
      node.position.y = y + (index % 2 === 0 ? -50 : 50); // Alternate above/below line
    });
  }
};

/**
 * All available layout algorithms
 */
export const layoutAlgorithms: LayoutAlgorithm[] = [
  flowLayout,
  gridLayout,
  circularLayout,
  hierarchicalLayout,
  forceDirectedLayout,
  organicLayout,
  timelineLayout
];

/**
 * Apply a layout algorithm to nodes
 */
export function applyLayout(
  algorithmName: string, 
  nodes: HookFlowStep[], 
  config: LayoutConfig = defaultLayoutConfig
): void {
  const algorithm = layoutAlgorithms.find(alg => alg.name === algorithmName);
  if (algorithm) {
    algorithm.apply(nodes, config);
  } else {
    console.warn(`Layout algorithm "${algorithmName}" not found. Using flow layout.`);
    flowLayout.apply(nodes, config);
  }
}

/**
 * Get layout algorithm by name
 */
export function getLayoutAlgorithm(name: string): LayoutAlgorithm | undefined {
  return layoutAlgorithms.find(alg => alg.name === name);
}

/**
 * Calculate optimal layout based on node count and viewport size
 */
export function getOptimalLayout(
  nodeCount: number, 
  viewportWidth: number, 
  viewportHeight: number
): string {
  if (nodeCount <= 4) return 'Timeline';
  if (nodeCount <= 6) return 'Circular';
  if (nodeCount <= 8) return 'Flow';
  if (viewportWidth > viewportHeight * 1.5) return 'Timeline';
  return 'Hierarchical';
}

/**
 * Animate transition between layouts
 */
export function animateLayoutTransition(
  nodes: HookFlowStep[],
  fromPositions: Array<{ x: number; y: number }>,
  toLayout: string,
  config: LayoutConfig = defaultLayoutConfig,
  duration: number = 1000
): Promise<void> {
  return new Promise((resolve) => {
    const startTime = performance.now();
    const startPositions = nodes.map(node => ({ x: node.position.x, y: node.position.y }));
    
    // Apply target layout to get end positions
    applyLayout(toLayout, nodes, config);
    const endPositions = nodes.map(node => ({ x: node.position.x, y: node.position.y }));
    
    // Reset to start positions
    nodes.forEach((node, index) => {
      node.position.x = startPositions[index].x;
      node.position.y = startPositions[index].y;
    });
    
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out cubic)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      nodes.forEach((node, index) => {
        const start = startPositions[index];
        const end = endPositions[index];
        
        node.position.x = start.x + (end.x - start.x) * easeOut;
        node.position.y = start.y + (end.y - start.y) * easeOut;
      });
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        resolve();
      }
    };
    
    requestAnimationFrame(animate);
  });
}