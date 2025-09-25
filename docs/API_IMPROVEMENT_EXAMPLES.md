# API Endpoint Fixes and Error Handling Improvements

## Overview

This document provides specific code examples for fixing common API endpoint issues in the Multi-Agent Observability System.

## 1. Enhanced Hook Coverage Endpoint

### Problem: Empty hooks array despite database having events

**File**: `apps/server/src/routes/hooks.ts`

```typescript
import { Request, Response } from 'express';
import { Database } from 'better-sqlite3';

// Enhanced getEventTypesForHook function with dual naming support
function getEventTypesForHook(hookType: string): string[] {
  const hookMappings: Record<string, string[]> = {
    'session_start': ['SessionStart', 'session_start'],
    'user_prompt_submit': ['UserPromptSubmit', 'user_prompt_submit'],
    'pre_tool_use': ['PreToolUse', 'pre_tool_use'],
    'post_tool_use': ['PostToolUse', 'post_tool_use'],
    'subagent_start': ['SubagentStart', 'subagent_start'],
    'subagent_stop': ['SubagentStop', 'subagent_stop'],
    'stop': ['Stop', 'stop'],
    'notification': ['Notification', 'notification'],
    'precompact': ['PreCompact', 'precompact']
  };

  return hookMappings[hookType] || [hookType];
}

// Improved hook coverage endpoint
export async function getHookCoverage(req: Request, res: Response) {
  try {
    const db = new Database('./database.db');

    // Get time window (default 24 hours)
    const timeWindow = parseInt(req.query.timeWindow as string) || 86400000;
    const sinceTimestamp = Date.now() - timeWindow;

    const hookTypes = [
      'session_start', 'user_prompt_submit', 'pre_tool_use', 'post_tool_use',
      'subagent_start', 'subagent_stop', 'stop', 'notification', 'precompact'
    ];

    const hooks = [];

    for (const hookType of hookTypes) {
      try {
        const eventTypes = getEventTypesForHook(hookType);
        const placeholders = eventTypes.map(() => '?').join(',');

        // Get hook statistics with dual naming support
        const stats = db.prepare(`
          SELECT
            COUNT(*) as executionCount,
            AVG(duration) as avgDuration,
            MAX(timestamp) as lastExecution,
            COUNT(CASE WHEN error IS NULL THEN 1 END) as successCount,
            COUNT(DISTINCT session_id) as uniqueSessions
          FROM events
          WHERE hook_event_type IN (${placeholders})
          AND timestamp > ?
        `).get(...eventTypes, sinceTimestamp) as any;

        // Calculate success rate
        const successRate = stats.executionCount > 0
          ? Math.round((stats.successCount / stats.executionCount) * 100)
          : 0;

        // Determine hook status
        let status = 'inactive';
        if (stats.executionCount > 0) {
          const hoursSinceLastExecution = (Date.now() - stats.lastExecution) / (1000 * 60 * 60);
          if (hoursSinceLastExecution < 1) status = 'active';
          else if (hoursSinceLastExecution < 24) status = 'recent';
          else status = 'inactive';

          if (successRate < 80) status = 'error';
        }

        // Get display information
        const displayInfo = getHookDisplayInfo(hookType);

        hooks.push({
          type: hookType,
          displayName: displayInfo.displayName,
          description: displayInfo.description,
          icon: displayInfo.icon,
          status,
          lastExecution: stats.lastExecution,
          executionCount: stats.executionCount,
          executionRate: calculateExecutionRate(stats.executionCount, timeWindow),
          successRate,
          averageExecutionTime: Math.round(stats.avgDuration || 0),
          uniqueSessions: stats.uniqueSessions
        });

      } catch (hookError) {
        console.error(`Error processing hook ${hookType}:`, hookError);

        // Return hook with error status
        const displayInfo = getHookDisplayInfo(hookType);
        hooks.push({
          type: hookType,
          displayName: displayInfo.displayName,
          description: displayInfo.description,
          icon: displayInfo.icon,
          status: 'error',
          lastExecution: null,
          executionCount: 0,
          executionRate: '0/day',
          successRate: 0,
          averageExecutionTime: 0,
          uniqueSessions: 0,
          error: hookError.message
        });
      }
    }

    db.close();

    // Calculate summary statistics
    const totalActiveHooks = hooks.filter(h => h.status === 'active').length;
    const totalInactiveHooks = hooks.filter(h => h.status === 'inactive').length;
    const totalErrorHooks = hooks.filter(h => h.status === 'error').length;
    const overallSuccessRate = hooks.length > 0
      ? Math.round(hooks.reduce((sum, h) => sum + h.successRate, 0) / hooks.length)
      : 0;

    res.json({
      hooks,
      lastUpdated: Date.now(),
      totalActiveHooks,
      totalInactiveHooks,
      totalErrorHooks,
      overallSuccessRate,
      timeWindow,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Hook coverage error:', error);

    res.status(500).json({
      error: 'Failed to retrieve hook coverage',
      code: 'HOOK_COVERAGE_ERROR',
      timestamp: Date.now(),
      details: {
        message: error.message,
        suggestion: 'Check database connection and table structure'
      }
    });
  }
}

// Helper function for hook display information
function getHookDisplayInfo(hookType: string) {
  const displayMap = {
    'session_start': {
      displayName: 'SessionStart',
      description: 'Session initialization and context loading',
      icon: '🚀'
    },
    'user_prompt_submit': {
      displayName: 'UserPromptSubmit',
      description: 'User input processing and validation',
      icon: '💬'
    },
    'pre_tool_use': {
      displayName: 'PreToolUse',
      description: 'Pre-tool validation and preparation',
      icon: '🔧'
    },
    'post_tool_use': {
      displayName: 'PostToolUse',
      description: 'Post-tool processing and cleanup',
      icon: '✅'
    },
    'subagent_start': {
      displayName: 'SubagentStart',
      description: 'Agent initialization and task assignment',
      icon: '🤖'
    },
    'subagent_stop': {
      displayName: 'SubagentStop',
      description: 'Agent completion and result processing',
      icon: '🏁'
    },
    'stop': {
      displayName: 'Stop',
      description: 'Session termination and cleanup',
      icon: '🛑'
    },
    'notification': {
      displayName: 'Notification',
      description: 'System notifications and alerts',
      icon: '🔔'
    },
    'precompact': {
      displayName: 'PreCompact',
      description: 'Pre-compression analysis and optimization',
      icon: '📦'
    }
  };

  return displayMap[hookType] || {
    displayName: hookType,
    description: 'Custom hook type',
    icon: '🔗'
  };
}

// Helper function to calculate execution rate
function calculateExecutionRate(count: number, timeWindowMs: number): string {
  const hours = timeWindowMs / (1000 * 60 * 60);
  const days = hours / 24;

  if (days >= 1) {
    const perDay = Math.round(count / days);
    return `${perDay}/day`;
  } else {
    const perHour = Math.round(count / hours);
    return `${perHour}/hour`;
  }
}
```

## 2. Enhanced Error Handling Middleware

**File**: `apps/server/src/middleware/errorHandler.ts`

```typescript
import { Request, Response, NextFunction } from 'express';

export interface APIError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export function errorHandler(err: APIError, req: Request, res: Response, next: NextFunction) {
  console.error('API Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Default error response
  let statusCode = err.statusCode || 500;
  let errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected error occurred';

  // Handle specific error types
  if (err.message.includes('no such table')) {
    statusCode = 500;
    errorCode = 'DATABASE_SCHEMA_ERROR';
    message = 'Database table not found. Please initialize the database.';
  } else if (err.message.includes('database is locked')) {
    statusCode = 503;
    errorCode = 'DATABASE_LOCKED';
    message = 'Database is temporarily unavailable. Please retry.';
  } else if (err.message.includes('SQLITE_CANTOPEN')) {
    statusCode = 500;
    errorCode = 'DATABASE_ACCESS_ERROR';
    message = 'Cannot access database file. Check file permissions.';
  }

  // Sanitize error details for production
  const isProduction = process.env.NODE_ENV === 'production';
  const errorResponse = {
    error: message,
    code: errorCode,
    timestamp: Date.now(),
    requestId: req.headers['x-request-id'] || 'unknown',
    details: isProduction ? undefined : {
      originalMessage: err.message,
      stack: err.stack,
      ...err.details
    }
  };

  res.status(statusCode).json(errorResponse);
}

// Async error wrapper
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Database error wrapper
export function dbErrorHandler(operation: string) {
  return (error: Error) => {
    const dbError = new Error(`Database ${operation} failed: ${error.message}`) as APIError;
    dbError.statusCode = 500;
    dbError.code = 'DATABASE_ERROR';
    dbError.details = {
      operation,
      originalError: error.message
    };
    throw dbError;
  };
}
```

## 3. WebSocket Connection Improvements

**File**: `apps/server/src/websocket.ts`

```typescript
import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

interface WSMessage {
  type: string;
  data?: any;
  timestamp?: number;
}

export class EnhancedWebSocketServer {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();
  private heartbeatInterval: NodeJS.Timeout;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server });
    this.setupWebSocketHandlers();
    this.startHeartbeat();
  }

  private setupWebSocketHandlers() {
    this.wss.on('connection', (ws: WebSocket, req) => {
      console.log('WebSocket client connected:', req.socket.remoteAddress);
      this.clients.add(ws);

      // Send welcome message
      this.sendToClient(ws, {
        type: 'connection_established',
        data: { clientId: this.generateClientId(), timestamp: Date.now() }
      });

      // Handle messages
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString()) as WSMessage;
          this.handleMessage(ws, message);
        } catch (error) {
          console.error('Invalid WebSocket message:', error);
          this.sendError(ws, 'INVALID_MESSAGE', 'Message must be valid JSON');
        }
      });

      // Handle disconnection
      ws.on('close', (code, reason) => {
        console.log('WebSocket client disconnected:', code, reason.toString());
        this.clients.delete(ws);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });

      // Set up ping/pong for connection health
      ws.on('pong', () => {
        (ws as any).isAlive = true;
      });
    });
  }

  private handleMessage(ws: WebSocket, message: WSMessage) {
    console.log('WebSocket message received:', message);

    switch (message.type) {
      case 'ping':
        this.sendToClient(ws, { type: 'pong', timestamp: Date.now() });
        break;

      case 'subscribe':
        this.handleSubscription(ws, message.data);
        break;

      case 'unsubscribe':
        this.handleUnsubscription(ws, message.data);
        break;

      case 'get_status':
        this.sendSystemStatus(ws);
        break;

      default:
        this.sendError(ws, 'UNKNOWN_MESSAGE_TYPE', `Unknown message type: ${message.type}`);
    }
  }

  private handleSubscription(ws: WebSocket, data: any) {
    const { channels } = data;
    (ws as any).subscriptions = new Set(channels);

    this.sendToClient(ws, {
      type: 'subscription_confirmed',
      data: { channels, timestamp: Date.now() }
    });
  }

  private handleUnsubscription(ws: WebSocket, data: any) {
    const { channels } = data;
    if ((ws as any).subscriptions) {
      channels.forEach((channel: string) => {
        (ws as any).subscriptions.delete(channel);
      });
    }

    this.sendToClient(ws, {
      type: 'unsubscription_confirmed',
      data: { channels, timestamp: Date.now() }
    });
  }

  private sendSystemStatus(ws: WebSocket) {
    this.sendToClient(ws, {
      type: 'system_status',
      data: {
        connectedClients: this.clients.size,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: Date.now()
      }
    });
  }

  public broadcast(message: WSMessage, channel?: string) {
    const messageWithTimestamp = {
      ...message,
      timestamp: message.timestamp || Date.now()
    };

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        // Check channel subscription if specified
        if (channel) {
          const subscriptions = (client as any).subscriptions;
          if (!subscriptions || !subscriptions.has(channel)) {
            return;
          }
        }

        this.sendToClient(client, messageWithTimestamp);
      }
    });
  }

  private sendToClient(ws: WebSocket, message: WSMessage) {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
      this.clients.delete(ws);
    }
  }

  private sendError(ws: WebSocket, code: string, message: string) {
    this.sendToClient(ws, {
      type: 'error',
      data: { code, message, timestamp: Date.now() }
    });
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((ws) => {
        if ((ws as any).isAlive === false) {
          console.log('Terminating unresponsive WebSocket client');
          ws.terminate();
          this.clients.delete(ws);
          return;
        }

        (ws as any).isAlive = false;
        ws.ping();
      });
    }, 30000); // 30 seconds
  }

  private generateClientId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  public close() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.wss.close();
  }
}

// Usage in main server file:
// const wsServer = new EnhancedWebSocketServer(httpServer);
//
// // Broadcast hook events
// wsServer.broadcast({
//   type: 'hook_event',
//   data: { hookType: 'SessionStart', count: 1 }
// }, 'hooks');
```

## 4. Database Connection Pool

**File**: `apps/server/src/database/pool.ts`

```typescript
import Database from 'better-sqlite3';
import path from 'path';

interface ConnectionConfig {
  filename: string;
  options?: Database.Options;
  maxConnections?: number;
}

export class DatabasePool {
  private connections: Database[] = [];
  private availableConnections: Database[] = [];
  private maxConnections: number;
  private config: ConnectionConfig;

  constructor(config: ConnectionConfig) {
    this.config = config;
    this.maxConnections = config.maxConnections || 5;
    this.initializeConnections();
  }

  private initializeConnections() {
    for (let i = 0; i < this.maxConnections; i++) {
      const db = new Database(this.config.filename, {
        verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
        fileMustExist: false,
        timeout: 10000,
        ...this.config.options
      });

      // Set up optimal SQLite settings
      db.pragma('journal_mode = WAL');
      db.pragma('synchronous = NORMAL');
      db.pragma('cache_size = 10000');
      db.pragma('temp_store = memory');
      db.pragma('mmap_size = 268435456'); // 256MB

      this.connections.push(db);
      this.availableConnections.push(db);
    }
  }

  public async getConnection(): Promise<Database> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Database connection timeout'));
      }, 5000);

      const tryGetConnection = () => {
        if (this.availableConnections.length > 0) {
          clearTimeout(timeout);
          const connection = this.availableConnections.pop()!;
          resolve(connection);
        } else {
          setTimeout(tryGetConnection, 10);
        }
      };

      tryGetConnection();
    });
  }

  public releaseConnection(connection: Database) {
    if (this.connections.includes(connection)) {
      this.availableConnections.push(connection);
    }
  }

  public async executeQuery<T = any>(
    query: string,
    params: any[] = []
  ): Promise<T[]> {
    const connection = await this.getConnection();

    try {
      const statement = connection.prepare(query);
      const result = statement.all(...params);
      return result as T[];
    } catch (error) {
      throw new Error(`Database query failed: ${error.message}`);
    } finally {
      this.releaseConnection(connection);
    }
  }

  public async executeStatement(
    query: string,
    params: any[] = []
  ): Promise<Database.RunResult> {
    const connection = await this.getConnection();

    try {
      const statement = connection.prepare(query);
      return statement.run(...params);
    } catch (error) {
      throw new Error(`Database statement failed: ${error.message}`);
    } finally {
      this.releaseConnection(connection);
    }
  }

  public close() {
    this.connections.forEach(db => {
      try {
        db.close();
      } catch (error) {
        console.error('Error closing database connection:', error);
      }
    });
    this.connections = [];
    this.availableConnections = [];
  }
}

// Singleton database pool
const dbPool = new DatabasePool({
  filename: path.resolve('./database.db'),
  maxConnections: 5
});

export default dbPool;

// Usage in route handlers:
// const events = await dbPool.executeQuery(
//   'SELECT * FROM events WHERE hook_event_type = ? ORDER BY timestamp DESC LIMIT ?',
//   [hookType, limit]
// );
```

## 5. API Request Validation Middleware

**File**: `apps/server/src/middleware/validation.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { APIError } from './errorHandler';

interface ValidationRule {
  field: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;
  min?: number;
  max?: number;
  enum?: string[];
  pattern?: RegExp;
}

export function validateRequest(rules: ValidationRule[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];
    const data = { ...req.query, ...req.params, ...req.body };

    for (const rule of rules) {
      const value = data[rule.field];

      // Check required fields
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`${rule.field} is required`);
        continue;
      }

      // Skip validation for optional empty fields
      if (!rule.required && (value === undefined || value === null || value === '')) {
        continue;
      }

      // Type validation
      switch (rule.type) {
        case 'string':
          if (typeof value !== 'string') {
            errors.push(`${rule.field} must be a string`);
          } else {
            if (rule.min && value.length < rule.min) {
              errors.push(`${rule.field} must be at least ${rule.min} characters`);
            }
            if (rule.max && value.length > rule.max) {
              errors.push(`${rule.field} must be at most ${rule.max} characters`);
            }
            if (rule.pattern && !rule.pattern.test(value)) {
              errors.push(`${rule.field} format is invalid`);
            }
            if (rule.enum && !rule.enum.includes(value)) {
              errors.push(`${rule.field} must be one of: ${rule.enum.join(', ')}`);
            }
          }
          break;

        case 'number':
          const numValue = typeof value === 'string' ? parseInt(value, 10) : value;
          if (isNaN(numValue) || typeof numValue !== 'number') {
            errors.push(`${rule.field} must be a number`);
          } else {
            if (rule.min && numValue < rule.min) {
              errors.push(`${rule.field} must be at least ${rule.min}`);
            }
            if (rule.max && numValue > rule.max) {
              errors.push(`${rule.field} must be at most ${rule.max}`);
            }
          }
          break;

        case 'array':
          if (!Array.isArray(value)) {
            errors.push(`${rule.field} must be an array`);
          }
          break;

        case 'object':
          if (typeof value !== 'object' || Array.isArray(value)) {
            errors.push(`${rule.field} must be an object`);
          }
          break;
      }
    }

    if (errors.length > 0) {
      const error = new Error('Validation failed') as APIError;
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      error.details = { errors, fields: errors.map(e => e.split(' ')[0]) };
      return next(error);
    }

    next();
  };
}

// Hook type validation
export const validateHookType = validateRequest([
  {
    field: 'hookType',
    type: 'string',
    required: true,
    enum: [
      'session_start', 'user_prompt_submit', 'pre_tool_use', 'post_tool_use',
      'subagent_start', 'subagent_stop', 'stop', 'notification', 'precompact'
    ]
  }
]);

// Time window validation
export const validateTimeWindow = validateRequest([
  {
    field: 'timeWindow',
    type: 'number',
    min: 1000,        // 1 second minimum
    max: 2592000000   // 30 days maximum
  }
]);

// Pagination validation
export const validatePagination = validateRequest([
  {
    field: 'limit',
    type: 'number',
    min: 1,
    max: 1000
  },
  {
    field: 'offset',
    type: 'number',
    min: 0
  }
]);

// Usage in routes:
// router.get('/hooks/:hookType/enhanced-context',
//   validateHookType,
//   validateTimeWindow,
//   asyncHandler(getEnhancedContext)
// );
```

## 6. Frontend API Client with Retry Logic

**File**: `apps/client/src/utils/apiClient.ts`

```typescript
interface APIOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

interface APIResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
  success: boolean;
}

class APIClient {
  private baseURL: string;
  private defaultOptions: APIOptions;

  constructor(baseURL: string = 'http://localhost:3456/api') {
    this.baseURL = baseURL;
    this.defaultOptions = {
      timeout: 10000,
      retries: 3,
      retryDelay: 1000
    };
  }

  private async fetchWithRetry<T>(
    url: string,
    options: RequestInit & APIOptions = {}
  ): Promise<APIResponse<T>> {
    const { timeout, retries, retryDelay, ...fetchOptions } = {
      ...this.defaultOptions,
      ...options
    };

    let lastError: Error;

    for (let attempt = 0; attempt <= retries!; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(`${this.baseURL}${url}`, {
          ...fetchOptions,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...fetchOptions.headers
          }
        });

        clearTimeout(timeoutId);

        const responseData = await response.json();

        if (response.ok) {
          return {
            data: responseData,
            status: response.status,
            success: true
          };
        } else {
          // API error response
          return {
            error: responseData.error || `HTTP ${response.status}`,
            status: response.status,
            success: false
          };
        }

      } catch (error) {
        lastError = error as Error;

        // Don't retry on certain errors
        if (error.name === 'AbortError') {
          return {
            error: 'Request timeout',
            status: 408,
            success: false
          };
        }

        // Wait before retrying (unless last attempt)
        if (attempt < retries!) {
          await new Promise(resolve => setTimeout(resolve, retryDelay! * (attempt + 1)));
        }
      }
    }

    return {
      error: `Network error after ${retries! + 1} attempts: ${lastError!.message}`,
      status: 0,
      success: false
    };
  }

  // Hook coverage API
  async getHookCoverage(timeWindow?: number): Promise<APIResponse<any>> {
    const params = timeWindow ? `?timeWindow=${timeWindow}` : '';
    return this.fetchWithRetry(`/hook-coverage${params}`);
  }

  // Enhanced hook context
  async getHookContext(hookType: string, timeWindow?: number): Promise<APIResponse<any>> {
    const params = timeWindow ? `?timeWindow=${timeWindow}` : '';
    return this.fetchWithRetry(`/hooks/${hookType}/enhanced-context${params}`);
  }

  // Hook performance metrics
  async getHookPerformance(hookType: string, timeWindow?: number): Promise<APIResponse<any>> {
    const params = timeWindow ? `?timeWindow=${timeWindow}` : '';
    return this.fetchWithRetry(`/hooks/${hookType}/performance${params}`);
  }

  // Recent hook events
  async getRecentEvents(
    hookType: string,
    limit: number = 50,
    timeWindow?: number
  ): Promise<APIResponse<any[]>> {
    const params = new URLSearchParams();
    params.set('limit', limit.toString());
    if (timeWindow) params.set('timeWindow', timeWindow.toString());

    return this.fetchWithRetry(`/hooks/${hookType}/recent-events?${params}`);
  }

  // System health check
  async getHealth(): Promise<APIResponse<any>> {
    return this.fetchWithRetry('/health', { timeout: 5000, retries: 1 });
  }

  // Generate sample data (for testing)
  async generateSampleData(): Promise<APIResponse<any>> {
    return this.fetchWithRetry('/system/generate-sample-data', {
      method: 'POST'
    });
  }
}

// Create singleton instance
const apiClient = new APIClient();

export default apiClient;

// Usage in Vue components:
// import apiClient from '@/utils/apiClient';
//
// const { data, error, success } = await apiClient.getHookCoverage();
// if (success) {
//   this.hookData = data.hooks;
// } else {
//   this.errorMessage = error;
// }
```

## Summary

These API improvements provide:

1. **Enhanced Error Handling**: Comprehensive error catching, logging, and user-friendly error responses
2. **Dual Naming Convention Support**: Handles both CamelCase and snake_case event types
3. **Connection Pooling**: Optimized database connections with proper resource management
4. **Request Validation**: Input validation middleware with detailed error messages
5. **WebSocket Improvements**: Robust real-time communication with reconnection logic
6. **Frontend Resilience**: API client with retry logic and timeout handling

These fixes address the most common causes of empty dashboard tabs and provide a more reliable system overall.