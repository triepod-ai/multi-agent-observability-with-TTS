<template>
  <div class="p-4 space-y-6">
    <!-- Educational Dashboard Header -->
    <div class="bg-gradient-to-r from-green-700 to-blue-700 rounded-lg p-6 text-white">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold mb-2">🎓 Educational Dashboard</h1>
          <p class="text-green-100 text-sm">Learn how Claude Code hooks work together to monitor AI agents</p>
        </div>
        <div class="text-right">
          <div class="text-sm text-green-100 mb-1">Learning Progress</div>
          <div class="w-32 h-2 bg-white/20 rounded-full overflow-hidden">
            <div 
              class="h-full bg-white rounded-full transition-all duration-500"
              :style="{ width: learningProgress + '%' }"
            ></div>
          </div>
          <div class="text-xs text-green-100 mt-1">{{ Math.round(learningProgress) }}% Complete</div>
        </div>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div class="flex items-center">
          <span class="text-2xl mr-3">🔧</span>
          <div>
            <div class="text-sm text-gray-400">Total Hooks</div>
            <div class="text-xl font-semibold text-white">8</div>
          </div>
        </div>
      </div>
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div class="flex items-center">
          <span class="text-2xl mr-3">🚀</span>
          <div>
            <div class="text-sm text-gray-400">Active Hooks</div>
            <div class="text-xl font-semibold text-green-400">{{ activeHooksCount }}</div>
          </div>
        </div>
      </div>
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div class="flex items-center">
          <span class="text-2xl mr-3">📚</span>
          <div>
            <div class="text-sm text-gray-400">Topics Learned</div>
            <div class="text-xl font-semibold text-blue-400">{{ topicsLearned }}/8</div>
          </div>
        </div>
      </div>
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div class="flex items-center">
          <span class="text-2xl mr-3">⚡</span>
          <div>
            <div class="text-sm text-gray-400">Recent Events</div>
            <div class="text-xl font-semibold text-yellow-400">{{ recentEventsCount }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Phase 3 Integration Status -->
    <div v-if="showIntegrationStatus" class="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold text-white flex items-center">
          <span class="mr-2">🔗</span>
          Phase 3 Integration Status
        </h3>
        <span 
          :class="[
            'px-2 py-1 rounded text-xs font-medium flex items-center',
            integrationHealth.status === 'healthy' ? 'bg-green-900/30 text-green-400' : 
            integrationHealth.status === 'degraded' ? 'bg-yellow-900/30 text-yellow-400' : 
            'bg-red-900/30 text-red-400'
          ]"
        >
          {{ integrationHealth.status === 'healthy' ? '✅' : 
             integrationHealth.status === 'degraded' ? '⚠️' : '❌' }}
          {{ integrationHealth.status.toUpperCase() }}
        </span>
      </div>
      
      <div class="grid grid-cols-3 gap-4 text-xs">
        <div>
          <div class="text-gray-400 mb-1">Components</div>
          <div v-for="(status, component) in integrationHealth.components" :key="component" 
               class="flex items-center space-x-1">
            <div :class="[
              'w-2 h-2 rounded-full',
              status === 'active' ? 'bg-green-500' : 
              status === 'inactive' ? 'bg-gray-500' : 'bg-red-500'
            ]"></div>
            <span class="text-gray-300 capitalize">{{ component.replace('-', ' ') }}</span>
          </div>
        </div>
        
        <div>
          <div class="text-gray-400 mb-1">Performance</div>
          <div :class="[
            'font-medium',
            integrationHealth.performanceStatus === 'good' ? 'text-green-400' :
            integrationHealth.performanceStatus === 'warning' ? 'text-yellow-400' :
            'text-red-400'
          ]">
            {{ integrationHealth.performanceStatus.toUpperCase() }}
          </div>
        </div>
        
        <div>
          <div class="text-gray-400 mb-1">Memory Usage</div>
          <div class="text-gray-300">
            {{ formatMemoryUsage(integrationHealth.memoryUsage) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="bg-gray-800 border border-gray-700 rounded-lg p-1">
      <div class="flex space-x-1">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="handleTabChange(tab.id)"
          class="flex items-center px-4 py-2 text-sm font-medium rounded-md transition-all duration-200"
          :class="activeTab === tab.id
            ? 'bg-blue-600 text-white shadow-md'
            : 'text-gray-300 hover:text-white hover:bg-gray-700'"
        >
          <span class="mr-2">{{ tab.icon }}</span>
          <span>{{ tab.label }}</span>
          <ContextualHelp
            v-if="tab.help"
            :tooltip="tab.help.tooltip"
            :title="tab.help.title"
            :description="tab.help.description"
            :tips="tab.help.tips"
            size="sm"
            position="top"
            class="ml-2"
          />
        </button>
      </div>
    </div>

    <!-- Tab Content -->
    <div class="min-h-96">
      <!-- Learning Progress Tab -->
      <div v-if="activeTab === 'progress'" data-tab-content="progress">
        <LearningProgressTracker
          :progression="userProgression"
          @hook-selected="handleHookSelected"
          @start-assessment="handleStartAssessment"
          @start-step="handleStartStep"
          @execute-recommendation="handleExecuteRecommendation"
        />
        
        <!-- Learning Path Section -->
        <div v-if="userProgression?.learningPath" class="mt-6">
          <LearningPath
            :learning-path="userProgression.learningPath"
            :progression="userProgression"
            :current-step="currentLearningStep"
            :step-progress="currentStepProgress"
            @step-selected="handleStepSelected"
            @step-started="handleStepStarted"
            @step-reviewed="handleStepReviewed"
            @resource-opened="handleResourceOpened"
            @recommendation-executed="handleExecuteRecommendation"
          />
        </div>
        
        <!-- Prerequisites Demo -->
        <div class="mt-6">
          <PrerequisiteGate
            :gate="samplePrerequisiteGate"
            :progression="userProgression"
            @unlocked="handleContentUnlocked"
            @view-prerequisites="handleViewPrerequisites"
            @work-on-requirement="handleWorkOnRequirement"
          >
            <template #locked-content>
              <div class="bg-gray-800 border border-gray-600 rounded-lg p-6 text-center">
                <div class="text-4xl mb-3">🏆</div>
                <h3 class="text-lg font-semibold text-white mb-2">Advanced Hook Mastery</h3>
                <p class="text-gray-300 mb-4">
                  This advanced content is unlocked when you reach intermediate level in at least 5 hooks.
                </p>
                <div class="bg-gradient-to-r from-purple-600 to-blue-600 rounded p-4 text-white">
                  <div class="text-sm font-medium mb-2">What you'll learn:</div>
                  <ul class="text-xs space-y-1 text-left">
                    <li>• Advanced hook orchestration patterns</li>
                    <li>• Performance optimization techniques</li>
                    <li>• Enterprise-scale implementations</li>
                    <li>• Complex debugging scenarios</li>
                  </ul>
                </div>
              </div>
            </template>
            
            <template #unlocked-content>
              <div class="bg-gradient-to-r from-green-600 to-blue-600 rounded-lg p-6 text-center text-white">
                <div class="text-4xl mb-3">🎉</div>
                <h3 class="text-lg font-semibold mb-2">Congratulations! Advanced Content Unlocked</h3>
                <p class="mb-4">You've demonstrated mastery across multiple hooks. Ready for the advanced challenges?</p>
                <button class="px-6 py-2 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                  Start Advanced Track
                </button>
              </div>
            </template>
          </PrerequisiteGate>
        </div>
      </div>
      
      <!-- Hook Flow Tab -->
      <div v-else-if="activeTab === 'flow'" data-tab-content="flow">
        <div class="mb-4">
          <h2 class="text-lg font-semibold text-white mb-2">Interactive Hook Flow</h2>
          <p class="text-sm text-gray-400 mb-4">
            This diagram shows how the 8 Claude Code hooks work together. Click any hook to learn more, or click "Start Flow" to see the execution sequence.
          </p>
        </div>

        <!-- Critical Concept: Hook Execution Order -->
        <CriticalConceptCallout
          title="Critical Concept: Hook Execution Order Matters!"
          severity="critical"
          icon="🔄"
          show-badge
          content="Hooks execute in a specific sequence that cannot be changed. Understanding this order is crucial for debugging issues and designing effective monitoring workflows."
          :actions="[
            { label: 'Learn More', action: () => activeTab = 'guide', primary: true },
            { label: 'See Examples', action: () => activeTab = 'scenarios' }
          ]"
        />
        
        <!-- Tab Selector for Flow Views -->
        <div class="mb-4 flex space-x-1 bg-gray-700 p-1 rounded-lg">
          <button
            @click="flowViewMode = 'basic'"
            :class="[
              'px-3 py-1 text-xs font-medium rounded transition-all',
              flowViewMode === 'basic'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-600'
            ]"
          >
            Basic Flow
          </button>
          <button
            @click="flowViewMode = 'advanced'"
            :class="[
              'px-3 py-1 text-xs font-medium rounded transition-all',
              flowViewMode === 'advanced'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-600'
            ]"
          >
            Interactive Flow
          </button>
        </div>

        <!-- Basic Flow Diagram -->
        <div v-if="flowViewMode === 'basic'">
          <HookFlowDiagram @show-in-flow="handleShowInFlow" @simulate-hook="handleSimulateHook" />
          
          <!-- Flow Legend -->
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-4 mt-4">
            <h3 class="text-sm font-semibold text-white mb-3 flex items-center">
              <span class="mr-2">📖</span>
              Flow Legend
            </h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div class="flex items-center text-xs text-gray-300">
                <div class="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span>Session Setup</span>
              </div>
              <div class="flex items-center text-xs text-gray-300">
                <div class="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                <span>User Interaction</span>
              </div>
              <div class="flex items-center text-xs text-gray-300">
                <div class="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                <span>Tool Validation</span>
              </div>
              <div class="flex items-center text-xs text-gray-300">
                <div class="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                <span>Completion</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Advanced Interactive Flow -->
        <div v-else-if="flowViewMode === 'advanced'">
          <AdvancedFlowDiagram
            :competency-data="competencyMappedData"
            :show-performance-monitor="true"
            @node-selected="handleAdvancedNodeSelected"
            @simulate-hook="handleSimulateHook"
            @view-example="handleViewExample"
            @start-practice="handleStartPractice"
          />
        </div>
      </div>

      <!-- Hook Guide Tab -->
      <div v-else-if="activeTab === 'guide'" data-tab-content="guide">
        <div class="mb-4">
          <h2 class="text-lg font-semibold text-white mb-2">Complete Hook Guide</h2>
          <p class="text-sm text-gray-400 mb-4">
            Detailed explanations of all 8 Claude Code hooks with examples, best practices, and common issues.
          </p>
        </div>
        
        <EducationalHookExplanations 
          @show-in-flow="handleShowInFlow" 
          @simulate-hook="handleSimulateHook"
          @topic-learned="handleTopicLearned"
          @run-example="handleRunExample"
          @open-docs="handleOpenDocs"
        />
      </div>

      <!-- Examples Tab -->
      <div v-else-if="activeTab === 'examples'" data-tab-content="examples">
        <div class="mb-4">
          <h2 class="text-lg font-semibold text-white mb-2">Interactive Code Examples</h2>
          <p class="text-sm text-gray-400 mb-4">
            Copy, run, and learn from production-quality hook implementations with real-world patterns.
          </p>
        </div>

        <!-- Example Categories -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Hook Examples -->
          <div>
            <h3 class="text-md font-semibold text-blue-400 mb-3 flex items-center">
              <span class="mr-2">🔧</span>
              Hook Examples by Type
            </h3>
            
            <div v-for="hookExampleSet in hookExampleSets" :key="hookExampleSet.hookId" class="mb-6">
              <h4 class="text-sm font-medium text-gray-300 mb-3 flex items-center">
                <span class="mr-2">{{ getHookIcon(hookExampleSet.hookId) }}</span>
                {{ hookExampleSet.hookName }}
              </h4>
              
              <div class="space-y-3">
                <InteractiveCodeExample
                  v-for="example in hookExampleSet.examples"
                  :key="example.id"
                  :example="example"
                  @run="handleRunExample"
                  @open-docs="handleOpenDocs"
                />
              </div>
            </div>
          </div>

          <!-- Configuration Examples -->
          <div>
            <h3 class="text-md font-semibold text-green-400 mb-3 flex items-center">
              <span class="mr-2">⚙️</span>
              Configuration Examples
            </h3>
            
            <div class="space-y-3">
              <InteractiveCodeExample
                v-for="configExample in configExamples"
                :key="configExample.id"
                :example="configExample"
                @run="handleRunExample"
                @open-docs="handleOpenDocs"
              />
            </div>

            <!-- Quick Start Guide -->
            <div class="mt-6 bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h4 class="text-sm font-semibold text-white mb-3 flex items-center">
                <span class="mr-2">🚀</span>
                Quick Start Guide
              </h4>
              <div class="space-y-2 text-xs text-gray-300">
                <div class="flex items-start">
                  <span class="text-green-400 mr-2 flex-shrink-0 mt-0.5">1.</span>
                  <span>Copy a hook example and save it to <code class="bg-gray-700 px-1 rounded">.claude/hooks/</code></span>
                </div>
                <div class="flex items-start">
                  <span class="text-green-400 mr-2 flex-shrink-0 mt-0.5">2.</span>
                  <span>Update your <code class="bg-gray-700 px-1 rounded">.claude/settings.local.json</code> configuration</span>
                </div>
                <div class="flex items-start">
                  <span class="text-green-400 mr-2 flex-shrink-0 mt-0.5">3.</span>
                  <span>Make the script executable: <code class="bg-gray-700 px-1 rounded">chmod +x .claude/hooks/script.py</code></span>
                </div>
                <div class="flex items-start">
                  <span class="text-green-400 mr-2 flex-shrink-0 mt-0.5">4.</span>
                  <span>Test with Claude Code and watch the observability dashboard!</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Scenarios Tab -->
      <div v-else-if="activeTab === 'scenarios'" data-tab-content="scenarios">
        <div class="mb-4">
          <h2 class="text-lg font-semibold text-white mb-2">Real-World Scenarios</h2>
          <p class="text-sm text-gray-400 mb-4">
            See how hooks work together in common development scenarios.
          </p>
        </div>

        <!-- Critical Concept: Security Validation -->
        <CriticalConceptCallout
          title="Security Validation: PreToolUse Guards Your System"
          severity="warning"
          icon="🛡️"
          show-badge
        >
          <p class="mb-2">
            <strong>PreToolUse hooks act as security gates</strong> - they can block dangerous commands before execution. 
            If a PreToolUse hook returns a non-zero exit code, the tool execution is <em>completely prevented</em>.
          </p>
          <p class="text-xs opacity-90">
            Example: A PreToolUse hook detecting "rm -rf /" would block the command and save your system.
          </p>
        </CriticalConceptCallout>
        
        <div class="space-y-4">
          <div
            v-for="scenario in scenarios"
            :key="scenario.id"
            class="bg-gray-800 border border-gray-700 rounded-lg p-4"
          >
            <div class="flex items-start justify-between mb-3">
              <div>
                <h3 class="text-sm font-semibold text-white flex items-center">
                  <span class="mr-2">{{ scenario.icon }}</span>
                  {{ scenario.title }}
                </h3>
                <p class="text-xs text-gray-400 mt-1">{{ scenario.description }}</p>
              </div>
              <button
                @click="playScenario(scenario.id)"
                class="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded transition-colors"
              >
                Play Scenario
              </button>
            </div>
            
            <div class="space-y-2">
              <div class="text-xs font-medium text-blue-400">Hook Sequence:</div>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="hookId in scenario.hookSequence"
                  :key="hookId"
                  class="inline-flex items-center px-2 py-1 bg-gray-700 text-xs text-gray-300 rounded border"
                >
                  {{ getHookName(hookId) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Reference Tab -->
      <div v-else-if="activeTab === 'reference'" data-tab-content="reference">
        <div class="mb-4">
          <h2 class="text-lg font-semibold text-white mb-2">Quick Reference Cards</h2>
          <p class="text-sm text-gray-400 mb-4">
            Scannable reference cards for all 8 Claude Code hooks. Search, filter, and click for quick access to hook information.
          </p>
        </div>

        <!-- Critical Concept: Hook Categories -->
        <CriticalConceptCallout
          title="Hook Categories: Understanding the System Architecture"
          severity="info"
          icon="📂"
          show-badge
          content="Hooks are organized into 4 categories: Essential (session lifecycle), Security (validation), Monitoring (tracking), and Advanced (analysis). Understanding these categories helps you implement the right hooks for your needs."
          :actions="[
            { label: 'View Flow', action: () => activeTab = 'flow', primary: true },
            { label: 'See Examples', action: () => activeTab = 'examples' }
          ]"
        />
        
        <QuickReferenceCards 
          @hook-select="handleHookSelect"
          @show-in-flow="handleShowInFlow"
        />
        
        <!-- Quick Action Summary -->
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-4 mt-4">
          <h3 class="text-sm font-semibold text-white mb-3 flex items-center">
            <span class="mr-2">⚡</span>
            Quick Actions
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              @click="activeTab = 'flow'"
              class="flex items-center justify-center px-3 py-2 bg-blue-900/30 border border-blue-600 text-blue-400 rounded-md text-xs hover:bg-blue-900/50 transition-colors"
            >
              <span class="mr-2">🔄</span>
              <span>View Hook Flow</span>
            </button>
            <button
              @click="activeTab = 'examples'"
              class="flex items-center justify-center px-3 py-2 bg-green-900/30 border border-green-600 text-green-400 rounded-md text-xs hover:bg-green-900/50 transition-colors"
            >
              <span class="mr-2">💻</span>
              <span>Copy Examples</span>
            </button>
            <button
              @click="activeTab = 'guide'"
              class="flex items-center justify-center px-3 py-2 bg-purple-900/30 border border-purple-600 text-purple-400 rounded-md text-xs hover:bg-purple-900/50 transition-colors"
            >
              <span class="mr-2">📚</span>
              <span>Read Full Guide</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Interactive Sandbox Tab -->
      <div v-else-if="activeTab === 'sandbox'" data-tab-content="sandbox">
        <div class="mb-4">
          <h2 class="text-lg font-semibold text-white mb-2">Interactive Prompt Tester</h2>
          <p class="text-sm text-gray-400 mb-4">
            Safe sandbox environment for testing Claude Code hooks with multi-layer security validation and real-time execution monitoring.
          </p>
        </div>

        <!-- Critical Concept: Sandbox Security -->
        <CriticalConceptCallout
          title="Security First: Multi-Layer Protection"
          severity="info"
          icon="🛡️"
          show-badge
        >
          <p class="mb-2">
            <strong>This sandbox uses multiple security layers:</strong> AST analysis, pattern matching, resource limiting, and iframe isolation.
            All code is validated before execution to prevent dangerous operations.
          </p>
          <ul class="text-xs space-y-1 opacity-90">
            <li>• 🔍 AST analysis detects malicious code patterns</li>
            <li>• 🚧 Pattern matching blocks dangerous commands</li>
            <li>• ⏱️ Resource limiting prevents infinite loops and memory exhaustion</li>
            <li>• 🏝️ Iframe isolation provides secure execution environment</li>
            <li>• 🚨 Emergency kill-switch for immediate termination</li>
          </ul>
        </CriticalConceptCallout>
        
        <PromptTester 
          @test-started="handleTestStarted"
          @test-completed="handleTestCompleted"
          @security-validation="handleSecurityValidation"
        />
      </div>

      <!-- Glossary Tab -->
      <div v-else-if="activeTab === 'glossary'" data-tab-content="glossary">
        <div class="mb-4">
          <h2 class="text-lg font-semibold text-white mb-2">Hook System Glossary</h2>
          <p class="text-sm text-gray-400 mb-4">
            Key terms and concepts in the Claude Code hook system.
          </p>
        </div>

        <!-- Critical Concept: Exit Code Significance -->
        <CriticalConceptCallout
          title="Exit Codes Control Everything"
          severity="info"
          icon="🔢"
          show-badge
        >
          <p class="mb-2">
            <strong>Exit Code 0 = Success, Non-zero = Failure/Block</strong>
          </p>
          <ul class="text-xs space-y-1 opacity-90">
            <li>• <code class="bg-gray-800 px-1 rounded">exit 0</code> - Hook succeeded, continue normal flow</li>
            <li>• <code class="bg-gray-800 px-1 rounded">exit 1</code> - Hook failed or wants to block action</li>
            <li>• PreToolUse non-zero exit = Tool execution blocked</li>
            <li>• PostToolUse non-zero exit = Error detected in tool result</li>
          </ul>
        </CriticalConceptCallout>
        
        <div class="space-y-3">
          <div
            v-for="term in glossaryTerms"
            :key="term.term"
            class="bg-gray-800 border border-gray-700 rounded-lg p-4"
          >
            <h3 class="text-sm font-semibold text-white mb-2">{{ term.term }}</h3>
            <p class="text-xs text-gray-300">{{ term.definition }}</p>
            <div v-if="term.example" class="mt-2">
              <div class="text-xs font-medium text-blue-400 mb-1">Example:</div>
              <div class="text-xs text-gray-400 italic">{{ term.example }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Critical Concept: State Management -->
    <CriticalConceptCallout
      v-if="topicsLearned >= 4"
      title="Advanced Concept: Hook State Management"
      severity="success"
      icon="💾"
      show-badge
    >
      <p class="mb-2">
        <strong>Hooks can share state</strong> through files, Redis, or environment variables. 
        This enables sophisticated workflows where hooks coordinate and pass data between each other.
      </p>
      <p class="text-xs opacity-90">
        Example: SessionStart saves project context to Redis, then PostToolUse reads it to provide better error context.
      </p>
    </CriticalConceptCallout>

    <!-- Learning Progress Tracker -->
    <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold text-white flex items-center">
          <span class="mr-2">📊</span>
          Learning Progress
        </h3>
        <button
          @click="resetProgress"
          class="text-xs text-gray-400 hover:text-white transition-colors"
        >
          Reset Progress
        </button>
      </div>
      
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div
          v-for="hook in hookExplanations"
          :key="hook.id"
          class="flex items-center text-xs p-2 rounded"
          :class="learnedTopics.includes(hook.id) ? 'bg-green-900/30 border border-green-600' : 'bg-gray-900 border border-gray-600'"
        >
          <span class="mr-2">{{ hook.icon }}</span>
          <span class="flex-1 text-gray-300">{{ hook.name }}</span>
          <span v-if="learnedTopics.includes(hook.id)" class="text-green-400">✓</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useEducationalMode } from '../composables/useEducationalMode';
import { useLearningProgression } from '../composables/useLearningProgression';
import HookFlowDiagram from './HookFlowDiagram.vue';
import AdvancedFlowDiagram from './AdvancedFlowDiagram.vue';
import EducationalHookExplanations from './EducationalHookExplanations.vue';
import ContextualHelp from './ContextualHelp.vue';
import CriticalConceptCallout from './CriticalConceptCallout.vue';
import InteractiveCodeExample from './InteractiveCodeExample.vue';
import QuickReferenceCards from './QuickReferenceCards.vue';
import LearningProgressTracker from './LearningProgressTracker.vue';
import LearningPath from './LearningPath.vue';
import PrerequisiteGate from './PrerequisiteGate.vue';
import PromptTester from './PromptTester.vue';
import { hookExamples, configurationExamples } from '../data/hookExamples';
import { beginnerFundamentalsPath } from '../data/learningPaths';
import phase3Integration from '../services/phase3Integration';
import type { HookEvent } from '../types';
import type { 
  PrerequisiteGate as PrerequisiteGateType,
  LearningPathStep,
  LearningResource,
  AnalyticsRecommendation
} from '../types/learningProgression';
import type { ExecutionResult } from '../services/hookTestRunner';

interface Props {
  events: HookEvent[];
}

const props = defineProps<Props>();

const { hookExplanations, getHookExplanation } = useEducationalMode();

// Learning Progression System
const { 
  progression: userProgression, 
  updateCompetency, 
  recordActivity,
  overallProgress: progressionProgress,
  recommendations,
  strongestAreas,
  weakestAreas
} = useLearningProgression('demo-user-123'); // In real app, this would come from auth

const activeTab = ref('progress'); // Default to new Progress tab
const learnedTopics = ref<string[]>([]);
const flowViewMode = ref('basic'); // 'basic' or 'advanced'
const showIntegrationStatus = ref(true);

// Integration health monitoring
const integrationHealth = ref(phase3Integration.healthCheck());

// Learning Path State
const currentLearningStep = ref<string>('');
const currentStepProgress = ref(0);

// Sample Prerequisites Gate for Demo
const samplePrerequisiteGate = computed((): PrerequisiteGateType => {
  const competencies = userProgression.value?.competencies || {};
  const intermediateLevelCount = Object.values(competencies).filter(comp => 
    comp.overallMastery >= 60
  ).length;
  
  return {
    gateId: 'advanced-mastery-gate',
    name: 'Advanced Hook Mastery Track',
    description: 'Unlock advanced content by reaching intermediate level in at least 5 hooks',
    requirements: [
      {
        hookId: 'session_start',
        minimumLevel: 'intermediate',
        minimumScore: 60
      },
      {
        hookId: 'pre_tool_use',
        minimumLevel: 'intermediate', 
        minimumScore: 60
      },
      {
        hookId: 'post_tool_use',
        minimumLevel: 'intermediate',
        minimumScore: 60
      },
      {
        hookId: 'subagent_stop',
        minimumLevel: 'intermediate',
        minimumScore: 60
      },
      {
        hookId: 'stop',
        minimumLevel: 'intermediate',
        minimumScore: 60
      }
    ],
    isUnlocked: intermediateLevelCount >= 5,
    unlockProgress: Math.min(100, (intermediateLevelCount / 5) * 100),
    estimatedTimeToUnlock: Math.max(0, (5 - intermediateLevelCount) * 30) // 30 min per level
  };
});

const tabs = [
  {
    id: 'progress',
    label: 'Learning Progress',
    icon: '📊',
    help: {
      tooltip: 'Track your learning progress and competency development',
      title: 'Learning Progression System',
      description: 'Advanced progress tracking with 4-dimensional competency assessment, personalized learning paths, and achievement badges.',
      tips: [
        'View your competency levels across all hook dimensions',
        'Follow personalized learning paths based on your progress',
        'Earn badges for mastering different hook concepts',
        'Get AI-powered recommendations for improvement'
      ]
    }
  },
  {
    id: 'flow',
    label: 'Hook Flow',
    icon: '🔄',
    help: {
      tooltip: 'Interactive diagram showing hook execution flow with advanced features',
      title: 'Interactive Hook Flow',
      description: 'Choose between basic flow visualization or advanced interactive diagram with zoom, pan, competency overlays, and real-time simulation.',
      tips: [
        'Basic Flow: Simple animated sequence diagram',
        'Interactive Flow: Advanced features with zoom/pan controls',
        'Competency overlays show your mastery levels',
        'Real-time simulation with performance monitoring'
      ]
    }
  },
  {
    id: 'guide',
    label: 'Hook Guide',
    icon: '📚',
    help: {
      tooltip: 'Comprehensive guide to all hooks',
      title: 'Hook Guide',
      description: 'Detailed explanations of each hook with examples, best practices, and troubleshooting tips.',
      tips: [
        'Click expand to see detailed information',
        'Use the code examples to understand data structures',
        'Follow best practices to avoid common issues'
      ]
    }
  },
  {
    id: 'examples',
    label: 'Examples',
    icon: '💻',
    help: {
      tooltip: 'Interactive code examples with copy-paste functionality',
      title: 'Interactive Code Examples',
      description: 'Production-quality hook implementations you can copy, run, and learn from.',
      tips: [
        'Click "Copy Code" to copy examples to clipboard',
        'Use "Run Example" to see simulated output',
        'Examples include real-world patterns and best practices'
      ]
    }
  },
  {
    id: 'sandbox',
    label: 'Interactive Sandbox',
    icon: '🧪',
    help: {
      tooltip: 'Secure testing environment for Claude Code hooks',
      title: 'Interactive Prompt Tester',
      description: 'Safe sandbox environment for testing Claude Code hooks with multi-layer security validation, real-time execution, and comprehensive error handling.',
      tips: [
        'Choose from pre-built test scenarios or write custom code',
        'Multi-layer security validation prevents dangerous code execution',
        'Real-time resource monitoring and execution limits',
        'Emergency kill-switch for immediate termination',
        'Learn by experimenting with different hook implementations'
      ]
    }
  },
  {
    id: 'scenarios',
    label: 'Scenarios',
    icon: '🎬',
    help: {
      tooltip: 'Real-world usage scenarios',
      title: 'Real-World Scenarios',
      description: 'Common development scenarios showing how multiple hooks work together.',
      tips: [
        'Play scenarios to see hook sequences',
        'Understand hook interactions in context',
        'Learn from practical examples'
      ]
    }
  },
  {
    id: 'reference',
    label: 'Reference',
    icon: '🗂️',
    help: {
      tooltip: 'Quick reference cards for all hooks',
      title: 'Quick Reference Cards',
      description: 'Scannable reference cards for all 8 Claude Code hooks with search and filtering.',
      tips: [
        'Search by hook name, purpose, or use case',
        'Filter by category (Essential, Security, Monitoring, Advanced)',
        'Click any card to jump to detailed information',
        'Hover for additional details and exit codes'
      ]
    }
  },
  {
    id: 'glossary',
    label: 'Glossary',
    icon: '📖',
    help: {
      tooltip: 'Key terms and definitions',
      title: 'Glossary',
      description: 'Important terms and concepts in the Claude Code hook system.',
      tips: [
        'Reference when learning new concepts',
        'Understand technical terminology',
        'Build foundational knowledge'
      ]
    }
  }
];

const scenarios = [
  {
    id: 'code-review',
    title: 'Code Review Session',
    icon: '👀',
    description: 'A typical code review workflow showing hook interactions',
    hookSequence: ['session_start', 'user_prompt_submit', 'pre_tool_use', 'post_tool_use', 'subagent_stop', 'stop']
  },
  {
    id: 'debugging',
    title: 'Debugging Process',
    icon: '🐛',
    description: 'Debugging a failing test with multiple tool uses',
    hookSequence: ['session_start', 'user_prompt_submit', 'pre_tool_use', 'post_tool_use', 'pre_tool_use', 'post_tool_use', 'stop']
  },
  {
    id: 'deployment',
    title: 'Application Deployment',
    icon: '🚀',
    description: 'Deploying an application with validation and monitoring',
    hookSequence: ['session_start', 'user_prompt_submit', 'pre_tool_use', 'post_tool_use', 'notification', 'stop']
  },
  {
    id: 'documentation',
    title: 'Documentation Generation',
    icon: '📝',
    description: 'Generating documentation with agent assistance',
    hookSequence: ['session_start', 'user_prompt_submit', 'pre_tool_use', 'post_tool_use', 'subagent_stop', 'precompact', 'stop']
  }
];

const glossaryTerms = [
  {
    term: 'Hook',
    definition: 'A script that runs at specific points during Claude Code execution to capture events, provide notifications, or perform validation.',
    example: 'The PostToolUse hook runs after every tool execution to capture results and detect errors.'
  },
  {
    term: 'Session',
    definition: 'A single conversation or work session with Claude Code, from start to finish.',
    example: 'A session might involve loading a project, making code changes, running tests, and deploying.'
  },
  {
    term: 'Tool',
    definition: 'A capability that Claude can use to interact with your system, such as Read, Write, Bash, or Grep.',
    example: 'When Claude uses the Bash tool to run "git status", both PreToolUse and PostToolUse hooks will fire.'
  },
  {
    term: 'Subagent',
    definition: 'A specialized AI assistant that handles specific tasks within a larger session.',
    example: 'A code-review subagent might analyze your code for quality issues while the main Claude handles other tasks.'
  },
  {
    term: 'TTS (Text-to-Speech)',
    definition: 'Voice notifications that announce important events or require user attention.',
    example: 'When a hook detects an error, TTS might announce "Error detected: Build failed" to get your attention.'
  },
  {
    term: 'Payload',
    definition: 'The data structure containing information about a hook event, including tool inputs, outputs, and metadata.',
    example: 'A PostToolUse payload contains the tool name, execution results, timing, and success status.'
  },
  {
    term: 'Observability',
    definition: 'The ability to monitor and understand what\'s happening in your Claude Code sessions through events and metrics.',
    example: 'The observability dashboard shows all hook events, helping you track tool usage and session performance.'
  },
  {
    term: 'Hook Chain',
    definition: 'The sequence of hooks that execute during a typical Claude Code operation.',
    example: 'A simple operation might trigger: SessionStart → UserPromptSubmit → PreToolUse → PostToolUse → Stop'
  }
];

// Computed properties
const activeHooksCount = computed(() => {
  const recentEvents = props.events.filter(e => 
    e.timestamp && (Date.now() - e.timestamp) < 24 * 60 * 60 * 1000
  );
  const uniqueHookTypes = new Set(recentEvents.map(e => e.hook_event_type));
  return uniqueHookTypes.size;
});

const recentEventsCount = computed(() => {
  return props.events.filter(e => 
    e.timestamp && (Date.now() - e.timestamp) < 60 * 60 * 1000
  ).length;
});

const topicsLearned = computed(() => learnedTopics.value.length);

const learningProgress = computed(() => {
  return userProgression.value?.overallProgress || (topicsLearned.value / hookExplanations.value.length) * 100;
});

// Map user progression to competency data format expected by AdvancedFlowDiagram
const competencyMappedData = computed(() => {
  if (!userProgression.value) return {};
  
  const result: Record<string, { level: number; masteryType: 'knowledge' | 'application' | 'analysis' | 'synthesis' }> = {};
  
  Object.entries(userProgression.value.competencies || {}).forEach(([hookId, competency]) => {
    // Calculate overall level from the 4 dimensions
    const overallLevel = (
      competency.knowledge + competency.application + competency.analysis + competency.synthesis
    ) / 4;
    
    // Determine primary mastery type based on highest dimension
    const dimensions = {
      knowledge: competency.knowledge,
      application: competency.application,
      analysis: competency.analysis,
      synthesis: competency.synthesis
    };
    
    const primaryMastery = Object.entries(dimensions).reduce((max, [key, value]) => 
      value > max.value ? { key: key as keyof typeof dimensions, value } : max,
      { key: 'knowledge' as keyof typeof dimensions, value: 0 }
    ).key;
    
    result[hookId] = {
      level: overallLevel,
      masteryType: primaryMastery
    };
  });
  
  return result;
});

// Phase 3 Integration Event Handlers
const handleTabChange = (newTab: string) => {
  const oldTab = activeTab.value;
  activeTab.value = newTab;
  
  // Emit tab change event to integration system
  phase3Integration.emit('tab-changed', {
    from: oldTab,
    to: newTab,
    context: { userProgression: userProgression.value }
  });
  
  // Record activity
  recordActivity('view');
};

const handleTestStarted = (testData: { testId: string; scenario?: string; language: string }) => {
  phase3Integration.emit('test-started', testData);
};

const handleTestCompleted = (testData: { testId: string; result: ExecutionResult; learningValue: number }) => {
  phase3Integration.emit('test-completed', testData);
  recordActivity('practice');
};

const handleSecurityValidation = (validationData: { code: string; riskLevel: string; valid: boolean }) => {
  phase3Integration.emit('security-validation', validationData);
};

// Event handlers
const handleShowInFlow = (_hookId: string) => {
  activeTab.value = 'flow';
  // Could scroll to or highlight the specific hook in the flow diagram
};

const handleSimulateHook = (hookId: string) => {
  // Simulate hook execution or show example data
  console.log('Simulating hook:', hookId);
  phase3Integration.emit('simulation-step', {
    currentStep: 0,
    totalSteps: 1,
    activeNodeId: hookId
  });
};

const handleTopicLearned = (hookId: string) => {
  if (!learnedTopics.value.includes(hookId)) {
    learnedTopics.value.push(hookId);
    // Save to localStorage
    localStorage.setItem('educational-learned-topics', JSON.stringify(learnedTopics.value));
    
    // Emit learning objective completion
    phase3Integration.completeObjective(`learn-${hookId}`, hookId, 70);
  }
};

const playScenario = (scenarioId: string) => {
  // Animate through the scenario's hook sequence
  console.log('Playing scenario:', scenarioId);
  activeTab.value = 'flow';
  
  phase3Integration.emit('simulation-started', {
    nodeCount: 8,
    estimatedDuration: 5000
  });
};

const getHookName = (hookId: string) => {
  const hook = getHookExplanation(hookId);
  return hook ? hook.name : hookId;
};

const resetProgress = () => {
  learnedTopics.value = [];
  localStorage.removeItem('educational-learned-topics');
};

const handleRunExample = (example: any) => {
  console.log('Running example in Educational Dashboard:', example.id);
  recordActivity('practice');
};

const handleOpenDocs = (url: string) => {
  console.log('Opening documentation:', url);
  recordActivity('view');
};

const handleHookSelect = (hook: any) => {
  console.log('Hook selected from reference cards:', hook.name);
  // Navigate to detailed hook information in the guide tab
  activeTab.value = 'guide';
  recordActivity('view');
};

// Advanced Flow Diagram Event Handlers
const handleAdvancedNodeSelected = (nodeId: string) => {
  console.log('Advanced node selected:', nodeId);
  recordActivity('view');
  
  phase3Integration.emit('node-selected', {
    nodeId,
    competencyLevel: competencyMappedData.value[nodeId]?.level,
    masteryType: competencyMappedData.value[nodeId]?.masteryType
  });
};

const handleViewExample = (nodeId: string) => {
  console.log('View example requested for:', nodeId);
  activeTab.value = 'examples';
  recordActivity('view');
};

const handleStartPractice = (nodeId: string) => {
  console.log('Start practice requested for:', nodeId);
  
  // Simulate starting practice and updating competency
  if (nodeId && userProgression.value) {
    setTimeout(() => {
      updateCompetency(nodeId, 'application', Math.random() * 10 + 70, 'practice');
    }, 1000);
  }
  
  recordActivity('practice');
};

// Examples data
const hookExampleSets = computed(() => hookExamples);
const configExamples = computed(() => configurationExamples);

const getHookIcon = (hookId: string) => {
  const iconMap: Record<string, string> = {
    'pre_tool_use': '🛡️',
    'post_tool_use': '📝',
    'session_start': '🏗️',
    'user_prompt_submit': '📝',
    'subagent_start': '🤖',
    'subagent_stop': '🤖',
    'notification': '🔔',
    'precompact': '📄',
    'stop': '💾'
  };
  return iconMap[hookId] || '🔧';
};

// Event handlers for Learning Progression System
const handleHookSelected = (hookId: string) => {
  console.log('Hook selected:', hookId);
  activeTab.value = 'guide'; // Navigate to detailed guide
  recordActivity('view');
  
  phase3Integration.emit('node-selected', {
    nodeId: hookId,
    competencyLevel: userProgression.value?.competencies[hookId]?.overallMastery,
    masteryType: 'knowledge'
  });
};

const handleStartAssessment = () => {
  console.log('Starting assessment');
  recordActivity('assessment');
};

const handleStartStep = (step: LearningPathStep) => {
  console.log('Starting step:', step);
  currentLearningStep.value = step.stepId;
  currentStepProgress.value = 0;
  recordActivity('practice');
};

const handleStepSelected = (step: LearningPathStep) => {
  console.log('Step selected:', step);
};

const handleStepStarted = (step: LearningPathStep) => {
  console.log('Step started:', step);
  currentLearningStep.value = step.stepId;
  currentStepProgress.value = 0;
  recordActivity('practice');
};

const handleStepReviewed = (step: LearningPathStep) => {
  console.log('Step reviewed:', step);
  recordActivity('view');
};

const handleResourceOpened = (resource: LearningResource) => {
  console.log('Resource opened:', resource);
  recordActivity('view');
};

const handleExecuteRecommendation = (recommendation: AnalyticsRecommendation) => {
  console.log('Executing recommendation:', recommendation);
  
  if (recommendation.action.actionType === 'practice' && recommendation.hookIds.length > 0) {
    const hookId = recommendation.hookIds[0];
    // Simulate some learning progress
    setTimeout(() => {
      updateCompetency(hookId, 'application', Math.random() * 20 + 50, 'practice');
    }, 1000);
  }
  
  recordActivity('practice');
};

const handleContentUnlocked = (gate: PrerequisiteGateType) => {
  console.log('Content unlocked:', gate);
};

const handleViewPrerequisites = () => {
  console.log('View prerequisites requested');
};

const handleWorkOnRequirement = (requirement: any) => {
  console.log('Work on requirement:', requirement);
  activeTab.value = 'guide';
};

// Demo: Add some sample progress for demonstration
const initializeDemoProgress = async () => {
  if (!userProgression.value) return;
  
  // Add some sample competency data
  const sampleProgress = [
    { hookId: 'session_start', dimension: 'knowledge' as const, score: 75 },
    { hookId: 'session_start', dimension: 'application' as const, score: 65 },
    { hookId: 'user_prompt_submit', dimension: 'knowledge' as const, score: 80 },
    { hookId: 'user_prompt_submit', dimension: 'application' as const, score: 70 },
    { hookId: 'pre_tool_use', dimension: 'knowledge' as const, score: 60 },
    { hookId: 'pre_tool_use', dimension: 'analysis' as const, score: 65 },
  ];
  
  for (const progress of sampleProgress) {
    await updateCompetency(progress.hookId, progress.dimension, progress.score, 'assessment');
  }
};

// Helper function for integration status
const formatMemoryUsage = (bytes?: number): string => {
  if (!bytes) return 'N/A';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)}MB`;
};

// Set up integration event listeners
const setupIntegrationEvents = () => {
  // Update component state in integration system
  phase3Integration.setComponentState('learning-progression', {
    userId: 'demo-user-123',
    competencies: userProgression.value?.competencies || {}
  });
  
  // Listen for competency updates
  phase3Integration.on('competency-updated', (event) => {
    console.log('Integration: Competency updated', event);
    // Flow diagram will automatically update via computed property
  });
  
  // Listen for performance warnings
  phase3Integration.on('performance-warning', (event) => {
    console.warn('Performance warning:', event);
    // Could show user notification or adjust settings
  });
};

// Update integration health monitoring
const updateIntegrationHealth = () => {
  integrationHealth.value = phase3Integration.healthCheck();
};

// Lifecycle
onMounted(async () => {
  const saved = localStorage.getItem('educational-learned-topics');
  if (saved) {
    learnedTopics.value = JSON.parse(saved);
  }
  
  // Initialize demo progress after a short delay to allow progression to load
  setTimeout(initializeDemoProgress, 1000);
  
  // Set up Phase 3 integration
  setupIntegrationEvents();
  
  // Start health monitoring
  setInterval(updateIntegrationHealth, 5000); // Update every 5 seconds
});

onUnmounted(() => {
  // Clean up integration event listeners if needed
  phase3Integration.off('competency-updated', () => {});
  phase3Integration.off('performance-warning', () => {});
});
</script>