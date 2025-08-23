/**
 * Code Validator - Multi-layer security validation for hook code execution
 * 
 * Security Features:
 * - AST analysis for malicious code patterns
 * - Pattern matching for dangerous operations
 * - Resource limiting validation
 * - Input sanitization
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  suggestions?: string[];
}

export interface SecurityPolicy {
  maxExecutionTime: number;
  maxMemoryUsage: number;
  allowedTools: string[];
  blockedPatterns: string[];
  allowNetworkAccess: boolean;
  allowFileSystem: boolean;
}

// Default security policy - highly restrictive
const DEFAULT_POLICY: SecurityPolicy = {
  maxExecutionTime: 10000, // 10 seconds
  maxMemoryUsage: 100 * 1024 * 1024, // 100MB
  allowedTools: ['echo', 'date', 'pwd', 'whoami'],
  blockedPatterns: [
    'rm -rf',
    'sudo',
    'chmod 777',
    'eval',
    'exec',
    '__import__',
    'subprocess',
    'os.system',
    'shell=True',
    'dangerous_module'
  ],
  allowNetworkAccess: false,
  allowFileSystem: false
};

export class CodeValidator {
  private policy: SecurityPolicy;

  constructor(policy: Partial<SecurityPolicy> = {}) {
    this.policy = { ...DEFAULT_POLICY, ...policy };
  }

  /**
   * Validate code using multi-layer security checks
   */
  async validate(code: string, language: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      riskLevel: 'safe',
      suggestions: []
    };

    try {
      // Layer 1: Syntax validation
      await this.validateSyntax(code, language, result);

      // Layer 2: AST analysis (for supported languages)
      await this.analyzeAST(code, language, result);

      // Layer 3: Pattern matching for dangerous operations
      await this.checkDangerousPatterns(code, result);

      // Layer 4: Resource usage estimation
      await this.estimateResourceUsage(code, result);

      // Layer 5: Security policy compliance
      await this.validatePolicy(code, result);

      // Calculate final risk level
      this.calculateRiskLevel(result);

    } catch (error) {
      result.valid = false;
      result.errors.push(`Validation error: ${error}`);
      result.riskLevel = 'critical';
    }

    return result;
  }

  /**
   * Basic syntax validation
   */
  private async validateSyntax(code: string, language: string, result: ValidationResult): Promise<void> {
    if (!code.trim()) {
      result.errors.push('Code cannot be empty');
      result.valid = false;
      return;
    }

    // Check for basic syntax issues
    switch (language.toLowerCase()) {
      case 'python':
        await this.validatePythonSyntax(code, result);
        break;
      case 'javascript':
      case 'typescript':
        await this.validateJavaScriptSyntax(code, result);
        break;
      case 'bash':
        await this.validateBashSyntax(code, result);
        break;
      default:
        result.warnings.push(`Syntax validation not available for language: ${language}`);
    }
  }

  /**
   * Python syntax validation using basic AST parsing
   */
  private async validatePythonSyntax(code: string, result: ValidationResult): Promise<void> {
    // Check for balanced brackets/parens
    const brackets = { '(': ')', '[': ']', '{': '}' };
    const stack: string[] = [];
    
    for (const char of code) {
      if (char in brackets) {
        stack.push(brackets[char as keyof typeof brackets]);
      } else if (Object.values(brackets).includes(char)) {
        if (stack.length === 0 || stack.pop() !== char) {
          result.errors.push('Mismatched brackets/parentheses');
          result.valid = false;
          return;
        }
      }
    }

    if (stack.length > 0) {
      result.errors.push('Unclosed brackets/parentheses');
      result.valid = false;
    }

    // Check for basic Python structure
    if (!code.includes('def ') && !code.includes('import ') && !code.includes('print') && !code.includes('#')) {
      result.warnings.push('Code may not be valid Python');
    }
  }

  /**
   * JavaScript syntax validation
   */
  private async validateJavaScriptSyntax(code: string, result: ValidationResult): Promise<void> {
    try {
      // Basic validation - check for common syntax errors
      if (code.includes('function') || code.includes('=>') || code.includes('const ') || code.includes('let ')) {
        // Looks like JavaScript
        if (!code.trim().endsWith(';') && !code.trim().endsWith('}')) {
          result.warnings.push('Consider ending statements with semicolons');
        }
      }
    } catch (error) {
      result.errors.push('JavaScript syntax error detected');
      result.valid = false;
    }
  }

  /**
   * Bash syntax validation
   */
  private async validateBashSyntax(code: string, result: ValidationResult): Promise<void> {
    // Check for dangerous bash patterns
    const dangerousBashPatterns = [
      /rm\s+-rf\s+\/$/,
      /sudo\s+rm/,
      />\s*\/dev\/sd[a-z]/,
      /format\s+[c-z]:/,
      /dd\s+if=/
    ];

    for (const pattern of dangerousBashPatterns) {
      if (pattern.test(code)) {
        result.errors.push('Dangerous bash operation detected');
        result.valid = false;
        result.riskLevel = 'critical';
        return;
      }
    }
  }

  /**
   * AST analysis for detecting malicious code patterns
   */
  private async analyzeAST(code: string, language: string, result: ValidationResult): Promise<void> {
    // Simplified AST analysis using pattern matching
    const dangerousImports = [
      'subprocess',
      'os',
      'eval',
      'exec',
      '__import__',
      'importlib',
      'socket',
      'urllib',
      'requests'
    ];

    const dangerousFunctions = [
      'eval(',
      'exec(',
      'compile(',
      '__import__(',
      'getattr(',
      'setattr(',
      'delattr(',
      'globals(',
      'locals('
    ];

    // Check for dangerous imports
    for (const imp of dangerousImports) {
      if (code.includes(`import ${imp}`) || code.includes(`from ${imp}`)) {
        result.warnings.push(`Potentially dangerous import: ${imp}`);
        if (['subprocess', 'os', 'eval'].includes(imp)) {
          result.errors.push(`Blocked dangerous import: ${imp}`);
          result.valid = false;
        }
      }
    }

    // Check for dangerous function calls
    for (const func of dangerousFunctions) {
      if (code.includes(func)) {
        result.errors.push(`Dangerous function detected: ${func}`);
        result.valid = false;
      }
    }
  }

  /**
   * Check for dangerous patterns using regex
   */
  private async checkDangerousPatterns(code: string, result: ValidationResult): Promise<void> {
    for (const pattern of this.policy.blockedPatterns) {
      if (code.toLowerCase().includes(pattern.toLowerCase())) {
        result.errors.push(`Blocked dangerous pattern: ${pattern}`);
        result.valid = false;
      }
    }

    // Additional dynamic patterns
    const criticalPatterns = [
      /\/dev\/sd[a-z]/,
      /\/proc\/\*/,
      /password.*=.*["']/i,
      /api[_-]?key.*=.*["']/i,
      /token.*=.*["']/i,
      /secret.*=.*["']/i
    ];

    for (const pattern of criticalPatterns) {
      if (pattern.test(code)) {
        result.errors.push('Potentially sensitive information detected');
        result.valid = false;
        result.suggestions?.push('Remove sensitive data before execution');
      }
    }
  }

  /**
   * Estimate resource usage of code
   */
  private async estimateResourceUsage(code: string, result: ValidationResult): Promise<void> {
    const lines = code.split('\n').length;
    
    // Basic heuristics for resource estimation
    if (lines > 100) {
      result.warnings.push('Large code block may consume significant resources');
    }

    // Check for loops that might consume resources
    const resourceIntensivePatterns = [
      /while\s+True/,
      /for.*in.*range\(\d{4,}\)/,
      /while.*==.*True/,
      /\.join\(.*\*\d{3,}/
    ];

    for (const pattern of resourceIntensivePatterns) {
      if (pattern.test(code)) {
        result.warnings.push('Resource-intensive operation detected');
      }
    }
  }

  /**
   * Validate against security policy
   */
  private async validatePolicy(code: string, result: ValidationResult): Promise<void> {
    // Check if code tries to use blocked tools
    for (const tool of this.policy.allowedTools) {
      if (code.includes(tool) && !result.warnings.some(w => w.includes('allowed tool'))) {
        result.suggestions?.push(`Using allowed tool: ${tool}`);
      }
    }

    // Check for network access attempts
    if (!this.policy.allowNetworkAccess) {
      const networkPatterns = ['http://', 'https://', 'ftp://', 'socket', 'requests', 'urllib'];
      for (const pattern of networkPatterns) {
        if (code.includes(pattern)) {
          result.errors.push('Network access is not allowed in this environment');
          result.valid = false;
        }
      }
    }

    // Check for file system access
    if (!this.policy.allowFileSystem) {
      const filePatterns = ['open(', 'file(', 'with open', 'os.path', 'pathlib'];
      for (const pattern of filePatterns) {
        if (code.includes(pattern)) {
          result.warnings.push('File system access detected - will be sandboxed');
        }
      }
    }
  }

  /**
   * Calculate overall risk level based on validation results
   */
  private calculateRiskLevel(result: ValidationResult): void {
    if (!result.valid) {
      result.riskLevel = 'critical';
      return;
    }

    const errorCount = result.errors.length;
    const warningCount = result.warnings.length;

    if (errorCount > 0) {
      result.riskLevel = 'critical';
    } else if (warningCount > 3) {
      result.riskLevel = 'high';
    } else if (warningCount > 1) {
      result.riskLevel = 'medium';
    } else if (warningCount > 0) {
      result.riskLevel = 'low';
    } else {
      result.riskLevel = 'safe';
    }
  }

  /**
   * Sanitize code input before validation
   */
  sanitizeInput(code: string): string {
    return code
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\t/g, '    ') // Convert tabs to spaces
      .trim();
  }

  /**
   * Get risk level color for UI display
   */
  getRiskLevelColor(riskLevel: string): string {
    const colors = {
      safe: 'text-green-400',
      low: 'text-yellow-400',
      medium: 'text-orange-400',
      high: 'text-red-400',
      critical: 'text-red-600'
    };
    return colors[riskLevel as keyof typeof colors] || 'text-gray-400';
  }

  /**
   * Get risk level icon for UI display
   */
  getRiskLevelIcon(riskLevel: string): string {
    const icons = {
      safe: '✅',
      low: '⚠️',
      medium: '🟡',
      high: '🔴',
      critical: '🚨'
    };
    return icons[riskLevel as keyof typeof icons] || '❓';
  }
}

// Export singleton instance with default policy
export const codeValidator = new CodeValidator();