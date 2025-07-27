export interface HookEvent {
  id?: number;
  source_app: string;
  session_id: string;
  hook_event_type: string;
  payload: Record<string, any>;
  chat?: any[];
  summary?: string;
  timestamp?: number;
  error?: string | boolean;
  duration?: number;
}

export interface FilterOptions {
  source_apps: string[];
  session_ids: string[];
  hook_event_types: string[];
}

export interface ActiveFilter {
  id: string;
  type: 'sourceApps' | 'sessionIds' | 'eventTypes' | 'toolNames' | 'search';
  values: string[];
  label: string;
  icon: string;
  count?: number;
}

export interface FilterState {
  sourceApps: string[];
  sessionIds: string[];
  eventTypes: string[];
  toolNames: string[];
  search?: string;
}

export interface FilterNotification {
  isVisible: boolean;
  totalEvents: number;
  filteredEvents: number;
  totalApplications: number;
  filteredApplications: number;
  totalSessions: number;
  filteredSessions: number;
  activeFilters: ActiveFilter[];
}

export interface WebSocketMessage {
  type: 'initial' | 'event';
  data: HookEvent | HookEvent[];
}

export type TimeRange = '1m' | '3m' | '5m';

export interface ChartDataPoint {
  timestamp: number;
  count: number;
  eventTypes: Record<string, number>; // event type -> count
  sessions: Record<string, number>; // session id -> count
}

export interface ChartConfig {
  maxDataPoints: number;
  animationDuration: number;
  barWidth: number;
  barGap: number;
  colors: {
    primary: string;
    glow: string;
    axis: string;
    text: string;
  };
}