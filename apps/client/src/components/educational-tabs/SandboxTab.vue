<template>
  <div data-tab-content="sandbox">
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
    
    <!-- WebAssembly Code Execution Demo -->
    <div class="mb-8">
      <WasiRuntimeDemo />
    </div>

    <!-- Original Prompt Tester -->
    <div class="border-t border-gray-700 pt-8">
      <h3 class="text-lg font-semibold text-white mb-4">Hook Test Environment</h3>
      <PromptTester 
        @test-started="$emit('test-started', $event)"
        @test-completed="$emit('test-completed', $event)"
        @security-validation="$emit('security-validation', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import CriticalConceptCallout from '../CriticalConceptCallout.vue';
import PromptTester from '../PromptTester.vue';
import WasiRuntimeDemo from '../WasiRuntimeDemo.vue';
import type { ExecutionResult } from '../../services/hookTestRunner';

defineEmits<{
  'test-started': [testData: { testId: string; scenario?: string; language: string }];
  'test-completed': [testData: { testId: string; result: ExecutionResult; learningValue: number }];
  'security-validation': [validationData: { code: string; riskLevel: string; valid: boolean }];
}>();
</script>