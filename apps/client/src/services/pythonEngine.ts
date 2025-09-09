/**
 * Python Engine using Pyodide for secure Python code execution
 * Provides isolated Python runtime with WebAssembly sandboxing
 */

export interface PythonExecutionResult {
  output: string;
  error?: string;
  globals?: Record<string, any>;
}

export class PythonEngine {
  private pyodide: any = null;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    // Start initialization immediately
    this.initializationPromise = this.initializePyodide();
  }

  /**
   * Initialize Pyodide Python runtime
   */
  async initialize(): Promise<void> {
    if (this.initializationPromise) {
      await this.initializationPromise;
    }
  }

  private async initializePyodide(): Promise<void> {
    try {
      // Load Pyodide from CDN
      const pyodideScript = document.createElement('script');
      pyodideScript.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js';
      
      await new Promise((resolve, reject) => {
        pyodideScript.onload = resolve;
        pyodideScript.onerror = reject;
        document.head.appendChild(pyodideScript);
      });

      // Initialize Pyodide
      this.pyodide = await (globalThis as any).loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/',
        stdout: (text: string) => this.captureOutput(text),
        stderr: (text: string) => this.captureError(text)
      });

      // Install common packages
      await this.installCommonPackages();

      this.isInitialized = true;
      console.log('Pyodide Python engine initialized successfully');

    } catch (error) {
      console.error('Failed to initialize Pyodide:', error);
      throw new Error('Python engine initialization failed');
    }
  }

  /**
   * Install commonly used Python packages
   */
  private async installCommonPackages(): Promise<void> {
    try {
      // Install micropip for package management
      await this.pyodide.loadPackage(['micropip']);
      
      const micropip = this.pyodide.pyimport('micropip');
      
      // Install common educational packages
      const packages = [
        'numpy',
        'matplotlib', 
        'pandas',
        'requests'
      ];

      for (const pkg of packages) {
        try {
          await micropip.install(pkg);
          console.log(`Installed Python package: ${pkg}`);
        } catch (error) {
          console.warn(`Failed to install ${pkg}:`, error);
        }
      }

    } catch (error) {
      console.warn('Failed to install some Python packages:', error);
    }
  }

  /**
   * Execute Python code in secure environment
   */
  async execute(code: string, inputs: string[] = []): Promise<PythonExecutionResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.pyodide) {
      throw new Error('Python engine not available');
    }

    // Clear previous output
    this.clearOutput();

    try {
      // Prepare input handling
      const inputCode = this.prepareInputHandling(inputs);
      
      // Prepare the code with safety restrictions
      const safeCode = this.wrapCodeWithSafety(inputCode + '\n' + code);

      // Execute the code
      const result = await this.pyodide.runPython(safeCode);

      // Get captured output
      const output = this.getOutput();
      
      // Get globals for inspection (useful for educational purposes)
      const globals = this.extractGlobals();

      return {
        output: output || (result !== undefined ? String(result) : ''),
        globals
      };

    } catch (error) {
      const errorOutput = this.getErrorOutput();
      return {
        output: this.getOutput(),
        error: errorOutput || (error instanceof Error ? error.message : 'Unknown Python error'),
        globals: {}
      };
    }
  }

  /**
   * Prepare input handling for interactive programs
   */
  private prepareInputHandling(inputs: string[]): string {
    if (inputs.length === 0) return '';

    const inputsJson = JSON.stringify(inputs);
    return `
import sys
from io import StringIO

# Mock input function with predefined inputs
_inputs = ${inputsJson}
_input_index = 0

def input(prompt=''):
    global _input_index, _inputs
    if prompt:
        print(prompt, end='')
    if _input_index < len(_inputs):
        value = _inputs[_input_index]
        _input_index += 1
        print(value)  # Echo the input
        return value
    else:
        return ''

# Replace built-in input
__builtins__['input'] = input
`;
  }

  /**
   * Wrap code with security restrictions
   */
  private wrapCodeWithSafety(code: string): string {
    return `
import sys
import os
import builtins

# Disable dangerous functions
dangerous_functions = ['open', 'exec', 'eval', 'compile', '__import__']
for func_name in dangerous_functions:
    if hasattr(builtins, func_name):
        setattr(builtins, func_name, lambda *args, **kwargs: None)

# Limit recursion depth
sys.setrecursionlimit(100)

# Execute user code
try:
${code.split('\n').map(line => '    ' + line).join('\n')}
except RecursionError:
    print("Error: Maximum recursion depth exceeded")
except MemoryError:
    print("Error: Out of memory")
except Exception as e:
    print(f"Error: {type(e).__name__}: {e}")
`;
  }

  private outputBuffer: string[] = [];
  private errorBuffer: string[] = [];

  private captureOutput(text: string): void {
    this.outputBuffer.push(text);
  }

  private captureError(text: string): void {
    this.errorBuffer.push(text);
  }

  private clearOutput(): void {
    this.outputBuffer = [];
    this.errorBuffer = [];
  }

  private getOutput(): string {
    return this.outputBuffer.join('');
  }

  private getErrorOutput(): string {
    return this.errorBuffer.join('');
  }

  /**
   * Extract global variables for educational inspection
   */
  private extractGlobals(): Record<string, any> {
    if (!this.pyodide) return {};

    try {
      const globals = this.pyodide.globals.toJs();
      const result: Record<string, any> = {};

      for (const [key, value] of globals) {
        // Filter out built-ins and private variables
        if (!key.startsWith('_') && !key.startsWith('__') && 
            !['sys', 'os', 'builtins', 'input'].includes(key)) {
          
          try {
            // Convert Python objects to JavaScript
            result[key] = this.convertPythonValue(value);
          } catch (error) {
            result[key] = `<${typeof value}>`;
          }
        }
      }

      return result;
    } catch (error) {
      console.warn('Failed to extract globals:', error);
      return {};
    }
  }

  /**
   * Convert Python values to JavaScript for inspection
   */
  private convertPythonValue(value: any): any {
    if (value === null || value === undefined) return value;
    
    try {
      // Handle basic types
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return value;
      }

      // Handle Python objects
      if (value.toJs && typeof value.toJs === 'function') {
        return value.toJs();
      }

      // Handle arrays/lists
      if (Array.isArray(value)) {
        return value.map(item => this.convertPythonValue(item));
      }

      // Default to string representation
      return String(value);
    } catch (error) {
      return `<conversion error: ${error instanceof Error ? error.message : 'unknown'}>`;
    }
  }

  /**
   * Check if engine is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.pyodide !== null;
  }

  /**
   * Get engine status information
   */
  getStatus(): {
    initialized: boolean;
    version?: string;
    packages: string[];
  } {
    return {
      initialized: this.isInitialized,
      version: this.pyodide ? this.pyodide.version : undefined,
      packages: this.isInitialized ? this.getInstalledPackages() : []
    };
  }

  /**
   * Get list of installed Python packages
   */
  private getInstalledPackages(): string[] {
    if (!this.pyodide) return [];

    try {
      const result = this.pyodide.runPython(`
import sys
import json
modules = list(sys.modules.keys())
# Filter to show only relevant packages
packages = [m for m in modules if not m.startswith('_') and '.' not in m]
json.dumps(sorted(packages))
      `);
      
      return JSON.parse(result) || [];
    } catch (error) {
      console.warn('Failed to get installed packages:', error);
      return [];
    }
  }

  /**
   * Install additional Python package
   */
  async installPackage(packageName: string): Promise<boolean> {
    if (!this.isReady()) {
      throw new Error('Python engine not ready');
    }

    try {
      const micropip = this.pyodide.pyimport('micropip');
      await micropip.install(packageName);
      console.log(`Successfully installed Python package: ${packageName}`);
      return true;
    } catch (error) {
      console.error(`Failed to install package ${packageName}:`, error);
      return false;
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.pyodide) {
      try {
        this.pyodide.destroy();
      } catch (error) {
        console.warn('Error during Pyodide cleanup:', error);
      }
      this.pyodide = null;
    }
    
    this.isInitialized = false;
    this.clearOutput();
  }
}

// Export default instance
export default PythonEngine;