# Phase 3 Educational Dashboard Component Specifications

## Overview

This document provides detailed component specifications, file structures, and technical implementation details for Phase 3 Advanced Orchestration of the Educational Dashboard.

## File Structure and Organization

### New Component Directory Structure
```
apps/client/src/components/educational/
├── progression/
│   ├── LearningProgressionSystem.vue
│   ├── ProgressTracker.vue
│   ├── CompetencyAssessment.vue
│   ├── LearningPathGuide.vue
│   ├── CertificationBadges.vue
│   └── ProgressAnalytics.vue
├── flow/
│   ├── EnhancedFlowDiagram.vue
│   ├── FlowCanvas.vue
│   ├── HookNode.vue
│   ├── ConnectionLine.vue
│   ├── FlowSimulator.vue
│   ├── FlowControls.vue
│   └── FlowLegend.vue
├── tester/
│   ├── InteractivePromptTester.vue
│   ├── PromptEditor.vue
│   ├── SandboxEnvironment.vue
│   ├── HookSimulator.vue
│   ├── ResultsViewer.vue
│   ├── TestScenarios.vue
│   └── SafetyValidator.vue
└── shared/
    ├── ModalManager.vue
    ├── NotificationToast.vue
    ├── LoadingSpinner.vue
    └── ErrorBoundary.vue
```

### Enhanced Composables Structure
```
apps/client/src/composables/educational/
├── progression/
│   ├── useLearningProgression.ts
│   ├── useCompetencyTracking.ts
│   ├── useBadgeSystem.ts
│   └── useProgressAnalytics.ts
├── flow/
│   ├── useFlowDiagram.ts
│   ├── useFlowAnimation.ts
│   ├── useFlowInteraction.ts
│   └── useFlowRenderer.ts
├── tester/
│   ├── useSandboxEnvironment.ts
│   ├── useCodeExecution.ts
│   ├── useSecurityValidation.ts
│   └── useTestScenarios.ts
└── shared/
    ├── useEducationalStore.ts
    ├── useEducationalEvents.ts
    ├── usePerformanceMonitoring.ts
    └── useAccessibility.ts
```

### Data Models and Types
```
apps/client/src/types/educational/
├── progression.ts
├── flowDiagram.ts
├── sandbox.ts
├── shared.ts
└── index.ts
```

## Detailed Component Specifications

### 1. Learning Progression System Components

#### LearningProgressionSystem.vue
**Purpose**: Main orchestrator for the learning progression feature
**Props**: 
- `userId: string` - User identifier
- `initialTab: string` - Starting tab (overview, path, badges, analytics)

```typescript
<template>
  <div class="learning-progression-system">
    <!-- Header with overall progress -->
    <div class="progression-header bg-gradient-to-r from-blue-700 to-purple-700 rounded-lg p-6 mb-6">
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-2xl font-bold text-white mb-2">🎓 Learning Progression</h2>
          <p class="text-blue-100">Track your mastery of Claude Code hooks</p>
        </div>
        <ProgressTracker :progression="progression" size="large" />
      </div>
    </div>

    <!-- Navigation tabs -->
    <div class="progression-tabs mb-6">
      <!-- Tab navigation -->
    </div>

    <!-- Dynamic content based on active tab -->
    <component 
      :is="currentTabComponent" 
      :progression="progression"
      :user-id="userId"
      @progress-updated="handleProgressUpdate"
      @badge-earned="handleBadgeEarned"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useLearningProgression } from '@/composables/educational/progression/useLearningProgression';
import ProgressTracker from './ProgressTracker.vue';

interface Props {
  userId: string;
  initialTab?: string;
}

const props = withDefaults(defineProps<Props>(), {
  initialTab: 'overview'
});

const { progression, updateProgress, awardBadge } = useLearningProgression(props.userId);
const activeTab = ref(props.initialTab);

const currentTabComponent = computed(() => {
  const components = {
    overview: 'ProgressTracker',
    path: 'LearningPathGuide', 
    badges: 'CertificationBadges',
    analytics: 'ProgressAnalytics'
  };
  return components[activeTab.value as keyof typeof components];
});
</script>
```

#### ProgressTracker.vue
**Purpose**: Visual progress display with competency breakdown
**Props**:
- `progression: LearningProgression` - Current user progression data
- `size: 'small' | 'medium' | 'large'` - Display size variant

```typescript
<template>
  <div class="progress-tracker" :class="sizeClasses">
    <!-- Overall progress ring -->
    <div class="progress-ring-container">
      <svg class="progress-ring" :width="ringSize" :height="ringSize">
        <circle
          class="progress-ring__circle-bg"
          :stroke-width="strokeWidth"
          :r="normalizedRadius"
          :cx="ringSize / 2"
          :cy="ringSize / 2"
        />
        <circle
          class="progress-ring__circle"
          :stroke-width="strokeWidth"
          :stroke-dasharray="`${circumference} ${circumference}`"
          :stroke-dashoffset="strokeDashoffset"
          :r="normalizedRadius"
          :cx="ringSize / 2"
          :cy="ringSize / 2"
        />
      </svg>
      <div class="progress-text">
        <span class="progress-percentage">{{ Math.round(overallProgress) }}%</span>
        <span class="progress-label">Complete</span>
      </div>
    </div>

    <!-- Competency breakdown -->
    <div class="competency-grid" v-if="size !== 'small'">
      <div 
        v-for="(competency, hookId) in progression?.competencies" 
        :key="hookId"
        class="competency-card"
      >
        <div class="competency-header">
          <span class="hook-icon">{{ getHookIcon(hookId) }}</span>
          <span class="hook-name">{{ getHookName(hookId) }}</span>
        </div>
        <div class="competency-bars">
          <CompetencyBar 
            v-for="area in competencyAreas"
            :key="area"
            :label="area"
            :value="competency[area as keyof typeof competency]"
            :color="getCompetencyColor(area)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { LearningProgression } from '@/types/educational/progression';
import CompetencyBar from './CompetencyBar.vue';

interface Props {
  progression: LearningProgression | null;
  size: 'small' | 'medium' | 'large';
}

const props = defineProps<Props>();

const sizeClasses = computed(() => ({
  'progress-tracker--small': props.size === 'small',
  'progress-tracker--medium': props.size === 'medium',
  'progress-tracker--large': props.size === 'large'
}));

const ringSize = computed(() => ({
  small: 80,
  medium: 120,
  large: 160
}[props.size]));

const strokeWidth = computed(() => ringSize.value * 0.08);
const normalizedRadius = computed(() => (ringSize.value - strokeWidth.value * 2) / 2);
const circumference = computed(() => normalizedRadius.value * 2 * Math.PI);

const overallProgress = computed(() => props.progression?.overallProgress || 0);
const strokeDashoffset = computed(() => {
  return circumference.value - (overallProgress.value / 100) * circumference.value;
});
</script>
```

### 2. Enhanced Flow Diagram Components

#### EnhancedFlowDiagram.vue
**Purpose**: Main container for the enhanced interactive flow diagram
**Props**:
- `nodes: FlowDiagramNode[]` - Hook nodes with enhanced data
- `connections: FlowConnection[]` - Connection definitions
- `animationEnabled: boolean` - Enable/disable animations
- `competencyOverlay: boolean` - Show competency progress overlays

```typescript
<template>
  <div class="enhanced-flow-diagram" ref="diagramContainer">
    <!-- Diagram controls -->
    <FlowControls 
      :animation-state="animationState"
      :zoom-level="zoomLevel"
      @play="startAnimation"
      @pause="pauseAnimation"
      @reset="resetAnimation"
      @zoom-changed="handleZoomChange"
    />

    <!-- Main diagram canvas -->
    <div class="diagram-viewport" ref="viewport">
      <!-- SVG Layer for static elements -->
      <svg 
        class="diagram-svg"
        :width="viewportDimensions.width"
        :height="viewportDimensions.height"
        :viewBox="svgViewBox"
        ref="svgCanvas"
      >
        <!-- Connection lines -->
        <ConnectionLine
          v-for="connection in visibleConnections"
          :key="connection.id"
          :connection="connection"
          :animation-state="getConnectionAnimation(connection.id)"
        />
        
        <!-- Hook nodes -->
        <HookNode
          v-for="node in visibleNodes"
          :key="node.id"
          :node="node"
          :competency-data="getNodeCompetency(node.id)"
          @node-click="handleNodeClick"
          @node-hover="handleNodeHover"
        />
      </svg>

      <!-- Canvas Layer for animations -->
      <canvas 
        ref="animationCanvas"
        class="animation-layer"
        :width="canvasDimensions.width"
        :height="canvasDimensions.height"
      />

      <!-- Vue Layer for interactive elements -->
      <div class="interaction-layer">
        <HookNodeTooltip 
          v-if="hoveredNode"
          :node="hoveredNode"
          :position="tooltipPosition"
          :competency-data="getNodeCompetency(hoveredNode.id)"
        />
        
        <FlowLegend 
          :visible="showLegend"
          :competency-mode="competencyOverlay"
          @filter-changed="handleLegendFilter"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useFlowDiagram } from '@/composables/educational/flow/useFlowDiagram';
import { useFlowAnimation } from '@/composables/educational/flow/useFlowAnimation';
import { useFlowInteraction } from '@/composables/educational/flow/useFlowInteraction';

interface Props {
  nodes: FlowDiagramNode[];
  connections: FlowConnection[];
  animationEnabled: boolean;
  competencyOverlay: boolean;
}

const props = defineProps<Props>();

const diagramContainer = ref<HTMLElement>();
const viewport = ref<HTMLElement>();
const svgCanvas = ref<SVGElement>();
const animationCanvas = ref<HTMLCanvasElement>();

const { 
  viewportDimensions, 
  visibleNodes, 
  visibleConnections,
  zoomLevel,
  handleZoomChange 
} = useFlowDiagram(diagramContainer, props.nodes, props.connections);

const {
  animationState,
  startAnimation,
  pauseAnimation,
  resetAnimation,
  getConnectionAnimation
} = useFlowAnimation(animationCanvas, props.animationEnabled);

const {
  hoveredNode,
  tooltipPosition,
  handleNodeClick,
  handleNodeHover
} = useFlowInteraction();
</script>
```

### 3. Interactive Prompt Tester Components

#### InteractivePromptTester.vue
**Purpose**: Main sandbox environment for testing hook code
**Props**:
- `initialHookType: string` - Starting hook type
- `readOnly: boolean` - Read-only mode for demonstrations

```typescript
<template>
  <div class="interactive-prompt-tester">
    <!-- Tester header with safety status -->
    <div class="tester-header bg-gradient-to-r from-green-700 to-blue-700 rounded-lg p-4 mb-6">
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-xl font-bold text-white mb-1">🧪 Interactive Hook Tester</h2>
          <p class="text-green-100 text-sm">Safe environment for testing hook code</p>
        </div>
        <div class="safety-indicator">
          <SafetyValidator 
            :validation-result="currentValidation"
            :is-validating="isValidating"
          />
        </div>
      </div>
    </div>

    <!-- Main tester interface -->
    <div class="tester-layout grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Code editor panel -->
      <div class="editor-panel">
        <div class="panel-header bg-gray-800 border border-gray-700 rounded-t-lg p-3">
          <h3 class="text-sm font-semibold text-white">Hook Code Editor</h3>
          <div class="flex items-center space-x-2 mt-2">
            <select 
              v-model="selectedHookType"
              class="text-xs bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white"
            >
              <option v-for="type in hookTypes" :key="type" :value="type">
                {{ type }}
              </option>
            </select>
            <TestScenarios 
              :hook-type="selectedHookType"
              @load-scenario="loadTestScenario"
            />
          </div>
        </div>
        
        <PromptEditor
          v-model="editorCode"
          :hook-type="selectedHookType"
          :read-only="readOnly"
          :validation-errors="validationErrors"
          @code-changed="handleCodeChange"
        />
        
        <!-- Execute controls -->
        <div class="editor-controls bg-gray-800 border border-gray-700 rounded-b-lg p-3">
          <button
            @click="executeCode"
            :disabled="!canExecute"
            class="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white text-sm rounded transition-colors"
          >
            {{ isExecuting ? 'Executing...' : 'Run Hook Test' }}
          </button>
          <button
            @click="clearResults"
            class="ml-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      <!-- Results panel -->
      <div class="results-panel">
        <div class="panel-header bg-gray-800 border border-gray-700 rounded-t-lg p-3">
          <h3 class="text-sm font-semibold text-white">Execution Results</h3>
        </div>
        
        <ResultsViewer
          :execution-result="executionResult"
          :is-executing="isExecuting"
          :hook-type="selectedHookType"
        />
        
        <!-- Execution history -->
        <div v-if="executionHistory.length > 0" class="execution-history mt-4">
          <h4 class="text-sm font-medium text-gray-300 mb-2">Recent Executions</h4>
          <div class="space-y-2 max-h-40 overflow-y-auto">
            <div 
              v-for="execution in executionHistory"
              :key="execution.id"
              class="execution-item p-2 bg-gray-800 border border-gray-700 rounded text-xs"
            >
              <div class="flex justify-between items-center">
                <span class="text-gray-300">{{ formatTimestamp(execution.timestamp) }}</span>
                <span 
                  class="status-badge"
                  :class="execution.success ? 'text-green-400' : 'text-red-400'"
                >
                  {{ execution.success ? '✓' : '✗' }}
                </span>
              </div>
              <div class="text-gray-400 truncate">{{ execution.summary }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Sandbox environment (hidden iframe) -->
    <SandboxEnvironment
      ref="sandboxRef"
      :security-config="sandboxConfig"
      @execution-complete="handleExecutionComplete"
      @security-violation="handleSecurityViolation"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useSandboxEnvironment } from '@/composables/educational/tester/useSandboxEnvironment';
import { useSecurityValidation } from '@/composables/educational/tester/useSecurityValidation';
import { useCodeExecution } from '@/composables/educational/tester/useCodeExecution';

interface Props {
  initialHookType?: string;
  readOnly?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  initialHookType: 'session_start',
  readOnly: false
});

const editorCode = ref('');
const selectedHookType = ref(props.initialHookType);
const executionResult = ref(null);
const isExecuting = ref(false);

const { 
  sandboxConfig, 
  executeInSandbox,
  executionHistory 
} = useSandboxEnvironment();

const {
  currentValidation,
  isValidating,
  validationErrors,
  validateCode
} = useSecurityValidation();

const canExecute = computed(() => 
  !isExecuting.value && 
  editorCode.value.trim().length > 0 &&
  currentValidation.value?.riskLevel !== 'dangerous'
);
</script>
```

## Integration Points with Existing System

### Enhanced EducationalDashboard.vue Integration

Add new Phase 3 tabs to the existing tab system:

```typescript
// Add to existing tabs array in EducationalDashboard.vue
const tabs = [
  // ... existing tabs (flow, guide, examples, scenarios, reference, glossary)
  {
    id: 'progression',
    label: 'Progress',
    icon: '📊',
    help: {
      tooltip: 'Track your learning progress and competency development',
      title: 'Learning Progression System',
      description: 'Advanced progress tracking with competency assessment and personalized learning paths.',
      tips: [
        'Complete assessments to track your competency levels',
        'Follow personalized learning paths based on your progress',
        'Earn badges for mastering different hook concepts',
        'View analytics to understand your learning patterns'
      ]
    }
  },
  {
    id: 'enhanced-flow',
    label: 'Interactive Flow',
    icon: '🎮',
    help: {
      tooltip: 'Enhanced interactive flow diagram with animations and competency overlays',
      title: 'Enhanced Flow Visualization',
      description: 'Advanced flow diagram with real-time animations, competency indicators, and interactive simulations.',
      tips: [
        'Watch animated flow sequences to understand hook execution',
        'View competency overlays to see your mastery level for each hook',
        'Use simulation controls to step through hook sequences',
        'Interact with nodes for detailed information and assessment'
      ]
    }
  },
  {
    id: 'tester',
    label: 'Hook Tester',
    icon: '🧪',
    help: {
      tooltip: 'Safe environment for testing and experimenting with hook code',
      title: 'Interactive Hook Tester',
      description: 'Secure sandbox environment for writing, testing, and debugging hook implementations.',
      tips: [
        'Write hook code in the interactive editor with syntax highlighting',
        'Test your code safely in an isolated sandbox environment',
        'Use pre-built scenarios to learn from working examples',
        'View execution results and debug issues in real-time'
      ]
    }
  }
];
```

### Enhanced useEducationalMode.ts Integration

Extend the existing composable to support Phase 3 features:

```typescript
// Add to existing useEducationalMode composable
export function useEducationalMode() {
  // ... existing code ...
  
  // Phase 3 enhancements
  const { progression } = useLearningProgression();
  const { flowState } = useFlowDiagram();
  const { sandboxState } = useSandboxEnvironment();
  
  const enhancedHookExplanations = computed(() => {
    return hookExplanations.value.map(hook => ({
      ...hook,
      // Add competency data from progression system
      competencyLevel: progression.value?.competencies[hook.id] || null,
      // Add flow visualization state
      flowPosition: flowState.value.nodes.find(n => n.id === hook.id)?.position,
      // Add tester integration
      hasWorkingExample: sandboxState.value.scenarios.some(s => s.hookType === hook.id)
    }));
  });
  
  return {
    // ... existing returns ...
    enhancedHookExplanations,
    progression,
    flowState,
    sandboxState
  };
}
```

## Technical Implementation Priorities

### Priority 1: Foundation (Critical Path)
1. **Enhanced Type Definitions**: Create comprehensive TypeScript interfaces
2. **Base Component Structure**: Set up file organization and basic component shells
3. **State Management Enhancement**: Extend existing composables with Phase 3 support
4. **Integration Points**: Modify EducationalDashboard.vue to support new tabs

### Priority 2: Learning Progression (High Impact)
1. **Progress Tracking Enhancement**: Build upon existing learning progress system
2. **Competency Assessment**: Create assessment framework with quiz components
3. **Badge System**: Visual achievement system with milestone notifications
4. **Analytics Dashboard**: Progress visualization and insights

### Priority 3: Flow Diagram Enhancement (Medium Complexity)
1. **SVG/Canvas Hybrid**: Implement efficient rendering for complex interactions
2. **Animation System**: Create smooth, performant flow animations
3. **Competency Overlays**: Visual indicators of user mastery on hook nodes
4. **Interactive Controls**: Play/pause/step through flow sequences

### Priority 4: Interactive Tester (High Complexity)
1. **Security Framework**: Implement secure sandbox environment
2. **Code Editor**: Integrate syntax highlighting and validation
3. **Test Scenarios**: Create comprehensive library of working examples
4. **Results Visualization**: Display execution results and debugging information

### Priority 5: Polish and Optimization (Quality Assurance)
1. **Performance Optimization**: Lazy loading, virtual scrolling, animation batching
2. **Mobile Responsiveness**: Touch-friendly interactions for all new features
3. **Accessibility**: WCAG 2.1 AA compliance for complex interactive elements
4. **Error Handling**: Comprehensive error boundaries and graceful degradation

This specification provides a comprehensive foundation for implementing Phase 3 features while maintaining compatibility with existing Phase 1 and Phase 2 implementations.