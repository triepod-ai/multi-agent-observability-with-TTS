<template>
  <div class="prerequisite-gate">
    <!-- Locked Content Overlay -->
    <div 
      v-if="!isUnlocked" 
      class="locked-overlay relative"
      :class="{ 'cursor-pointer': showUnlockPath }"
      @click="showUnlockPath && toggleUnlockPath()"
    >
      <!-- Locked Content (Blurred/Disabled) -->
      <div class="locked-content relative">
        <div class="content-blur" :class="{ 'blur-sm': blurContent, 'opacity-60': !blurContent }">
          <slot name="locked-content">
            <div class="default-locked-content bg-gray-800 border border-gray-600 rounded-lg p-6 text-center">
              <div class="text-6xl mb-4">🔒</div>
              <h3 class="text-xl font-semibold text-white mb-2">Content Locked</h3>
              <p class="text-gray-300">Complete the prerequisites to unlock this content.</p>
            </div>
          </slot>
        </div>
        
        <!-- Lock Indicator Overlay -->
        <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
          <div class="lock-indicator bg-gray-800 border border-gray-600 rounded-lg p-4 max-w-md mx-4 shadow-xl">
            <div class="text-center">
              <div class="text-4xl mb-3">🔒</div>
              <h4 class="text-lg font-semibold text-white mb-2">{{ gate.name }}</h4>
              <p class="text-sm text-gray-300 mb-4">{{ gate.description }}</p>
              
              <!-- Progress Overview -->
              <div class="progress-overview mb-4">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm text-gray-400">Unlock Progress</span>
                  <span class="text-sm font-medium text-white">{{ Math.round(unlockProgress) }}%</span>
                </div>
                <div class="w-full bg-gray-700 rounded-full h-2">
                  <div
                    class="h-2 rounded-full transition-all duration-500"
                    :class="unlockProgress >= 100 ? 'bg-green-500' : 'bg-blue-500'"
                    :style="{ width: `${unlockProgress}%` }"
                  ></div>
                </div>
                <div v-if="estimatedTimeToUnlock > 0" class="text-xs text-gray-400 mt-1">
                  Est. {{ formatTime(estimatedTimeToUnlock) }} to unlock
                </div>
              </div>
              
              <!-- Quick Actions -->
              <div class="flex flex-col space-y-2">
                <button
                  v-if="showUnlockPath"
                  @click.stop="toggleUnlockPath()"
                  class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                >
                  {{ showingUnlockPath ? 'Hide' : 'Show' }} Unlock Path
                </button>
                
                <button
                  v-if="hasQuickUnlock"
                  @click.stop="$emit('quick-unlock')"
                  class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
                >
                  Quick Unlock Available
                </button>
                
                <button
                  @click.stop="$emit('view-prerequisites')"
                  class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
                >
                  View Requirements
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Unlock Path Modal -->
      <div v-if="showingUnlockPath" class="unlock-path-modal mt-4 bg-gray-800 border border-gray-600 rounded-lg p-4">
        <h4 class="text-md font-semibold text-white mb-3 flex items-center">
          <span class="mr-2">🗺️</span>
          Unlock Path
        </h4>
        
        <div class="space-y-3">
          <div
            v-for="(requirement, index) in sortedRequirements"
            :key="`${requirement.hookId}-${requirement.dimension}`"
            class="requirement-item flex items-center space-x-3 p-3 rounded-lg"
            :class="{
              'bg-green-900/30 border border-green-600': isRequirementMet(requirement),
              'bg-blue-900/30 border border-blue-600': !isRequirementMet(requirement) && isNextRequirement(index),
              'bg-gray-900/30 border border-gray-600': !isRequirementMet(requirement) && !isNextRequirement(index)
            }"
          >
            <!-- Status Icon -->
            <div class="status-icon">
              <span v-if="isRequirementMet(requirement)" class="text-green-400 text-lg">✓</span>
              <span v-else-if="isNextRequirement(index)" class="text-blue-400 text-lg">⚡</span>
              <span v-else class="text-gray-400 text-lg">{{ index + 1 }}</span>
            </div>
            
            <!-- Requirement Details -->
            <div class="flex-1">
              <div class="text-sm font-medium text-white">
                {{ getRequirementDescription(requirement) }}
              </div>
              <div class="text-xs text-gray-400">
                {{ getHookDisplayName(requirement.hookId) }}
                {{ requirement.dimension ? ` • ${requirement.dimension}` : '' }}
              </div>
              
              <!-- Progress Bar -->
              <div class="mt-2">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs text-gray-400">Progress</span>
                  <span class="text-xs text-white">
                    {{ getCurrentScore(requirement) }} / {{ requirement.minimumScore }}
                  </span>
                </div>
                <div class="w-full bg-gray-700 rounded-full h-1">
                  <div
                    class="h-1 rounded-full transition-all duration-300"
                    :class="isRequirementMet(requirement) ? 'bg-green-500' : 'bg-blue-500'"
                    :style="{ width: `${Math.min(100, (getCurrentScore(requirement) / requirement.minimumScore) * 100)}%` }"
                  ></div>
                </div>
              </div>
            </div>
            
            <!-- Action Button -->
            <div class="action-button">
              <button
                v-if="!isRequirementMet(requirement) && isNextRequirement(index)"
                @click.stop="$emit('work-on-requirement', requirement)"
                class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
              >
                Work On This
              </button>
              <span v-else-if="isRequirementMet(requirement)" class="text-green-400 text-sm">Complete</span>
              <span v-else class="text-gray-400 text-sm">Waiting</span>
            </div>
          </div>
        </div>
        
        <!-- Alternative Requirements -->
        <div v-if="alternativeOptions.length > 0" class="alternatives mt-4 pt-4 border-t border-gray-600">
          <h5 class="text-sm font-medium text-white mb-2">Alternative Paths:</h5>
          <div class="space-y-2">
            <div
              v-for="alt in alternativeOptions"
              :key="alt.description"
              class="alternative-item flex items-center justify-between p-2 bg-yellow-900/20 border border-yellow-600 rounded"
            >
              <span class="text-sm text-yellow-200">{{ alt.description }}</span>
              <button
                @click.stop="$emit('use-alternative', alt)"
                class="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded transition-colors"
              >
                Use This
              </button>
            </div>
          </div>
        </div>
        
        <!-- Unlock Summary -->
        <div class="unlock-summary mt-4 p-3 bg-blue-900/20 border border-blue-600 rounded">
          <div class="text-sm text-blue-200">
            <strong>{{ completedRequirements.length }}</strong> of <strong>{{ totalRequirements }}</strong> requirements completed.
            {{ remainingRequirements.length === 1 ? '1 more to go!' : `${remainingRequirements.length} more to go!` }}
          </div>
          <div v-if="estimatedTimeToUnlock > 0" class="text-xs text-blue-300 mt-1">
            Estimated time to unlock: {{ formatTime(estimatedTimeToUnlock) }}
          </div>
        </div>
      </div>
    </div>
    
    <!-- Unlocked Content -->
    <div v-else class="unlocked-content">
      <slot name="unlocked-content">
        <slot />
      </slot>
      
      <!-- Unlock Celebration (if recently unlocked) -->
      <div v-if="showUnlockCelebration" class="unlock-celebration fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50">
        <div class="celebration-content bg-gradient-to-r from-green-600 to-blue-600 rounded-lg p-8 text-center max-w-md mx-4 animate-bounce">
          <div class="text-6xl mb-4">🎉</div>
          <h3 class="text-2xl font-bold text-white mb-2">Unlocked!</h3>
          <p class="text-green-100 mb-4">{{ gate.name }} is now available!</p>
          <button
            @click="showUnlockCelebration = false"
            class="px-6 py-2 bg-white text-green-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
          >
            Continue Learning
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type {
  PrerequisiteGate,
  PrerequisiteValidation,
  AlternativeRequirement,
  HookCompetency,
  LearningProgression
} from '../types/learningProgression';

interface Props {
  gate: PrerequisiteGate;
  progression: LearningProgression | null;
  showUnlockPath?: boolean;
  blurContent?: boolean;
  autoShowCelebration?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showUnlockPath: true,
  blurContent: true,
  autoShowCelebration: true
});

// Reactive state
const showingUnlockPath = ref(false);
const showUnlockCelebration = ref(false);

// Emits
const emit = defineEmits<{
  'unlocked': [gate: PrerequisiteGate];
  'view-prerequisites': [];
  'work-on-requirement': [requirement: PrerequisiteValidation];
  'use-alternative': [alternative: AlternativeRequirement];
  'quick-unlock': [];
}>();

// Computed properties
const isUnlocked = computed(() => props.gate.isUnlocked);

const unlockProgress = computed(() => props.gate.unlockProgress);

const estimatedTimeToUnlock = computed(() => props.gate.estimatedTimeToUnlock);

const sortedRequirements = computed(() => {
  return [...props.gate.requirements].sort((a, b) => {
    const aMet = isRequirementMet(a);
    const bMet = isRequirementMet(b);
    
    // Completed requirements go first, then by progress
    if (aMet && !bMet) return -1;
    if (!aMet && bMet) return 1;
    
    const aProgress = getCurrentScore(a) / a.minimumScore;
    const bProgress = getCurrentScore(b) / b.minimumScore;
    
    return bProgress - aProgress;
  });
});

const completedRequirements = computed(() => {
  return props.gate.requirements.filter(req => isRequirementMet(req));
});

const remainingRequirements = computed(() => {
  return props.gate.requirements.filter(req => !isRequirementMet(req));
});

const totalRequirements = computed(() => props.gate.requirements.length);

const alternativeOptions = computed(() => {
  // Extract alternative requirements from all requirements
  const alternatives: AlternativeRequirement[] = [];
  props.gate.requirements.forEach(req => {
    if (req.alternativeRequirements) {
      alternatives.push(...req.alternativeRequirements);
    }
  });
  return alternatives;
});

const hasQuickUnlock = computed(() => {
  // Check if there's an easy alternative path available
  return alternativeOptions.value.some(alt => 
    alt.type === 'time' && typeof alt.target === 'number' && alt.target <= 30
  );
});

// Methods
const isRequirementMet = (requirement: PrerequisiteValidation): boolean => {
  if (!props.progression?.competencies) return false;
  
  const competency = props.progression.competencies[requirement.hookId];
  if (!competency) return false;
  
  // Check skill level requirement
  const levelScore = getScoreForLevel(requirement.minimumLevel);
  if (competency.overallMastery < levelScore) return false;
  
  // Check specific dimension score if specified
  if (requirement.dimension) {
    const dimensionScore = competency[requirement.dimension];
    return dimensionScore >= requirement.minimumScore;
  }
  
  // Check overall score
  return competency.overallMastery >= requirement.minimumScore;
};

const getCurrentScore = (requirement: PrerequisiteValidation): number => {
  if (!props.progression?.competencies) return 0;
  
  const competency = props.progression.competencies[requirement.hookId];
  if (!competency) return 0;
  
  if (requirement.dimension) {
    return competency[requirement.dimension];
  }
  
  return competency.overallMastery;
};

const isNextRequirement = (index: number): boolean => {
  // The next requirement is the first incomplete one
  const completedCount = sortedRequirements.value.slice(0, index).filter(req => isRequirementMet(req)).length;
  const currentIsComplete = isRequirementMet(sortedRequirements.value[index]);
  
  return !currentIsComplete && completedCount === index;
};

const getRequirementDescription = (requirement: PrerequisiteValidation): string => {
  const hookName = getHookDisplayName(requirement.hookId);
  const dimension = requirement.dimension;
  const level = requirement.minimumLevel;
  const score = requirement.minimumScore;
  
  if (dimension) {
    return `Score ${score}% in ${dimension} for ${hookName}`;
  } else if (level !== 'novice') {
    return `Reach ${level} level in ${hookName}`;
  } else {
    return `Score ${score}% overall in ${hookName}`;
  }
};

const getScoreForLevel = (level: string): number => {
  const thresholds = {
    novice: 0,
    beginner: 30,
    intermediate: 60,
    advanced: 75,
    expert: 90
  };
  return thresholds[level as keyof typeof thresholds] || 0;
};

const getHookDisplayName = (hookId: string): string => {
  const names: Record<string, string> = {
    'session_start': 'Session Start',
    'user_prompt_submit': 'User Prompt',
    'pre_tool_use': 'Pre Tool Use',
    'post_tool_use': 'Post Tool Use',
    'subagent_stop': 'Subagent Stop',
    'stop': 'Stop',
    'notification': 'Notification',
    'precompact': 'PreCompact'
  };
  return names[hookId] || hookId;
};

const formatTime = (minutes: number): string => {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};

const toggleUnlockPath = () => {
  showingUnlockPath.value = !showingUnlockPath.value;
};

// Watch for unlock status changes
watch(() => props.gate.isUnlocked, (newValue, oldValue) => {
  if (newValue && !oldValue && props.autoShowCelebration) {
    showUnlockCelebration.value = true;
    emit('unlocked', props.gate);
    
    // Auto-hide celebration after 3 seconds
    setTimeout(() => {
      showUnlockCelebration.value = false;
    }, 3000);
  }
});
</script>

<style scoped>
.locked-overlay {
  position: relative;
}

.content-blur {
  transition: all 0.3s ease;
}

.lock-indicator {
  backdrop-filter: blur(8px);
  animation: fadeIn 0.3s ease-out;
}

.unlock-path-modal {
  animation: slideDown 0.3s ease-out;
}

.requirement-item {
  transition: all 0.3s ease;
}

.requirement-item:hover {
  transform: translateY(-1px);
}

.unlock-celebration {
  animation: celebrationFadeIn 0.5s ease-out;
}

.celebration-content {
  animation: celebrationBounce 0.8s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
    max-height: 0;
  }
  to {
    opacity: 1;
    transform: translateY(0);
    max-height: 500px;
  }
}

@keyframes celebrationFadeIn {
  from {
    opacity: 0;
    backdrop-filter: blur(0px);
  }
  to {
    opacity: 1;
    backdrop-filter: blur(8px);
  }
}

@keyframes celebrationBounce {
  0%, 20%, 53%, 80%, 100% {
    transform: translate3d(0, 0, 0) scale(1);
  }
  40%, 43% {
    transform: translate3d(0, -20px, 0) scale(1.1);
  }
  70% {
    transform: translate3d(0, -10px, 0) scale(1.05);
  }
  90% {
    transform: translate3d(0, -4px, 0) scale(1.02);
  }
}

/* Status indicators */
.requirement-item.bg-green-900\/30 {
  box-shadow: 0 0 0 1px rgba(34, 197, 94, 0.3);
}

.requirement-item.bg-blue-900\/30 {
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.3);
  animation: nextRequirementPulse 2s infinite;
}

@keyframes nextRequirementPulse {
  0%, 100% {
    box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.3);
  }
  50% {
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
  }
}

/* Alternative path styling */
.alternative-item {
  transition: all 0.2s ease;
}

.alternative-item:hover {
  background-color: rgba(217, 119, 6, 0.3);
  border-color: rgba(217, 119, 6, 0.8);
}

/* Unlock summary glow effect */
.unlock-summary {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1));
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.1);
}
</style>