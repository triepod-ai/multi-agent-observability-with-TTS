<template>
  <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-4">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-xl font-semibold text-white flex items-center">
        <span class="mr-2">🔄</span>
        Claude Code Hook Flow
      </h2>
      <div class="flex items-center space-x-2">
        <button
          @click="startAnimation"
          :disabled="isAnimating"
          class="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-md font-medium transition-all duration-200"
        >
          {{ isAnimating ? 'Animating...' : 'Start Flow' }}
        </button>
        <button
          @click="resetAnimation"
          class="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded-md font-medium transition-all duration-200"
        >
          Reset
        </button>
      </div>
    </div>

    <div class="bg-gray-900 rounded-lg p-4 relative overflow-hidden" style="height: 400px;">
      <!-- Flow Container -->
      <div class="relative w-full h-full">
        <!-- Hook Nodes -->
        <div
          v-for="(step, index) in flowSteps"
          :key="step.id"
          class="absolute cursor-pointer transform transition-all duration-300 hover:scale-110"
          :style="{
            left: step.position.x + 'px',
            top: step.position.y + 'px'
          }"
          @click="selectHook(step)"
        >
          <!-- Hook Node -->
          <div
            class="relative flex flex-col items-center p-3 rounded-lg border-2 transition-all duration-300 min-w-[120px] group"
            :class="[
              selectedHook?.id === step.id ? 'ring-2 ring-blue-400 ring-opacity-50' : '',
              step.isActive ? 'border-blue-400 bg-blue-900/30' : 'border-gray-600 bg-gray-800 hover:border-gray-500'
            ]"
          >
            <!-- Active Pulse Animation -->
            <div
              v-if="step.isActive"
              class="absolute inset-0 rounded-lg border-2 border-blue-400 animate-ping opacity-30"
            ></div>
            
            <!-- Hook Icon -->
            <div class="text-2xl mb-1">{{ step.icon }}</div>
            
            <!-- Hook Name -->
            <div class="text-xs font-semibold text-white text-center leading-tight">{{ step.name }}</div>
            
            <!-- Step Number -->
            <div
              class="absolute -top-2 -right-2 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center"
              :style="{ backgroundColor: step.color }"
            >
              {{ index + 1 }}
            </div>

            <!-- Tooltip on Hover -->
            <div class="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded-md px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 border border-gray-600">
              {{ step.description }}
              <div class="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>

          <!-- Connection Lines -->
          <svg 
            v-if="index < flowSteps.length - 1"
            class="absolute top-1/2 left-full pointer-events-none"
            style="width: 80px; height: 2px; transform: translateY(-1px);"
          >
            <line
              x1="10"
              y1="1"
              x2="70"
              y2="1"
              stroke-width="2"
              :class="{ 'animate-pulse': step.isActive }"
              :stroke="step.isActive ? step.color : '#4B5563'"
            />
            <polygon
              points="65,1 70,4 70,-2"
              :fill="step.isActive ? step.color : '#4B5563'"
            />
          </svg>
        </div>

        <!-- Animated Flow Line -->
        <svg
          v-if="isAnimating"
          class="absolute inset-0 pointer-events-none"
          style="width: 100%; height: 100%;"
        >
          <path
            :d="animationPath"
            stroke="#3B82F6"
            stroke-width="3"
            fill="none"
            stroke-dasharray="10,5"
            class="animate-pulse"
          >
            <animate
              attributeName="stroke-dashoffset"
              values="0;-15"
              dur="1s"
              repeatCount="indefinite"
            />
          </path>
        </svg>
      </div>
    </div>

    <!-- Hook Information Panel -->
    <Transition name="fade">
      <div v-if="selectedHook" class="mt-6 bg-gray-900 rounded-lg p-4 border border-gray-600">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-lg font-semibold text-white flex items-center">
            <span class="mr-2 text-xl">{{ selectedHook.icon }}</span>
            {{ selectedHook.name }} Hook
          </h3>
          <button
            @click="selectedHook = null"
            class="text-gray-400 hover:text-white transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="space-y-4">
          <!-- Simple Description -->
          <div>
            <h4 class="text-sm font-medium text-blue-400 mb-1">What it does:</h4>
            <p class="text-sm text-gray-300">{{ getHookExplanation(selectedHook.id)?.simpleDescription }}</p>
          </div>

          <!-- When it runs -->
          <div>
            <h4 class="text-sm font-medium text-green-400 mb-1">When it runs:</h4>
            <p class="text-sm text-gray-300">{{ getHookExplanation(selectedHook.id)?.whenItRuns }}</p>
          </div>

          <!-- Why it matters -->
          <div>
            <h4 class="text-sm font-medium text-yellow-400 mb-1">Why it matters:</h4>
            <p class="text-sm text-gray-300">{{ getHookExplanation(selectedHook.id)?.whyItMatters }}</p>
          </div>

          <!-- Example -->
          <div>
            <h4 class="text-sm font-medium text-purple-400 mb-1">Example:</h4>
            <p class="text-sm text-gray-300 italic">{{ getHookExplanation(selectedHook.id)?.realWorldExample }}</p>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Flow Instructions -->
    <div class="mt-4 text-center">
      <p class="text-xs text-gray-400">
        Click on any hook to learn more • Click "Start Flow" to see the execution sequence
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useEducationalMode } from '../composables/useEducationalMode';
import type { HookFlowStep } from '../types';

const { getHookFlowSteps, getHookExplanation } = useEducationalMode();

const flowSteps = ref<HookFlowStep[]>([]);
const selectedHook = ref<HookFlowStep | null>(null);
const isAnimating = ref(false);
const currentAnimationStep = ref(0);

// Generate SVG path for the animation line
const animationPath = computed(() => {
  if (flowSteps.value.length === 0) return '';
  
  let path = '';
  flowSteps.value.forEach((step, index) => {
    const x = step.position.x + 60; // Center of node
    const y = step.position.y + 30; // Center of node
    
    if (index === 0) {
      path += `M ${x} ${y}`;
    } else {
      path += ` L ${x} ${y}`;
    }
  });
  
  return path;
});

const selectHook = (hook: HookFlowStep) => {
  selectedHook.value = hook;
};

const startAnimation = () => {
  if (isAnimating.value) return;
  
  isAnimating.value = true;
  currentAnimationStep.value = 0;
  
  // Reset all steps
  flowSteps.value.forEach(step => {
    step.isActive = false;
  });
  
  // Animate through each step
  const animateStep = () => {
    if (currentAnimationStep.value >= flowSteps.value.length) {
      isAnimating.value = false;
      return;
    }
    
    // Activate current step
    flowSteps.value[currentAnimationStep.value].isActive = true;
    
    // Deactivate previous step after a delay
    setTimeout(() => {
      if (currentAnimationStep.value > 0) {
        flowSteps.value[currentAnimationStep.value - 1].isActive = false;
      }
    }, 800);
    
    currentAnimationStep.value++;
    
    setTimeout(() => {
      animateStep();
    }, 1000);
  };
  
  animateStep();
};

const resetAnimation = () => {
  isAnimating.value = false;
  currentAnimationStep.value = 0;
  flowSteps.value.forEach(step => {
    step.isActive = false;
  });
  selectedHook.value = null;
};

onMounted(() => {
  flowSteps.value = getHookFlowSteps();
});
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: all 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>