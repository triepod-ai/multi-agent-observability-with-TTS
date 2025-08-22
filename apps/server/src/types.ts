export interface HookEvent {
  id?: number;
  source_app: string;
  session_id: string;
  hook_event_type: string;
  payload: Record<string, any>;
  chat?: any[];
  summary?: string;
  timestamp?: number;
  // New relationship tracking fields
  parent_session_id?: string;
  session_depth?: number;
  wave_id?: string;
  delegation_context?: Record<string, any>;
}

export interface FilterOptions {
  source_apps: string[];
  session_ids: string[];
  hook_event_types: string[];
}

// Theme-related interfaces for server-side storage and API
export interface ThemeColors {
  primary: string;
  primaryHover: string;
  primaryLight: string;
  primaryDark: string;
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  bgQuaternary: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textQuaternary: string;
  borderPrimary: string;
  borderSecondary: string;
  borderTertiary: string;
  accentSuccess: string;
  accentWarning: string;
  accentError: string;
  accentInfo: string;
  shadow: string;
  shadowLg: string;
  hoverBg: string;
  activeBg: string;
  focusRing: string;
}

export interface Theme {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  colors: ThemeColors;
  isPublic: boolean;
  authorId?: string;
  authorName?: string;
  createdAt: number;
  updatedAt: number;
  tags: string[];
  downloadCount?: number;
  rating?: number;
  ratingCount?: number;
}

export interface ThemeSearchQuery {
  query?: string;
  tags?: string[];
  authorId?: string;
  isPublic?: boolean;
  sortBy?: 'name' | 'created' | 'updated' | 'downloads' | 'rating';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface ThemeShare {
  id: string;
  themeId: string;
  shareToken: string;
  expiresAt?: number;
  isPublic: boolean;
  allowedUsers: string[];
  createdAt: number;
  accessCount: number;
}

export interface ThemeRating {
  id: string;
  themeId: string;
  userId: string;
  rating: number; // 1-5
  comment?: string;
  createdAt: number;
}

export interface ThemeValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  validationErrors?: ThemeValidationError[];
}

// Session relationship tracking types
export interface SessionRelationship {
  id?: number;
  parent_session_id: string;
  child_session_id: string;
  relationship_type: 'parent/child' | 'sibling' | 'continuation' | 'wave_member';
  spawn_reason?: 'subagent_delegation' | 'wave_orchestration' | 'task_tool' | 'continuation' | 'manual';
  delegation_type?: 'parallel' | 'sequential' | 'isolated';
  spawn_metadata?: Record<string, any>;
  created_at: number;
  completed_at?: number;
  depth_level: number;
  session_path?: string;
}

export interface Session {
  session_id: string;
  source_app: string;
  session_type: 'main' | 'subagent' | 'wave' | 'continuation' | 'isolated';
  parent_session_id?: string;
  start_time: number;
  end_time?: number;
  duration_ms?: number;
  status: 'active' | 'completed' | 'failed' | 'timeout' | 'cancelled';
  agent_count: number;
  total_tokens: number;
  session_metadata?: Record<string, any>;
  created_at: number;
  updated_at: number;
}

export interface SessionHierarchy {
  session: Session;
  relationships: SessionRelationship[];
  children: SessionHierarchy[];
  events: HookEvent[];
}

export interface SessionTreeNode {
  session_id: string;
  session_type: string;
  relationship_type?: string;
  spawn_reason?: string;
  start_time: number;
  end_time?: number;
  duration_ms?: number;
  status: string;
  agent_count: number;
  children: SessionTreeNode[];
  depth: number;
  path: string;
}

export interface RelationshipStats {
  totalRelationships: number;
  relationshipTypes: { [key: string]: number };
  spawnReasons: { [key: string]: number };
  delegationTypes: { [key: string]: number };
  averageDepth: number;
  maxDepth: number;
  completionRate: number;
}

export interface SpawnContext {
  agent_name?: string;
  task_description?: string;
  spawn_method?: 'task_tool' | 'subagent_delegation' | 'wave_orchestration' | 'manual';
  expected_duration?: number;
  delegation_type?: 'parallel' | 'sequential' | 'isolated';
  wave_id?: string;
  priority?: number;
}

// Terminal Status interfaces
export interface AgentStatus {
  agent_id: string;
  agent_name: string;
  agent_type: string;
  status: 'pending' | 'active' | 'completing' | 'complete' | 'failed';
  task_description?: string;
  progress?: number;
  start_time: number;
  duration_ms?: number;
  session_id: string;
  source_app: string;
}

export interface TerminalStatusUpdate {
  type: 'agent_status_update';
  data: AgentStatus;
}

export interface TerminalStatusSnapshot {
  type: 'terminal_status';
  data: {
    active_agents: AgentStatus[];
    recent_completions: AgentStatus[];
    timestamp: number;
  };
}

// Hook Status interfaces for Enhanced Hook Coverage Display
export interface HookStatus {
  type: string;
  displayName: string;
  description: string;
  icon: string;
  status: 'active' | 'inactive' | 'error';
  lastExecution?: number;
  executionCount: number;
  executionRate: string;
  successRate: number;
  lastError?: string;
  averageExecutionTime?: number;
}

export interface HookCoverageData {
  hooks: HookStatus[];
  lastUpdated: number;
  totalActiveHooks: number;
  totalInactiveHooks: number;
  totalErrorHooks: number;
  overallSuccessRate: number;
}