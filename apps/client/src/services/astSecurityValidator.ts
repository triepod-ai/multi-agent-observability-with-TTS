/**
 * AST-based security validator for code execution environments
 * Provides comprehensive security analysis with educational feedback
 */

import { CodeAnalyzer } from './codeAnalyzer';
import type { AnalysisResult, CodeMetrics, LoopInfo, CallInfo } from './codeAnalyzer';
import * as SecurityPatterns from '../utils/securityPatterns';

// Extract types and functions for compatibility
type SecurityRule = SecurityPatterns.SecurityRule;
type SecurityViolation = SecurityPatterns.SecurityViolation;
const getSecurityRules = SecurityPatterns.getSecurityRules;
const SECURITY_CATEGORIES = SecurityPatterns.SECURITY_CATEGORIES;
const SEVERITY_LEVELS = SecurityPatterns.SEVERITY_LEVELS;
import traverse from '@babel/traverse';
import * as t from '@babel/types';

export interface SecurityValidationResult {
  isValid: boolean;
  violations: SecurityViolation[];
  warnings: SecurityViolation[];
  riskScore: number; // 0-100 scale
  educationalFeedback: EducationalFeedback[];
  analysis: AnalysisResult;
  performance: ValidationPerformance;
}

export interface EducationalFeedback {
  category: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  exampleSafe?: string;
  exampleUnsafe?: string;
  learnMoreUrl?: string;
}

export interface ValidationPerformance {
  analysisTimeMs: number;
  validationTimeMs: number;
  totalTimeMs: number;
  rulesChecked: number;
  astNodeCount: number;
}

export interface ValidationOptions {
  strictMode?: boolean;
  maxRiskScore?: number;
  enabledCategories?: string[];
  educationalMode?: boolean;
  performanceTarget?: number; // Target validation time in ms
}

/**
 * Main AST Security Validator class
 */
export class ASTSecurityValidator {
  private codeAnalyzer: CodeAnalyzer;
  private readonly defaultOptions: ValidationOptions = {
    strictMode: true,
    maxRiskScore: 30, // Out of 100
    enabledCategories: Object.keys(SECURITY_CATEGORIES),
    educationalMode: true,
    performanceTarget: 100 // 100ms target
  };

  constructor() {
    this.codeAnalyzer = new CodeAnalyzer();
  }

  /**
   * Validate code for security issues
   */
  async validateCode(
    code: string, 
    language: 'javascript' | 'typescript' | 'python',
    options: ValidationOptions = {}
  ): Promise<SecurityValidationResult> {
    const startTime = performance.now();
    const opts = { ...this.defaultOptions, ...options };
    
    // Step 1: Parse and analyze code
    const analysisStart = performance.now();
    let analysis: AnalysisResult;
    
    try {
      switch (language) {
        case 'javascript':
          analysis = await this.codeAnalyzer.analyzeJavaScript(code, false);
          break;
        case 'typescript':
          analysis = await this.codeAnalyzer.analyzeJavaScript(code, true);
          break;
        case 'python':
          analysis = await this.codeAnalyzer.analyzePython(code);
          break;
        default:
          throw new Error(`Unsupported language: ${language}`);
      }
    } catch (error) {
      return this.createErrorResult(
        `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        performance.now() - startTime
      );
    }
    
    const analysisTime = performance.now() - analysisStart;

    // Step 2: Security validation
    const validationStart = performance.now();
    const { violations, warnings, riskScore, educationalFeedback } = await this.performSecurityValidation(
      code, 
      language, 
      analysis, 
      opts
    );
    const validationTime = performance.now() - validationStart;

    const totalTime = performance.now() - startTime;
    
    // Check if validation meets performance target
    if (totalTime > opts.performanceTarget! && opts.educationalMode) {
      educationalFeedback.push({
        category: 'performance',
        title: 'Validation Performance',
        message: `Code validation took ${totalTime.toFixed(1)}ms, which exceeds the ${opts.performanceTarget}ms target. Consider simplifying the code for faster validation.`,
        severity: 'info'
      });
    }

    const isValid = riskScore <= opts.maxRiskScore! && violations.length === 0;

    return {
      isValid,
      violations,
      warnings,
      riskScore,
      educationalFeedback,
      analysis,
      performance: {
        analysisTimeMs: Math.round(analysisTime),
        validationTimeMs: Math.round(validationTime),
        totalTimeMs: Math.round(totalTime),
        rulesChecked: getSecurityRules(language).length,
        astNodeCount: this.countASTNodes(analysis.ast)
      }
    };
  }

  /**
   * Perform comprehensive security validation
   */
  private async performSecurityValidation(
    code: string,
    language: string,
    analysis: AnalysisResult,
    options: ValidationOptions
  ): Promise<{
    violations: SecurityViolation[];
    warnings: SecurityViolation[];
    riskScore: number;
    educationalFeedback: EducationalFeedback[];
  }> {
    const violations: SecurityViolation[] = [];
    const warnings: SecurityViolation[] = [];
    const educationalFeedback: EducationalFeedback[] = [];
    
    if (!analysis.success || !analysis.ast) {
      return {
        violations: [{
          rule: {
            id: 'parse-failure',
            name: 'Parse Error',
            description: 'Code could not be parsed',
            severity: 'critical',
            category: 'code-injection',
            educationalMessage: 'Code must be syntactically valid to be executed safely.'
          },
          line: 0,
          column: 0,
          code: '',
          message: 'Failed to parse code'
        }],
        warnings: [],
        riskScore: 100,
        educationalFeedback: []
      };
    }

    const securityRules = getSecurityRules(language)
      .filter(rule => options.enabledCategories!.includes(rule.category));

    // Pattern-based validation
    await this.validateWithPatterns(code, securityRules, violations, warnings, educationalFeedback);
    
    // AST-based validation
    if (language === 'javascript' || language === 'typescript') {
      await this.validateJavaScriptAST(analysis.ast, code, securityRules, violations, warnings, educationalFeedback);
    } else if (language === 'python') {
      await this.validatePythonAST(analysis.ast, code, securityRules, violations, warnings, educationalFeedback);
    }

    // Loop analysis
    this.validateLoops(analysis.metrics.loops, violations, warnings, educationalFeedback);
    
    // Complexity analysis
    this.validateComplexity(analysis.metrics, warnings, educationalFeedback);

    // Calculate risk score
    const riskScore = this.calculateRiskScore(violations, warnings, analysis.metrics);

    // Add category-based educational feedback
    if (options.educationalMode) {
      this.addCategoryFeedback(violations, warnings, educationalFeedback);
    }

    return { violations, warnings, riskScore, educationalFeedback };
  }

  /**
   * Pattern-based validation using regex patterns
   */
  private async validateWithPatterns(
    code: string,
    rules: SecurityRule[],
    violations: SecurityViolation[],
    warnings: SecurityViolation[],
    educationalFeedback: EducationalFeedback[]
  ): Promise<void> {
    const lines = code.split('\n');
    
    for (const rule of rules) {
      if (!rule.pattern) continue;
      
      const pattern = rule.pattern instanceof RegExp ? rule.pattern : new RegExp(rule.pattern, 'gi');
      
      lines.forEach((line, lineIndex) => {
        let match;
        pattern.lastIndex = 0; // Reset regex state
        
        while ((match = pattern.exec(line)) !== null) {
          const violation: SecurityViolation = {
            rule,
            line: lineIndex + 1,
            column: match.index,
            code: match[0],
            message: rule.description
          };
          
          if (rule.severity === 'critical' || rule.severity === 'high') {
            violations.push(violation);
          } else {
            warnings.push(violation);
          }
          
          // Add educational feedback
          if (rule.exampleSafe || rule.exampleUnsafe) {
            educationalFeedback.push({
              category: rule.category,
              title: rule.name,
              message: rule.educationalMessage,
              severity: rule.severity === 'critical' || rule.severity === 'high' ? 'error' : 'warning',
              exampleSafe: rule.exampleSafe,
              exampleUnsafe: rule.exampleUnsafe
            });
          }
        }
      });
    }
  }

  /**
   * JavaScript/TypeScript AST validation
   */
  private async validateJavaScriptAST(
    ast: any,
    code: string,
    rules: SecurityRule[],
    violations: SecurityViolation[],
    warnings: SecurityViolation[],
    educationalFeedback: EducationalFeedback[]
  ): Promise<void> {
    const astRules = rules.filter(rule => rule.astNodeTypes && rule.astNodeTypes.length > 0);
    
    traverse(ast, {
      CallExpression: (path) => {
        const node = path.node;
        this.checkCallExpression(node, astRules, violations, warnings, educationalFeedback);
      },
      
      NewExpression: (path) => {
        const node = path.node;
        this.checkNewExpression(node, astRules, violations, warnings, educationalFeedback);
      },
      
      WhileStatement: (path) => {
        const node = path.node;
        this.checkWhileStatement(node, astRules, violations, warnings, educationalFeedback);
      },
      
      ForStatement: (path) => {
        const node = path.node;
        this.checkForStatement(node, astRules, violations, warnings, educationalFeedback);
      }
    });
  }

  /**
   * Python AST validation (simplified - would need full AST parsing)
   */
  private async validatePythonAST(
    astString: string,
    code: string,
    rules: SecurityRule[],
    violations: SecurityViolation[],
    warnings: SecurityViolation[],
    educationalFeedback: EducationalFeedback[]
  ): Promise<void> {
    // For now, Python validation relies on pattern matching
    // In a full implementation, we would parse the AST string and traverse it
    // This is a simplified version that focuses on the architecture
  }

  /**
   * Check call expressions for security issues
   */
  private checkCallExpression(
    node: any,
    rules: SecurityRule[],
    violations: SecurityViolation[],
    warnings: SecurityViolation[],
    educationalFeedback: EducationalFeedback[]
  ): void {
    let functionName = '';
    
    if (t.isIdentifier(node.callee)) {
      functionName = node.callee.name;
    } else if (t.isMemberExpression(node.callee) && t.isIdentifier(node.callee.property)) {
      functionName = node.callee.property.name;
    }

    const applicableRules = rules.filter(rule => 
      rule.astNodeTypes?.includes('CallExpression') &&
      (rule.id.includes(functionName.toLowerCase()) || 
       rule.pattern && new RegExp(rule.pattern).test(functionName))
    );

    for (const rule of applicableRules) {
      const violation: SecurityViolation = {
        rule,
        line: node.loc?.start.line || 0,
        column: node.loc?.start.column || 0,
        code: functionName,
        message: `${rule.name}: ${rule.description}`
      };

      if (rule.severity === 'critical' || rule.severity === 'high') {
        violations.push(violation);
      } else {
        warnings.push(violation);
      }
    }
  }

  /**
   * Check new expressions for security issues
   */
  private checkNewExpression(
    node: any,
    rules: SecurityRule[],
    violations: SecurityViolation[],
    warnings: SecurityViolation[],
    educationalFeedback: EducationalFeedback[]
  ): void {
    let constructorName = '';
    
    if (t.isIdentifier(node.callee)) {
      constructorName = node.callee.name;
    }

    const applicableRules = rules.filter(rule => 
      rule.astNodeTypes?.includes('NewExpression') &&
      (rule.id.includes(constructorName.toLowerCase()) || 
       rule.pattern && new RegExp(rule.pattern).test(constructorName))
    );

    for (const rule of applicableRules) {
      const violation: SecurityViolation = {
        rule,
        line: node.loc?.start.line || 0,
        column: node.loc?.start.column || 0,
        code: `new ${constructorName}`,
        message: `${rule.name}: ${rule.description}`
      };

      if (rule.severity === 'critical' || rule.severity === 'high') {
        violations.push(violation);
      } else {
        warnings.push(violation);
      }
    }
  }

  /**
   * Check while statements for infinite loops
   */
  private checkWhileStatement(
    node: any,
    rules: SecurityRule[],
    violations: SecurityViolation[],
    warnings: SecurityViolation[],
    educationalFeedback: EducationalFeedback[]
  ): void {
    const isInfinite = t.isBooleanLiteral(node.test, { value: true }) ||
                      (t.isNumericLiteral(node.test) && node.test.value !== 0);
    
    if (isInfinite) {
      const rule = rules.find(r => r.id === 'js-while-true');
      if (rule) {
        violations.push({
          rule,
          line: node.loc?.start.line || 0,
          column: node.loc?.start.column || 0,
          code: 'while (true)',
          message: 'Potentially infinite while loop detected'
        });
      }
    }
  }

  /**
   * Check for statements for infinite loops
   */
  private checkForStatement(
    node: any,
    rules: SecurityRule[],
    violations: SecurityViolation[],
    warnings: SecurityViolation[],
    educationalFeedback: EducationalFeedback[]
  ): void {
    const isInfinite = !node.init && !node.test && !node.update;
    
    if (isInfinite) {
      const rule = rules.find(r => r.id === 'js-for-infinite');
      if (rule) {
        violations.push({
          rule,
          line: node.loc?.start.line || 0,
          column: node.loc?.start.column || 0,
          code: 'for (;;)',
          message: 'Infinite for loop detected'
        });
      }
    }
  }

  /**
   * Validate loops for infinite execution potential
   */
  private validateLoops(
    loops: LoopInfo[],
    violations: SecurityViolation[],
    warnings: SecurityViolation[],
    educationalFeedback: EducationalFeedback[]
  ): void {
    const infiniteLoops = loops.filter(loop => loop.isInfinite);
    
    if (infiniteLoops.length > 0) {
      educationalFeedback.push({
        category: 'infinite-loop',
        title: 'Infinite Loop Detection',
        message: `Found ${infiniteLoops.length} potentially infinite loop(s). Infinite loops can freeze the execution environment and consume excessive resources.`,
        severity: 'error',
        exampleSafe: 'for (let i = 0; i < 100; i++) { /* bounded loop */ }',
        exampleUnsafe: 'while (true) { /* no break condition */ }'
      });
    }

    const loopsWithoutBreaks = loops.filter(loop => !loop.hasBreakCondition && loop.type === 'while');
    if (loopsWithoutBreaks.length > 0) {
      educationalFeedback.push({
        category: 'infinite-loop',
        title: 'Loop Safety',
        message: 'While loops should have clear break conditions to prevent infinite execution.',
        severity: 'warning',
        exampleSafe: 'while (condition && counter < maxIterations) { ... }',
        exampleUnsafe: 'while (someCondition) { /* no break or counter */ }'
      });
    }
  }

  /**
   * Validate code complexity
   */
  private validateComplexity(
    metrics: CodeMetrics,
    warnings: SecurityViolation[],
    educationalFeedback: EducationalFeedback[]
  ): void {
    const complexity = this.codeAnalyzer.getComplexityScore(metrics);
    
    if (complexity > 7) {
      educationalFeedback.push({
        category: 'complexity',
        title: 'Code Complexity',
        message: `Code complexity score is ${complexity.toFixed(1)}/10. High complexity can make code harder to review for security issues and more prone to bugs.`,
        severity: 'warning'
      });
    }

    if (metrics.linesOfCode > 100) {
      educationalFeedback.push({
        category: 'complexity',
        title: 'Code Length',
        message: `Code has ${metrics.linesOfCode} lines. Consider breaking large code blocks into smaller, more manageable functions for better security review.`,
        severity: 'info'
      });
    }
  }

  /**
   * Calculate overall risk score (0-100)
   */
  private calculateRiskScore(
    violations: SecurityViolation[],
    warnings: SecurityViolation[],
    metrics: CodeMetrics
  ): number {
    // For empty code, return 0 risk score
    if (metrics.linesOfCode === 0) {
      return 0;
    }

    let score = 0;
    
    // Violations contribute heavily to risk score
    violations.forEach(violation => {
      switch (violation.rule.severity) {
        case 'critical':
          score += 40;
          break;
        case 'high':
          score += 25;
          break;
        case 'medium':
          score += 10;
          break;
        case 'low':
          score += 5;
          break;
      }
    });

    // Warnings contribute less
    warnings.forEach(warning => {
      switch (warning.rule.severity) {
        case 'critical':
          score += 20;
          break;
        case 'high':
          score += 15;
          break;
        case 'medium':
          score += 5;
          break;
        case 'low':
          score += 2;
          break;
      }
    });

    // Complexity contributes to risk only if there are violations or it's very high
    const complexityScore = this.codeAnalyzer.getComplexityScore(metrics);
    if (violations.length > 0 || warnings.length > 0 || complexityScore > 5) {
      score += Math.min(complexityScore * 0.5, 5); // Reduced complexity impact
    }

    // Infinite loops are high risk
    const infiniteLoops = metrics.loops.filter(loop => loop.isInfinite).length;
    score += infiniteLoops * 15;

    return Math.min(score, 100);
  }

  /**
   * Add category-based educational feedback
   */
  private addCategoryFeedback(
    violations: SecurityViolation[],
    warnings: SecurityViolation[],
    educationalFeedback: EducationalFeedback[]
  ): void {
    const allViolations = [...violations, ...warnings];
    const categories = new Set(allViolations.map(v => v.rule.category));

    categories.forEach(category => {
      const categoryInfo = SECURITY_CATEGORIES[category as keyof typeof SECURITY_CATEGORIES];
      if (categoryInfo && !educationalFeedback.some(f => f.category === category)) {
        educationalFeedback.push({
          category,
          title: categoryInfo.name,
          message: categoryInfo.description,
          severity: 'info'
        });
      }
    });
  }

  /**
   * Count AST nodes for performance metrics
   */
  private countASTNodes(ast: any): number {
    if (!ast) return 0;
    
    let count = 0;
    
    try {
      if (typeof ast === 'string') {
        // Python AST is returned as string, estimate node count
        return ast.split('\n').length;
      }
      
      // For JavaScript AST, traverse and count
      traverse(ast, {
        enter: () => {
          count++;
        }
      });
    } catch (error) {
      // If traversal fails, return estimate based on code length
      return 10; // Conservative estimate
    }
    
    return count;
  }

  /**
   * Create error result for failed validation
   */
  private createErrorResult(errorMessage: string, totalTime: number): SecurityValidationResult {
    return {
      isValid: false,
      violations: [{
        rule: {
          id: 'validation-error',
          name: 'Validation Error',
          description: errorMessage,
          severity: 'critical',
          category: 'code-injection',
          educationalMessage: 'Code validation failed. Please check your code syntax and try again.'
        },
        line: 0,
        column: 0,
        code: '',
        message: errorMessage
      }],
      warnings: [],
      riskScore: 100,
      educationalFeedback: [{
        category: 'validation',
        title: 'Validation Failed',
        message: errorMessage,
        severity: 'error'
      }],
      analysis: {
        success: false,
        errors: [errorMessage],
        warnings: [],
        metrics: {
          linesOfCode: 0,
          complexity: 0,
          functions: 0,
          classes: 0,
          imports: 0,
          loops: [],
          callExpressions: []
        }
      },
      performance: {
        analysisTimeMs: 0,
        validationTimeMs: 0,
        totalTimeMs: Math.round(totalTime),
        rulesChecked: 0,
        astNodeCount: 0
      }
    };
  }

  /**
   * Quick validation check (for real-time feedback)
   */
  async quickValidate(
    code: string,
    language: 'javascript' | 'typescript' | 'python'
  ): Promise<{ isValid: boolean; criticalIssues: number }> {
    const startTime = performance.now();
    
    try {
      const rules = getSecurityRules(language)
        .filter(rule => rule.severity === 'critical');
      
      let criticalIssues = 0;
      
      // Quick pattern-based check only
      for (const rule of rules) {
        if (rule.pattern) {
          const pattern = rule.pattern instanceof RegExp ? rule.pattern : new RegExp(rule.pattern, 'gi');
          const matches = code.match(pattern);
          if (matches) {
            criticalIssues += matches.length;
          }
        }
      }
      
      return {
        isValid: criticalIssues === 0,
        criticalIssues
      };
      
    } catch (error) {
      return {
        isValid: false,
        criticalIssues: 1
      };
    }
  }
}

// Export singleton instance
export const astSecurityValidator = new ASTSecurityValidator();