/**
 * Code analyzer service for parsing and analyzing different programming languages
 */

import { parse as babelParse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { parse as acornParse } from 'acorn';
import { simple as simpleWalk } from 'acorn-walk';

export interface AnalysisResult {
  success: boolean;
  ast?: any;
  errors: string[];
  warnings: string[];
  metrics: CodeMetrics;
}

export interface CodeMetrics {
  linesOfCode: number;
  complexity: number;
  functions: number;
  classes: number;
  imports: number;
  loops: LoopInfo[];
  callExpressions: CallInfo[];
}

export interface LoopInfo {
  type: 'for' | 'while' | 'do-while';
  line: number;
  column: number;
  hasBreakCondition: boolean;
  isInfinite: boolean;
}

export interface CallInfo {
  name: string;
  line: number;
  column: number;
  arguments: number;
}

export interface ASTNode {
  type: string;
  start: number;
  end: number;
  loc?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  [key: string]: any;
}

/**
 * Main code analyzer class
 */
export class CodeAnalyzer {
  
  /**
   * Analyze JavaScript/TypeScript code
   */
  async analyzeJavaScript(code: string, isTypeScript: boolean = false): Promise<AnalysisResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let ast: any = null;
    
    try {
      // Parse with Babel for better TypeScript support
      ast = babelParse(code, {
        sourceType: 'module',
        allowImportExportEverywhere: true,
        allowReturnOutsideFunction: true,
        plugins: [
          'jsx',
          ...(isTypeScript ? [
            'typescript',
            'decorators-legacy',
            'classProperties',
            'objectRestSpread'
          ] : [
            'decorators-legacy',
            'classProperties',
            'objectRestSpread'
          ])
        ],
        errorRecovery: true
      });

      // Extract metrics
      const metrics = this.extractJSMetrics(ast, code);
      
      // Perform basic safety checks
      this.performJSSafetyChecks(ast, warnings);

      return {
        success: true,
        ast,
        errors,
        warnings,
        metrics
      };

    } catch (error) {
      errors.push(`Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Try fallback parsing with Acorn
      try {
        ast = acornParse(code, {
          ecmaVersion: 2022,
          sourceType: 'module',
          allowReturnOutsideFunction: true,
          locations: true
        });

        const metrics = this.extractJSMetricsAcorn(ast, code);
        warnings.push('Parsed with fallback parser, some features may not be available');

        return {
          success: true,
          ast,
          errors,
          warnings,
          metrics
        };
      } catch (fallbackError) {
        errors.push(`Fallback parse error: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`);
      }
    }

    return {
      success: false,
      errors,
      warnings,
      metrics: this.getEmptyMetrics()
    };
  }

  /**
   * Analyze Python code using Pyodide's AST parser
   */
  async analyzePython(code: string): Promise<AnalysisResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      // Check if we're in a test environment or Pyodide is not available
      if (typeof window === 'undefined' || (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test')) {
        return this.analyzePythonFallback(code);
      }
      
      // Load Pyodide if not already loaded
      const pyodide = await this.loadPyodide();
      
      // Parse Python AST using Pyodide
      const result = pyodide.runPython(`
import ast
import json

def analyze_python_code(code):
    try:
        tree = ast.parse(code)
        
        # Extract metrics
        metrics = {
            'linesOfCode': len([line for line in code.split('\\n') if line.strip()]),
            'complexity': 1,  # Start with base complexity
            'functions': 0,
            'classes': 0,
            'imports': 0,
            'loops': [],
            'callExpressions': []
        }
        
        # Walk the AST to gather information
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                metrics['functions'] += 1
                metrics['complexity'] += 1
            elif isinstance(node, ast.ClassDef):
                metrics['classes'] += 1
                metrics['complexity'] += 1
            elif isinstance(node, (ast.Import, ast.ImportFrom)):
                metrics['imports'] += 1
            elif isinstance(node, (ast.For, ast.While)):
                loop_info = {
                    'type': 'for' if isinstance(node, ast.For) else 'while',
                    'line': node.lineno if hasattr(node, 'lineno') else 0,
                    'column': node.col_offset if hasattr(node, 'col_offset') else 0,
                    'hasBreakCondition': any(isinstance(n, ast.Break) for n in ast.walk(node)),
                    'isInfinite': False  # Will be determined by security validator
                }
                metrics['loops'].append(loop_info)
                metrics['complexity'] += 1
            elif isinstance(node, ast.Call):
                func_name = ''
                if isinstance(node.func, ast.Name):
                    func_name = node.func.id
                elif isinstance(node.func, ast.Attribute):
                    func_name = node.func.attr
                
                call_info = {
                    'name': func_name,
                    'line': node.lineno if hasattr(node, 'lineno') else 0,
                    'column': node.col_offset if hasattr(node, 'col_offset') else 0,
                    'arguments': len(node.args)
                }
                metrics['callExpressions'].append(call_info)
        
        return {
            'success': True,
            'ast': ast.dump(tree),
            'errors': [],
            'metrics': metrics
        }
    except SyntaxError as e:
        return {
            'success': False,
            'errors': [f'Python syntax error: {str(e)}'],
            'metrics': {
                'linesOfCode': 0,
                'complexity': 0,
                'functions': 0,
                'classes': 0,
                'imports': 0,
                'loops': [],
                'callExpressions': []
            }
        }
    except Exception as e:
        return {
            'success': False,
            'errors': [f'Python analysis error: {str(e)}'],
            'metrics': {
                'linesOfCode': 0,
                'complexity': 0,
                'functions': 0,
                'classes': 0,
                'imports': 0,
                'loops': [],
                'callExpressions': []
            }
        }

# Analyze the provided code
result = analyze_python_code(${JSON.stringify(code)})
json.dumps(result)
      `);

      const analysisResult = JSON.parse(result);
      
      return {
        success: analysisResult.success,
        ast: analysisResult.ast,
        errors: analysisResult.errors || [],
        warnings,
        metrics: analysisResult.metrics
      };

    } catch (error) {
      errors.push(`Python analysis error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        success: false,
        errors,
        warnings,
        metrics: this.getEmptyMetrics()
      };
    }
  }

  /**
   * Extract metrics from Babel AST
   */
  private extractJSMetrics(ast: any, code: string): CodeMetrics {
    const metrics: CodeMetrics = {
      linesOfCode: code.split('\n').filter(line => line.trim()).length,
      complexity: 1, // Base complexity
      functions: 0,
      classes: 0,
      imports: 0,
      loops: [],
      callExpressions: []
    };

    traverse(ast, {
      FunctionDeclaration: () => {
        metrics.functions++;
        metrics.complexity++;
      },
      FunctionExpression: () => {
        metrics.functions++;
        metrics.complexity++;
      },
      ArrowFunctionExpression: () => {
        metrics.functions++;
        metrics.complexity++;
      },
      ClassDeclaration: () => {
        metrics.classes++;
        metrics.complexity++;
      },
      ImportDeclaration: () => {
        metrics.imports++;
      },
      WhileStatement: (path) => {
        const node = path.node;
        const hasBreak = this.hasBreakStatement(path);
        const isInfinite = t.isBooleanLiteral(node.test, { value: true }) ||
                          (t.isNumericLiteral(node.test) && node.test.value !== 0);
        
        metrics.loops.push({
          type: 'while',
          line: node.loc?.start.line || 0,
          column: node.loc?.start.column || 0,
          hasBreakCondition: hasBreak,
          isInfinite: isInfinite && !hasBreak
        });
        metrics.complexity++;
      },
      ForStatement: (path) => {
        const node = path.node;
        const hasBreak = this.hasBreakStatement(path);
        const isInfinite = !node.init && !node.test && !node.update;
        
        metrics.loops.push({
          type: 'for',
          line: node.loc?.start.line || 0,
          column: node.loc?.start.column || 0,
          hasBreakCondition: hasBreak,
          isInfinite: isInfinite && !hasBreak
        });
        metrics.complexity++;
      },
      DoWhileStatement: (path) => {
        const node = path.node;
        const hasBreak = this.hasBreakStatement(path);
        const isInfinite = t.isBooleanLiteral(node.test, { value: true });
        
        metrics.loops.push({
          type: 'do-while',
          line: node.loc?.start.line || 0,
          column: node.loc?.start.column || 0,
          hasBreakCondition: hasBreak,
          isInfinite: isInfinite && !hasBreak
        });
        metrics.complexity++;
      },
      CallExpression: (path) => {
        const node = path.node;
        let name = '';
        
        if (t.isIdentifier(node.callee)) {
          name = node.callee.name;
        } else if (t.isMemberExpression(node.callee) && t.isIdentifier(node.callee.property)) {
          name = node.callee.property.name;
        }
        
        metrics.callExpressions.push({
          name,
          line: node.loc?.start.line || 0,
          column: node.loc?.start.column || 0,
          arguments: node.arguments.length
        });
      }
    });

    return metrics;
  }

  /**
   * Extract metrics from Acorn AST (fallback)
   */
  private extractJSMetricsAcorn(ast: any, code: string): CodeMetrics {
    const metrics: CodeMetrics = {
      linesOfCode: code.split('\n').filter(line => line.trim()).length,
      complexity: 1,
      functions: 0,
      classes: 0,
      imports: 0,
      loops: [],
      callExpressions: []
    };

    simpleWalk(ast, {
      FunctionDeclaration: () => {
        metrics.functions++;
        metrics.complexity++;
      },
      FunctionExpression: () => {
        metrics.functions++;
        metrics.complexity++;
      },
      ArrowFunctionExpression: () => {
        metrics.functions++;
        metrics.complexity++;
      },
      ClassDeclaration: () => {
        metrics.classes++;
        metrics.complexity++;
      },
      ImportDeclaration: () => {
        metrics.imports++;
      },
      WhileStatement: (node: any) => {
        metrics.loops.push({
          type: 'while',
          line: node.loc?.start.line || 0,
          column: node.loc?.start.column || 0,
          hasBreakCondition: false, // Simplified analysis
          isInfinite: false
        });
        metrics.complexity++;
      },
      ForStatement: (node: any) => {
        metrics.loops.push({
          type: 'for',
          line: node.loc?.start.line || 0,
          column: node.loc?.start.column || 0,
          hasBreakCondition: false, // Simplified analysis
          isInfinite: false
        });
        metrics.complexity++;
      },
      CallExpression: (node: any) => {
        let name = '';
        if (node.callee.type === 'Identifier') {
          name = node.callee.name;
        } else if (node.callee.type === 'MemberExpression' && node.callee.property) {
          name = node.callee.property.name || node.callee.property.value;
        }
        
        metrics.callExpressions.push({
          name,
          line: node.loc?.start.line || 0,
          column: node.loc?.start.column || 0,
          arguments: node.arguments?.length || 0
        });
      }
    });

    return metrics;
  }

  /**
   * Check for break statements in a loop
   */
  private hasBreakStatement(path: any): boolean {
    let hasBreak = false;
    
    path.traverse({
      BreakStatement: () => {
        hasBreak = true;
      }
    });
    
    return hasBreak;
  }

  /**
   * Perform basic safety checks on JavaScript AST
   */
  private performJSSafetyChecks(ast: any, warnings: string[]): void {
    traverse(ast, {
      CallExpression: (path) => {
        const node = path.node;
        
        // Check for eval usage
        if (t.isIdentifier(node.callee, { name: 'eval' })) {
          warnings.push('eval() usage detected - potential security risk');
        }
        
        // Check for Function constructor
        if (t.isIdentifier(node.callee, { name: 'Function' })) {
          warnings.push('Function constructor usage detected - potential security risk');
        }
      },
      
      NewExpression: (path) => {
        const node = path.node;
        
        // Check for Function constructor
        if (t.isIdentifier(node.callee, { name: 'Function' })) {
          warnings.push('Function constructor usage detected - potential security risk');
        }
      }
    });
  }

  /**
   * Fallback Python analysis for test environments or when Pyodide is not available
   */
  private analyzePythonFallback(code: string): AnalysisResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Basic line-by-line analysis for testing
    const lines = code.split('\n').filter(line => line.trim());
    const metrics: CodeMetrics = {
      linesOfCode: lines.length,
      complexity: 1,
      functions: 0,
      classes: 0,
      imports: 0,
      loops: [],
      callExpressions: []
    };

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      const lineNumber = index + 1;
      
      // Count functions
      if (trimmedLine.startsWith('def ')) {
        metrics.functions++;
        metrics.complexity++;
      }
      
      // Count classes
      if (trimmedLine.startsWith('class ')) {
        metrics.classes++;
        metrics.complexity++;
      }
      
      // Count imports
      if (trimmedLine.startsWith('import ') || trimmedLine.startsWith('from ')) {
        metrics.imports++;
      }
      
      // Detect loops
      if (trimmedLine.startsWith('for ') || trimmedLine.startsWith('while ')) {
        const loopType = trimmedLine.startsWith('for ') ? 'for' : 'while';
        const isInfinite = loopType === 'while' && 
          (trimmedLine.includes('while True:') || trimmedLine.includes('while 1:'));
        
        metrics.loops.push({
          type: loopType as 'for' | 'while',
          line: lineNumber,
          column: 0,
          hasBreakCondition: false, // Simplified - would need deeper analysis
          isInfinite
        });
        metrics.complexity++;
      }
      
      // Detect function calls
      const callMatches = trimmedLine.match(/(\w+)\s*\(/g);
      if (callMatches) {
        callMatches.forEach(match => {
          const functionName = match.replace(/\s*\(.*$/, '');
          metrics.callExpressions.push({
            name: functionName,
            line: lineNumber,
            column: trimmedLine.indexOf(match),
            arguments: 0 // Simplified
          });
        });
      }
    });

    // Check for basic syntax errors
    try {
      // Very basic syntax validation
      const openParens = (code.match(/\(/g) || []).length;
      const closeParens = (code.match(/\)/g) || []).length;
      const openBrackets = (code.match(/\[/g) || []).length;
      const closeBrackets = (code.match(/\]/g) || []).length;
      const openBraces = (code.match(/\{/g) || []).length;
      const closeBraces = (code.match(/\}/g) || []).length;
      
      if (openParens !== closeParens) {
        errors.push('Mismatched parentheses');
      }
      if (openBrackets !== closeBrackets) {
        errors.push('Mismatched brackets');
      }
      if (openBraces !== closeBraces) {
        errors.push('Mismatched braces');
      }
    } catch (error) {
      errors.push('Syntax validation error');
    }

    return {
      success: errors.length === 0,
      ast: `# Fallback Python AST analysis\n# Code analysis completed`,
      errors,
      warnings,
      metrics
    };
  }

  /**
   * Load Pyodide for Python analysis
   */
  private async loadPyodide(): Promise<any> {
    if ((globalThis as any).pyodide) {
      return (globalThis as any).pyodide;
    }

    const { loadPyodide } = await import('pyodide');
    const pyodide = await loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.28.2/full/',
      stdout: () => {}, // Suppress output
      stderr: () => {}  // Suppress errors
    });

    (globalThis as any).pyodide = pyodide;
    return pyodide;
  }

  /**
   * Get empty metrics structure
   */
  private getEmptyMetrics(): CodeMetrics {
    return {
      linesOfCode: 0,
      complexity: 0,
      functions: 0,
      classes: 0,
      imports: 0,
      loops: [],
      callExpressions: []
    };
  }

  /**
   * Get code complexity score (0-10 scale)
   */
  getComplexityScore(metrics: CodeMetrics): number {
    const baseScore = Math.min(metrics.complexity / 10, 5); // Max 5 from complexity
    const loopScore = Math.min(metrics.loops.length * 0.5, 2); // Max 2 from loops
    const functionScore = Math.min(metrics.functions * 0.2, 2); // Max 2 from functions
    const locScore = Math.min(metrics.linesOfCode / 100, 1); // Max 1 from LOC
    
    return Math.min(baseScore + loopScore + functionScore + locScore, 10);
  }

  /**
   * Check if code appears to be safe for execution
   */
  isSafeForExecution(analysisResult: AnalysisResult): boolean {
    if (!analysisResult.success) {
      return false;
    }

    // Check for critical warnings
    const criticalPatterns = ['eval()', 'Function constructor', 'subprocess', 'os.system'];
    return !analysisResult.warnings.some(warning => 
      criticalPatterns.some(pattern => warning.includes(pattern))
    );
  }
}