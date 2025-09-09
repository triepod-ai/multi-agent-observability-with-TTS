/**
 * WebAssembly System Interface (WASI) Runtime Manager
 * Provides secure, isolated code execution with strict resource limits
 * Enhanced with AST-based security validation
 */

import * as ASTSecurityModule from './astSecurityValidator';

// Extract for compatibility  
const astSecurityValidator = ASTSecurityModule.astSecurityValidator;
type SecurityValidationResult = ASTSecurityModule.SecurityValidationResult;

export interface ResourceLimits {
  maxMemoryMB: number;
  maxCpuTimeMs: number;
  maxExecutionTimeMs: number;
  maxOutputSize: number;
}

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  metrics: ExecutionMetrics;
  securityValidation?: SecurityValidationResult;
}

export interface ExecutionMetrics {
  executionTimeMs: number;
  memoryUsedMB: number;
  cpuTimeMs: number;
  outputSize: number;
}

export interface CodeExecutionRequest {
  language: 'python' | 'javascript' | 'typescript';
  code: string;
  inputs?: string[];
  limits?: Partial<ResourceLimits>;
  skipSecurityValidation?: boolean; // For trusted code
  strictSecurityMode?: boolean; // Enhanced security checks
}

export class WasiRuntimeManager {
  private readonly defaultLimits: ResourceLimits = {
    maxMemoryMB: 32,
    maxCpuTimeMs: 5000,
    maxExecutionTimeMs: 10000,
    maxOutputSize: 10 * 1024 * 1024 // 10MB
  };

  private engines = new Map<string, any>();
  private resourceMonitor: ResourceMonitor;

  constructor() {
    this.resourceMonitor = new ResourceMonitor();
    this.initializeEngines();
  }

  /**
   * Execute code in a secure, isolated environment
   */
  async executeCode(request: CodeExecutionRequest): Promise<ExecutionResult> {
    const startTime = performance.now();
    const limits = { ...this.defaultLimits, ...request.limits };
    let securityValidation: SecurityValidationResult | undefined;
    
    try {
      // Validate resource limits
      this.validateLimits(limits);
      
      // Step 1: Security validation (unless explicitly skipped)
      if (!request.skipSecurityValidation) {
        console.log(`🔍 Performing security validation for ${request.language} code...`);
        
        securityValidation = await astSecurityValidator.validateCode(
          request.code,
          request.language,
          {
            strictMode: request.strictSecurityMode ?? true,
            maxRiskScore: request.strictSecurityMode ? 20 : 30,
            educationalMode: true,
            performanceTarget: 100
          }
        );

        console.log(`🛡️ Security validation complete - Risk Score: ${securityValidation.riskScore}/100`);

        // Block execution if security validation fails
        if (!securityValidation.isValid) {
          const securityErrors = securityValidation.violations
            .map(v => `${v.rule.name} (line ${v.line}): ${v.message}`)
            .join('\n');

          return {
            success: false,
            output: '',
            error: `Security validation failed:\n${securityErrors}\n\nEducational Info:\n${securityValidation.educationalFeedback.map(f => `• ${f.title}: ${f.message}`).join('\n')}`,
            metrics: {
              executionTimeMs: Math.round(performance.now() - startTime),
              memoryUsedMB: 0,
              cpuTimeMs: 0,
              outputSize: 0
            },
            securityValidation
          };
        }

        // Log warnings but allow execution
        if (securityValidation.warnings.length > 0) {
          console.log(`⚠️ Security warnings found: ${securityValidation.warnings.length}`);
        }
      }
      
      // Get appropriate engine
      const engine = this.getEngine(request.language);
      if (!engine) {
        throw new Error(`Unsupported language: ${request.language}`);
      }

      // Start resource monitoring
      const monitoringId = await this.resourceMonitor.startMonitoring(limits);
      
      try {
        console.log(`🚀 Executing ${request.language} code in secure environment...`);
        
        // Execute code with timeout
        const result = await this.executeWithTimeout(
          () => engine.execute(request.code, request.inputs || []),
          limits.maxExecutionTimeMs
        );

        // Get final metrics
        const metrics = await this.resourceMonitor.getMetrics(monitoringId);
        const executionTime = performance.now() - startTime;

        console.log(`✅ Code execution completed in ${Math.round(executionTime)}ms`);

        return {
          success: true,
          output: this.sanitizeOutput((result as any).output || '', limits.maxOutputSize),
          metrics: {
            ...metrics,
            executionTimeMs: Math.round(executionTime)
          },
          securityValidation
        };

      } finally {
        // Stop monitoring
        await this.resourceMonitor.stopMonitoring(monitoringId);
      }

    } catch (error) {
      const executionTime = performance.now() - startTime;
      
      console.error(`❌ Code execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Unknown execution error',
        metrics: {
          executionTimeMs: Math.round(executionTime),
          memoryUsedMB: 0,
          cpuTimeMs: 0,
          outputSize: 0
        },
        securityValidation
      };
    }
  }

  /**
   * Initialize execution engines for different languages
   */
  private async initializeEngines(): Promise<void> {
    try {
      // Initialize Python engine (Pyodide)
      const { PythonEngine } = await import('./pythonEngine');
      const pythonEngine = new PythonEngine();
      await pythonEngine.initialize();
      this.engines.set('python', pythonEngine);

      // Initialize JavaScript engine (native)
      const { JavaScriptEngine } = await import('./javascriptEngine');
      this.engines.set('javascript', new JavaScriptEngine());
      this.engines.set('typescript', new JavaScriptEngine()); // TypeScript transpiled to JS

    } catch (error) {
      console.error('Failed to initialize execution engines:', error);
    }
  }

  /**
   * Get execution engine for specified language
   */
  private getEngine(language: string): any {
    return this.engines.get(language);
  }

  /**
   * Execute function with timeout protection
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      fn()
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timeout));
    });
  }

  /**
   * Validate resource limits
   */
  private validateLimits(limits: ResourceLimits): void {
    if (limits.maxMemoryMB > 64) {
      throw new Error('Memory limit cannot exceed 64MB');
    }
    if (limits.maxCpuTimeMs > 10000) {
      throw new Error('CPU time limit cannot exceed 10 seconds');
    }
    if (limits.maxExecutionTimeMs > 30000) {
      throw new Error('Execution time limit cannot exceed 30 seconds');
    }
  }

  /**
   * Sanitize output to prevent XSS and limit size
   */
  private sanitizeOutput(output: string, maxSize: number): string {
    if (!output) return '';
    
    // Truncate if too large
    if (output.length > maxSize) {
      output = output.substring(0, maxSize) + '\n... (output truncated)';
    }

    // Basic XSS prevention
    return output
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  /**
   * Get available engines and their status
   */
  getEngineStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    
    for (const [language, engine] of this.engines) {
      status[language] = engine && engine.isReady ? engine.isReady() : false;
    }
    
    return status;
  }

  /**
   * Quick security validation for real-time feedback
   * Performs lightweight pattern-based checks only
   */
  async quickSecurityCheck(code: string, language: 'python' | 'javascript' | 'typescript'): Promise<{
    isValid: boolean;
    criticalIssues: number;
    riskScore: number;
  }> {
    try {
      const quickResult = await astSecurityValidator.quickValidate(code, language);
      
      return {
        isValid: quickResult.isValid,
        criticalIssues: quickResult.criticalIssues,
        riskScore: quickResult.criticalIssues * 25 // Rough estimate
      };
      
    } catch (error) {
      console.error('Quick security check failed:', error);
      return {
        isValid: false,
        criticalIssues: 1,
        riskScore: 100
      };
    }
  }

  /**
   * Full security validation without execution
   * Useful for pre-validation in editors
   */
  async validateCodeSecurity(
    code: string, 
    language: 'python' | 'javascript' | 'typescript',
    strictMode: boolean = true
  ): Promise<SecurityValidationResult> {
    return await astSecurityValidator.validateCode(code, language, {
      strictMode,
      maxRiskScore: strictMode ? 20 : 30,
      educationalMode: true,
      performanceTarget: 100
    });
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    for (const engine of this.engines.values()) {
      if (engine && typeof engine.cleanup === 'function') {
        await engine.cleanup();
      }
    }
    
    this.engines.clear();
    await this.resourceMonitor.cleanup();
  }
}

/**
 * Resource monitoring service
 */
class ResourceMonitor {
  private activeMonitors = new Map<string, ResourceMonitorSession>();
  private monitorCounter = 0;

  async startMonitoring(limits: ResourceLimits): Promise<string> {
    const id = `monitor_${++this.monitorCounter}`;
    const session = new ResourceMonitorSession(limits);
    
    this.activeMonitors.set(id, session);
    session.start();
    
    return id;
  }

  async getMetrics(sessionId: string): Promise<ExecutionMetrics> {
    const session = this.activeMonitors.get(sessionId);
    if (!session) {
      throw new Error('Invalid monitoring session ID');
    }
    
    return session.getMetrics();
  }

  async stopMonitoring(id: string): Promise<void> {
    const session = this.activeMonitors.get(id);
    if (session) {
      session.stop();
      this.activeMonitors.delete(id);
    }
  }

  async cleanup(): Promise<void> {
    for (const [id, session] of this.activeMonitors) {
      session.stop();
    }
    this.activeMonitors.clear();
  }
}

/**
 * Individual resource monitoring session
 */
class ResourceMonitorSession {
  private startTime: number = 0;
  private peakMemoryMB: number = 0;
  private cpuTimeMs: number = 0;
  private isActive: boolean = false;

  constructor(private limits: ResourceLimits) {}

  start(): void {
    this.startTime = performance.now();
    this.isActive = true;
    this.monitorResources();
  }

  stop(): void {
    this.isActive = false;
  }

  getMetrics(): ExecutionMetrics {
    return {
      executionTimeMs: Math.round(performance.now() - this.startTime),
      memoryUsedMB: this.peakMemoryMB,
      cpuTimeMs: this.cpuTimeMs,
      outputSize: 0 // Will be set by caller
    };
  }

  private monitorResources = async (): Promise<void> => {
    if (!this.isActive) return;

    try {
      // Monitor memory usage (approximation using performance API)
      const memInfo = (performance as any).memory;
      if (memInfo) {
        const currentMemoryMB = memInfo.usedJSHeapSize / (1024 * 1024);
        this.peakMemoryMB = Math.max(this.peakMemoryMB, currentMemoryMB);
        
        // Check memory limit
        if (currentMemoryMB > this.limits.maxMemoryMB) {
          throw new Error(`Memory limit exceeded: ${currentMemoryMB.toFixed(2)}MB > ${this.limits.maxMemoryMB}MB`);
        }
      }

      // Check execution time
      const elapsedTime = performance.now() - this.startTime;
      if (elapsedTime > this.limits.maxExecutionTimeMs) {
        throw new Error(`Execution time limit exceeded: ${elapsedTime.toFixed(0)}ms > ${this.limits.maxExecutionTimeMs}ms`);
      }

      // Continue monitoring
      setTimeout(() => this.monitorResources(), 100);
      
    } catch (error) {
      console.error('Resource monitoring error:', error);
      this.isActive = false;
    }
  }
}

// Export singleton instance
export const wasiRuntimeManager = new WasiRuntimeManager();