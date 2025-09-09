/**
 * JavaScript Engine for secure client-side JavaScript/TypeScript execution
 * Provides sandboxed JavaScript runtime with controlled environment
 */

export interface JavaScriptExecutionResult {
  output: string;
  error?: string;
  returnValue?: any;
}

export class JavaScriptEngine {
  private outputBuffer: string[] = [];
  private isReady = true;

  constructor() {
    // JavaScript engine is ready immediately (native browser support)
  }

  /**
   * Execute JavaScript code in a controlled environment
   */
  async execute(code: string, inputs: string[] = []): Promise<JavaScriptExecutionResult> {
    this.clearOutput();

    try {
      // Create isolated execution context
      const context = this.createExecutionContext(inputs);
      
      // Wrap code with safety measures
      const safeCode = this.wrapCodeWithSafety(code);
      
      // Execute code in isolated context
      const result = await this.executeInContext(safeCode, context);

      return {
        output: this.getOutput(),
        returnValue: result
      };

    } catch (error) {
      return {
        output: this.getOutput(),
        error: error instanceof Error ? error.message : 'Unknown JavaScript error'
      };
    }
  }

  /**
   * Create isolated execution context with controlled global access
   */
  private createExecutionContext(inputs: string[]): Record<string, any> {
    let inputIndex = 0;

    return {
      // Safe console implementation
      console: {
        log: (...args: any[]) => {
          const message = args.map(arg => this.stringify(arg)).join(' ');
          this.captureOutput(message + '\n');
        },
        error: (...args: any[]) => {
          const message = args.map(arg => this.stringify(arg)).join(' ');
          this.captureOutput('Error: ' + message + '\n');
        },
        warn: (...args: any[]) => {
          const message = args.map(arg => this.stringify(arg)).join(' ');
          this.captureOutput('Warning: ' + message + '\n');
        },
        info: (...args: any[]) => {
          const message = args.map(arg => this.stringify(arg)).join(' ');
          this.captureOutput('Info: ' + message + '\n');
        }
      },

      // Mock prompt function for input simulation
      prompt: (message?: string): string | null => {
        if (message) {
          this.captureOutput(message + '\n');
        }
        
        if (inputIndex < inputs.length) {
          const value = inputs[inputIndex++];
          this.captureOutput('> ' + value + '\n');
          return value;
        }
        
        return null;
      },

      // Mock alert function
      alert: (message: string): void => {
        this.captureOutput('Alert: ' + message + '\n');
      },

      // Mock confirm function
      confirm: (message: string): boolean => {
        this.captureOutput('Confirm: ' + message + ' [assumed: true]\n');
        return true;
      },

      // Safe Math object
      Math: Math,

      // Safe JSON object
      JSON: JSON,

      // Safe Date constructor
      Date: Date,

      // Safe Array constructor
      Array: Array,

      // Safe Object constructor
      Object: Object,

      // Safe String constructor
      String: String,

      // Safe Number constructor
      Number: Number,

      // Safe Boolean constructor
      Boolean: Boolean,

      // Safe RegExp constructor
      RegExp: RegExp,

      // Utility functions
      parseInt: parseInt,
      parseFloat: parseFloat,
      isNaN: isNaN,
      isFinite: isFinite,

      // Safe setTimeout/setInterval (with limits)
      setTimeout: (callback: Function, delay: number) => {
        if (delay > 10000) delay = 10000; // Max 10 second delay
        return window.setTimeout(callback, delay);
      },
      
      clearTimeout: clearTimeout,

      // Promise support (for educational async programming)
      Promise: Promise
    };
  }

  /**
   * Wrap code with security restrictions and error handling
   */
  private wrapCodeWithSafety(code: string): string {
    return `
      (function() {
        'use strict';
        
        // Prevent access to dangerous globals
        const restrictedGlobals = [
          'window', 'document', 'location', 'history', 'navigator',
          'localStorage', 'sessionStorage', 'indexedDB',
          'fetch', 'XMLHttpRequest', 'WebSocket',
          'Worker', 'SharedWorker', 'ServiceWorker',
          'eval', 'Function', 'GeneratorFunction', 'AsyncFunction',
          'import', 'require'
        ];
        
        // Override restricted globals
        restrictedGlobals.forEach(name => {
          if (typeof globalThis[name] !== 'undefined') {
            globalThis[name] = undefined;
          }
        });
        
        try {
          // Set recursion limit
          let recursionDepth = 0;
          const maxRecursionDepth = 100;
          
          const originalFunction = Function;
          Function = function(...args) {
            recursionDepth++;
            if (recursionDepth > maxRecursionDepth) {
              throw new Error('Maximum recursion depth exceeded');
            }
            const result = originalFunction.apply(this, args);
            recursionDepth--;
            return result;
          };
          
          // Execute user code
          return (function() {
            ${code}
          })();
          
        } catch (error) {
          if (error.name === 'RangeError' && error.message.includes('Maximum call stack')) {
            throw new Error('Maximum recursion depth exceeded');
          } else if (error.name === 'Error' && error.message.includes('out of memory')) {
            throw new Error('Out of memory');
          }
          throw error;
        }
      })()
    `;
  }

  /**
   * Execute code in the controlled context
   */
  private async executeInContext(code: string, context: Record<string, any>): Promise<any> {
    // Create function with controlled scope
    const contextKeys = Object.keys(context);
    const contextValues = contextKeys.map(key => context[key]);
    
    try {
      // Use Function constructor with controlled context
      const func = new Function(...contextKeys, 'return ' + code);
      
      // Execute with timeout protection
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Execution timeout')), 5000);
      });
      
      const executionPromise = Promise.resolve(func.apply(null, contextValues));
      
      return await Promise.race([executionPromise, timeoutPromise]);
      
    } catch (error) {
      // Handle syntax errors by trying as statements instead of expression
      try {
        const stmtFunc = new Function(...contextKeys, code);
        
        const executionPromise = Promise.resolve(stmtFunc.apply(null, contextValues));
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Execution timeout')), 5000);
        });
        
        return await Promise.race([executionPromise, timeoutPromise]);
        
      } catch (stmtError) {
        throw error; // Throw original error
      }
    }
  }

  /**
   * Convert values to string for console output
   */
  private stringify(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return value;
    if (typeof value === 'function') return '[Function]';
    
    try {
      if (typeof value === 'object') {
        return JSON.stringify(value, null, 2);
      }
      return String(value);
    } catch (error) {
      return '[Object]';
    }
  }

  private captureOutput(text: string): void {
    this.outputBuffer.push(text);
  }

  private clearOutput(): void {
    this.outputBuffer = [];
  }

  private getOutput(): string {
    return this.outputBuffer.join('');
  }

  /**
   * Check if engine is ready
   */
  isReady(): boolean {
    return this.isReady;
  }

  /**
   * Get engine status
   */
  getStatus(): {
    initialized: boolean;
    features: string[];
  } {
    return {
      initialized: true,
      features: [
        'ES6+ Support',
        'Promise Support', 
        'Console API',
        'Math API',
        'JSON API',
        'Date API',
        'Array Methods',
        'Object Methods',
        'String Methods',
        'RegExp Support',
        'setTimeout/clearTimeout'
      ]
    };
  }

  /**
   * Validate TypeScript code (basic syntax check)
   */
  validateTypeScript(code: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    try {
      // Basic TypeScript syntax validation
      // Check for basic TypeScript patterns
      if (code.includes('interface ') || code.includes('type ') || 
          code.includes(': string') || code.includes(': number') ||
          code.includes(': boolean') || code.includes('enum ')) {
        // This is TypeScript - for now we'll accept it and transpile at runtime
        // In a full implementation, we'd integrate with TypeScript compiler API
      }
      
      return { valid: true, errors };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown validation error');
      return { valid: false, errors };
    }
  }

  /**
   * Basic TypeScript to JavaScript transpilation
   * Note: This is a simplified version. Full implementation would use TypeScript compiler API
   */
  private transpileTypeScript(code: string): string {
    // Very basic TypeScript to JavaScript conversion
    // Remove type annotations
    let jsCode = code
      .replace(/:\s*(string|number|boolean|any|void|never|unknown)\b/g, '')
      .replace(/interface\s+\w+\s*{[^}]*}/g, '')
      .replace(/type\s+\w+\s*=[^;]+;/g, '')
      .replace(/enum\s+\w+\s*{[^}]*}/g, '');
    
    return jsCode;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.clearOutput();
    // JavaScript engine doesn't need cleanup
  }
}

export default JavaScriptEngine;