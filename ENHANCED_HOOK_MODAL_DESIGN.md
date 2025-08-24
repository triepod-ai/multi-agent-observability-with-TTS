# Enhanced Hook Coverage Modal - Rich Contextual Data Display

## Overview
Transform static hook descriptions into dynamic operational intelligence by leveraging the extensive unused payload data available in hook events. This enhancement will provide meaningful contextual information showing recent activity, performance data, and operational insights.

## Current vs Enhanced Design

### Current Implementation
- **Static Descriptions**: Basic text like "Session initialization and context loading"
- **Limited Context**: Only shows execution count, rate, success rate
- **Basic Modal**: Simple expandable details with minimal information

### Enhanced Design
- **Dynamic Context**: Shows recent activity patterns, tool usage, agent operations
- **Rich Payload Data**: Leverages application context, performance metrics, execution context
- **Interactive Modal**: Tabbed interface with contextual sections and detailed analytics

## Available Rich Data Analysis

Based on payload analysis, we have extensive unused data:

### Application Context
```typescript
source_app: string              // Application/project context
session_id: string              // Session relationships
parent_session_id?: string      // Session hierarchy
session_depth?: number          // Nesting level
wave_id?: string               // Multi-wave operations
delegation_context?: object     // Task delegation info
```

### Performance & Execution Metrics
```typescript
duration?: number              // Execution time
token_count?: number          // AI token usage
tokens?: number               // Alt token field
memory_usage?: number         // Memory consumption
cost?: number                 // Operation cost
```

### Agent & Tool Context
```typescript
agent_type?: string           // Agent classification
agent_name?: string           // Specific agent identity
subagent_type?: string        // Sub-agent classification
delegation_type?: string      // How work was delegated
tool_name?: string           // Tool being used
tool_input?: object          // Tool parameters
tool_output?: object         // Tool results
```

### Operational Intelligence
```typescript
metadata?: {
  user?: string               // User context
  environment?: string        // Runtime environment
  hostname?: string          // System context
  agent_type?: string        // Alt agent type
}
files_affected?: string[]     // File operations
success_indicators?: boolean  // Operation success
error?: string | boolean      // Error information
```

## Enhanced Modal Component Design

### 1. Modal Layout Structure

```vue
<template>
  <div v-if="isModalOpen" class="enhanced-hook-modal-overlay">
    <div class="enhanced-hook-modal">
      <!-- Modal Header -->
      <div class="modal-header">
        <div class="hook-identity">
          <span class="hook-icon">{{ selectedHook.icon }}</span>
          <h2>{{ selectedHook.displayName }} Hook</h2>
          <span :class="statusBadgeClass">{{ selectedHook.status }}</span>
        </div>
        <button @click="closeModal" class="close-btn">×</button>
      </div>

      <!-- Modal Content Tabs -->
      <div class="modal-tabs">
        <button 
          v-for="tab in availableTabs" 
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="{ active: activeTab === tab.id }"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Tab Content -->
      <div class="tab-content">
        <!-- Overview Tab -->
        <div v-if="activeTab === 'overview'">
          <ContextualOverview :hook="selectedHook" :context="hookContext" />
        </div>
        
        <!-- Recent Activity Tab -->
        <div v-if="activeTab === 'activity'">
          <RecentActivityView :hook="selectedHook" :events="recentEvents" />
        </div>
        
        <!-- Performance Tab -->
        <div v-if="activeTab === 'performance'">
          <PerformanceMetrics :hook="selectedHook" :metrics="performanceData" />
        </div>
        
        <!-- Context Tab -->
        <div v-if="activeTab === 'context'">
          <ExecutionContext :hook="selectedHook" :context="executionContext" />
        </div>
      </div>
    </div>
  </div>
</template>
```

### 2. Contextual Overview Component

```vue
<!-- ContextualOverview.vue -->
<template>
  <div class="contextual-overview">
    <!-- Dynamic Description -->
    <div class="dynamic-description">
      <h3>Current Status</h3>
      <p class="rich-description">{{ generateRichDescription() }}</p>
    </div>

    <!-- Quick Stats Grid -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">{{ context.totalExecutions }}</div>
        <div class="stat-label">Total Executions</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ context.avgDuration }}ms</div>
        <div class="stat-label">Avg Duration</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ context.totalTokens }}</div>
        <div class="stat-label">Total Tokens</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ context.activeApps }}</div>
        <div class="stat-label">Active Apps</div>
      </div>
    </div>

    <!-- Recent Patterns -->
    <div class="recent-patterns">
      <h3>Recent Activity Patterns</h3>
      <div class="pattern-list">
        <div 
          v-for="pattern in context.patterns" 
          :key="pattern.id"
          class="pattern-item"
        >
          <span class="pattern-icon">{{ pattern.icon }}</span>
          <span class="pattern-text">{{ pattern.description }}</span>
          <span class="pattern-frequency">{{ pattern.frequency }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
methods: {
  generateRichDescription() {
    const { hook, context } = this;
    
    // Generate dynamic description based on actual usage patterns
    switch (hook.type) {
      case 'session_start':
        return `Initializing sessions across ${context.activeApps} applications. Recent sessions average ${context.avgDuration}ms startup time with ${context.avgTokens} tokens loaded per session. ${context.recentProjects.join(', ')} projects active.`;
      
      case 'pre_tool_use':
        return `Validating ${context.topTools.join(', ')} tool executions. Most common operations: ${context.topOperations.join(', ')}. Success rate: ${context.successRate}% with average preparation time of ${context.avgPrepTime}ms.`;
      
      case 'subagent_stop':
        return `Managing ${context.activeAgentTypes.join(', ')} agent completions. Recent agents: ${context.recentAgentNames.slice(0, 3).join(', ')}. Average task completion: ${context.avgTaskDuration}ms with ${context.avgTokensPerTask} tokens per task.`;
      
      default:
        return `${hook.description} - Active across ${context.activeApps} applications with ${context.totalExecutions} recent executions.`;
    }
  }
}
</script>
```

### 3. Recent Activity View Component

```vue
<!-- RecentActivityView.vue -->
<template>
  <div class="recent-activity">
    <div class="activity-timeline">
      <h3>Recent Executions (Last 24h)</h3>
      <div class="timeline-container">
        <div 
          v-for="event in recentEvents" 
          :key="event.id"
          class="timeline-item"
        >
          <!-- Time Stamp -->
          <div class="timeline-time">{{ formatTime(event.timestamp) }}</div>
          
          <!-- Event Details -->
          <div class="timeline-content">
            <div class="event-header">
              <span class="source-app-badge">{{ event.source_app }}</span>
              <span v-if="event.payload.agent_name" class="agent-badge">
                {{ event.payload.agent_name }}
              </span>
              <span class="duration-badge">{{ event.duration }}ms</span>
            </div>
            
            <div class="event-details">
              <!-- Tool Usage -->
              <div v-if="event.payload.tool_name" class="tool-info">
                <span class="tool-icon">🔧</span>
                <span>{{ event.payload.tool_name }}</span>
                <span v-if="event.payload.tool_input" class="tool-params">
                  {{ summarizeToolInput(event.payload.tool_input) }}
                </span>
              </div>
              
              <!-- Agent Context -->
              <div v-if="event.payload.agent_type" class="agent-info">
                <span class="agent-icon">🤖</span>
                <span>{{ event.payload.agent_type }}</span>
                <span v-if="event.payload.delegation_type">
                  ({{ event.payload.delegation_type }})
                </span>
              </div>
              
              <!-- Session Context -->
              <div v-if="event.session_depth" class="session-info">
                <span class="session-icon">🔗</span>
                <span>Session depth: {{ event.session_depth }}</span>
              </div>
              
              <!-- Performance Data -->
              <div class="performance-info">
                <span v-if="event.payload.tokens" class="token-count">
                  {{ event.payload.tokens }} tokens
                </span>
                <span v-if="event.payload.memory_usage" class="memory-usage">
                  {{ formatMemory(event.payload.memory_usage) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
```

### 4. Performance Metrics Component

```vue
<!-- PerformanceMetrics.vue -->
<template>
  <div class="performance-metrics">
    <!-- Performance Charts -->
    <div class="metrics-charts">
      <div class="chart-container">
        <h4>Execution Time Trends</h4>
        <canvas ref="durationChart"></canvas>
      </div>
      
      <div class="chart-container">
        <h4>Token Usage Over Time</h4>
        <canvas ref="tokenChart"></canvas>
      </div>
    </div>

    <!-- Performance Breakdown -->
    <div class="performance-breakdown">
      <h3>Performance Analysis</h3>
      
      <!-- Duration Statistics -->
      <div class="metric-group">
        <h4>Execution Duration</h4>
        <div class="metric-stats">
          <div class="metric-item">
            <label>Average:</label>
            <span>{{ metrics.avgDuration }}ms</span>
          </div>
          <div class="metric-item">
            <label>Median:</label>
            <span>{{ metrics.medianDuration }}ms</span>
          </div>
          <div class="metric-item">
            <label>95th Percentile:</label>
            <span>{{ metrics.p95Duration }}ms</span>
          </div>
        </div>
      </div>
      
      <!-- Resource Usage -->
      <div class="metric-group">
        <h4>Resource Consumption</h4>
        <div class="metric-stats">
          <div class="metric-item">
            <label>Total Tokens:</label>
            <span>{{ formatNumber(metrics.totalTokens) }}</span>
          </div>
          <div class="metric-item">
            <label>Avg Memory:</label>
            <span>{{ formatMemory(metrics.avgMemory) }}</span>
          </div>
          <div class="metric-item">
            <label>Estimated Cost:</label>
            <span>${{ metrics.totalCost }}</span>
          </div>
        </div>
      </div>
      
      <!-- Top Consumers -->
      <div class="metric-group">
        <h4>Top Resource Consumers</h4>
        <div class="consumer-list">
          <div 
            v-for="consumer in metrics.topConsumers" 
            :key="consumer.id"
            class="consumer-item"
          >
            <span class="consumer-name">{{ consumer.name }}</span>
            <span class="consumer-usage">{{ consumer.usage }}</span>
            <div class="usage-bar">
              <div 
                class="usage-fill"
                :style="{ width: consumer.percentage + '%' }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
```

### 5. Execution Context Component

```vue
<!-- ExecutionContext.vue -->
<template>
  <div class="execution-context">
    <!-- Application Context -->
    <div class="context-section">
      <h3>Application Context</h3>
      <div class="context-grid">
        <div class="context-item">
          <label>Active Applications:</label>
          <div class="app-badges">
            <span 
              v-for="app in context.sourceApps" 
              :key="app"
              class="app-badge"
            >
              {{ app }}
            </span>
          </div>
        </div>
        
        <div class="context-item">
          <label>Active Sessions:</label>
          <span>{{ context.activeSessions.length }}</span>
        </div>
        
        <div class="context-item">
          <label>Session Depth Range:</label>
          <span>{{ context.minDepth }} - {{ context.maxDepth }}</span>
        </div>
      </div>
    </div>

    <!-- Tool Usage Context -->
    <div class="context-section" v-if="context.toolUsage.length">
      <h3>Tool Usage Patterns</h3>
      <div class="tool-usage-list">
        <div 
          v-for="tool in context.toolUsage" 
          :key="tool.name"
          class="tool-usage-item"
        >
          <div class="tool-header">
            <span class="tool-name">{{ tool.name }}</span>
            <span class="usage-count">{{ tool.count }} uses</span>
          </div>
          <div class="tool-details">
            <div class="common-params">
              <strong>Common parameters:</strong>
              {{ tool.commonParams.join(', ') }}
            </div>
            <div class="success-rate">
              <strong>Success rate:</strong> {{ tool.successRate }}%
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Agent Context -->
    <div class="context-section" v-if="context.agentActivity.length">
      <h3>Agent Activity</h3>
      <div class="agent-activity-list">
        <div 
          v-for="agent in context.agentActivity" 
          :key="agent.id"
          class="agent-activity-item"
        >
          <div class="agent-info">
            <span class="agent-name">{{ agent.name }}</span>
            <span class="agent-type-badge">{{ agent.type }}</span>
          </div>
          <div class="agent-stats">
            <span>{{ agent.executions }} executions</span>
            <span>{{ agent.avgDuration }}ms avg</span>
            <span>{{ agent.totalTokens }} tokens</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Errors -->
    <div class="context-section" v-if="context.recentErrors.length">
      <h3>Recent Issues</h3>
      <div class="error-list">
        <div 
          v-for="error in context.recentErrors" 
          :key="error.id"
          class="error-item"
        >
          <div class="error-header">
            <span class="error-time">{{ formatTime(error.timestamp) }}</span>
            <span class="error-source">{{ error.source }}</span>
          </div>
          <div class="error-message">{{ error.message }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
```

## Data Flow Enhancement

### 1. Enhanced Hook Coverage Service

```typescript
// Enhanced hookCoverageService.ts
export interface EnhancedHookContext {
  // Application Context
  sourceApps: string[];
  activeSessions: string[];
  sessionDepthRange: { min: number; max: number };
  
  // Performance Metrics  
  totalExecutions: number;
  avgDuration: number;
  medianDuration: number;
  p95Duration: number;
  totalTokens: number;
  avgTokensPerExecution: number;
  totalCost: number;
  
  // Tool Usage
  toolUsage: Array<{
    name: string;
    count: number;
    successRate: number;
    commonParams: string[];
    avgDuration: number;
  }>;
  
  // Agent Activity
  agentActivity: Array<{
    id: string;
    name: string;
    type: string;
    executions: number;
    avgDuration: number;
    totalTokens: number;
  }>;
  
  // Recent Patterns
  patterns: Array<{
    id: string;
    icon: string;
    description: string;
    frequency: string;
  }>;
  
  // Error Context
  recentErrors: Array<{
    id: string;
    timestamp: number;
    source: string;
    message: string;
  }>;
}

export function calculateEnhancedHookContext(
  db: Database, 
  hookType: string, 
  timeWindow: number = 24 * 60 * 60 * 1000
): EnhancedHookContext {
  const now = Date.now();
  const since = now - timeWindow;
  
  // Get hook-specific events
  const hookEvents = db.prepare(`
    SELECT * FROM events 
    WHERE hook_event_type IN (?) AND timestamp > ?
    ORDER BY timestamp DESC
  `).all(getEventTypesForHook(hookType), since) as HookEvent[];
  
  return {
    sourceApps: [...new Set(hookEvents.map(e => e.source_app))],
    activeSessions: [...new Set(hookEvents.map(e => e.session_id))],
    sessionDepthRange: calculateDepthRange(hookEvents),
    
    totalExecutions: hookEvents.length,
    avgDuration: calculateAverage(hookEvents, 'duration'),
    medianDuration: calculateMedian(hookEvents, 'duration'),
    p95Duration: calculatePercentile(hookEvents, 'duration', 95),
    totalTokens: sumField(hookEvents, 'payload.tokens'),
    avgTokensPerExecution: avgField(hookEvents, 'payload.tokens'),
    totalCost: calculateTotalCost(hookEvents),
    
    toolUsage: analyzeToolUsage(hookEvents),
    agentActivity: analyzeAgentActivity(hookEvents),
    patterns: identifyPatterns(hookEvents),
    recentErrors: extractRecentErrors(hookEvents)
  };
}
```

### 2. Frontend Integration

```typescript
// Enhanced HookStatusGrid.vue
interface EnhancedHookStatus extends HookStatus {
  context?: EnhancedHookContext;
  recentEvents?: HookEvent[];
}

// Modal state management
const selectedHook = ref<EnhancedHookStatus | null>(null);
const isModalOpen = ref(false);
const activeTab = ref('overview');

const openHookModal = async (hook: HookStatus) => {
  // Fetch enhanced context data
  const [context, recentEvents] = await Promise.all([
    fetchHookContext(hook.type),
    fetchRecentEvents(hook.type, 50)
  ]);
  
  selectedHook.value = {
    ...hook,
    context,
    recentEvents
  };
  
  isModalOpen.value = true;
  activeTab.value = 'overview';
};
```

## Responsive Design Strategy

### Desktop Layout (>1024px)
- **Modal Width**: 90% viewport, max 1200px
- **Tab Content**: Full width with side-by-side charts
- **Data Density**: High - show all available context

### Tablet Layout (768px - 1024px)
- **Modal Width**: 95% viewport
- **Tab Content**: Stacked layout
- **Data Density**: Medium - prioritize key metrics

### Mobile Layout (<768px)
- **Modal**: Full screen overlay
- **Tabs**: Horizontal scroll if needed
- **Data Density**: Low - essential metrics only
- **Touch Optimization**: Larger tap targets

## Implementation Plan

### Phase 1: Backend Data Enhancement
1. **Enhanced Hook Coverage Service** - Extract rich payload data
2. **Context Calculation Functions** - Analyze patterns, usage, performance
3. **API Endpoint Enhancement** - Return enriched hook data
4. **WebSocket Data Updates** - Include context in broadcasts

### Phase 2: Frontend Modal Components
1. **Enhanced Modal Layout** - Tabbed interface structure
2. **Contextual Overview** - Dynamic descriptions and stats
3. **Recent Activity View** - Timeline with rich event details
4. **Performance Metrics** - Charts and statistical analysis
5. **Execution Context** - Application, tool, and agent context

### Phase 3: Integration & Polish
1. **Responsive Design** - Mobile-first adaptive layout
2. **Performance Optimization** - Lazy loading, data caching
3. **Error Handling** - Graceful degradation for missing data
4. **User Testing** - Validate information architecture

### Phase 4: Advanced Features
1. **Interactive Charts** - Drill-down capabilities
2. **Export Functions** - CSV/JSON data export
3. **Filtering & Search** - Filter events by criteria
4. **Comparison Mode** - Compare hooks side-by-side

## Key Benefits

### For Operations Teams
- **Immediate Context**: Understand what each hook is actually doing
- **Performance Insights**: Identify slow or resource-intensive operations  
- **Error Patterns**: Spot recurring issues and their sources
- **Usage Analytics**: See which tools, agents, and applications are most active

### For Development Teams  
- **Debugging Context**: Rich information for troubleshooting hook issues
- **Optimization Targets**: Data-driven performance improvement opportunities
- **Integration Health**: Monitor cross-application hook usage patterns
- **Agent Behavior**: Understand how agents interact with different hooks

### For System Administrators
- **Resource Planning**: Token usage, memory consumption, cost tracking
- **Capacity Management**: Peak usage patterns and scaling needs
- **Health Monitoring**: Early warning signs of system issues
- **Compliance Reporting**: Detailed audit trails with execution context

This enhancement transforms the Hook Coverage Status from basic monitoring into comprehensive operational intelligence, providing actionable insights for system optimization and troubleshooting.