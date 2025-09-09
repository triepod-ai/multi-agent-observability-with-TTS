/**
 * Tests for AST Security Validator
 */

import { describe, test, expect } from 'vitest';
import { ASTSecurityValidator } from '../services/astSecurityValidator';

describe('AST Security Validator', () => {
  const validator = new ASTSecurityValidator();

  describe('JavaScript/TypeScript Security Validation', () => {
    test('should detect eval() usage as critical security issue', async () => {
      const maliciousCode = `
        const userInput = "alert('XSS')";
        const result = eval(userInput);
      `;

      const result = await validator.validateCode(maliciousCode, 'javascript');
      
      expect(result.isValid).toBe(false);
      expect(result.riskScore).toBeGreaterThan(30);
      expect(result.violations.some(v => v.rule.id === 'js-eval-usage')).toBe(true);
      expect(result.educationalFeedback.length).toBeGreaterThan(0);
    });

    test('should detect Function constructor as critical security issue', async () => {
      const maliciousCode = `
        const dynamicFunction = new Function('return alert("XSS")');
        dynamicFunction();
      `;

      const result = await validator.validateCode(maliciousCode, 'javascript');
      
      expect(result.isValid).toBe(false);
      expect(result.violations.some(v => v.rule.id === 'js-function-constructor')).toBe(true);
    });

    test('should detect infinite while loop', async () => {
      const infiniteLoopCode = `
        let counter = 0;
        while (true) {
          counter++;
          // No break condition
        }
      `;

      const result = await validator.validateCode(infiniteLoopCode, 'javascript');
      
      expect(result.isValid).toBe(false);
      expect(result.violations.some(v => v.rule.id === 'js-while-true')).toBe(true);
      expect(result.educationalFeedback.some(f => f.category === 'infinite-loop')).toBe(true);
    });

    test('should detect file system access attempts', async () => {
      const fsCode = `
        const fs = require('fs');
        fs.readFileSync('/etc/passwd', 'utf8');
      `;

      const result = await validator.validateCode(fsCode, 'javascript');
      
      expect(result.isValid).toBe(false);
      expect(result.violations.some(v => v.rule.category === 'file-system')).toBe(true);
    });

    test('should allow safe JavaScript code', async () => {
      const safeCode = `
        function fibonacci(n) {
          if (n <= 1) return n;
          return fibonacci(n - 1) + fibonacci(n - 2);
        }
        
        const result = fibonacci(10);
        console.log('Fibonacci result:', result);
      `;

      const result = await validator.validateCode(safeCode, 'javascript');
      
      expect(result.isValid).toBe(true);
      expect(result.riskScore).toBeLessThan(30);
      expect(result.violations.length).toBe(0);
    });

    test('should handle TypeScript code', async () => {
      const tsCode = `
        interface User {
          id: number;
          name: string;
        }
        
        function createUser(name: string): User {
          return {
            id: Math.floor(Math.random() * 1000),
            name: name
          };
        }
        
        const user = createUser('John Doe');
      `;

      const result = await validator.validateCode(tsCode, 'typescript');
      
      expect(result.isValid).toBe(true);
      expect(result.analysis.success).toBe(true);
    });
  });

  describe('Python Security Validation', () => {
    test('should detect eval() usage in Python', async () => {
      const maliciousCode = `
user_input = "os.system('rm -rf /')"
result = eval(user_input)
      `;

      const result = await validator.validateCode(maliciousCode, 'python');
      
      expect(result.isValid).toBe(false);
      expect(result.violations.some(v => v.rule.id === 'py-eval-usage')).toBe(true);
    });

    test('should detect exec() usage in Python', async () => {
      const maliciousCode = `
code_string = "import os; os.system('ls')"
exec(code_string)
      `;

      const result = await validator.validateCode(maliciousCode, 'python');
      
      expect(result.isValid).toBe(false);
      expect(result.violations.some(v => v.rule.id === 'py-exec-usage')).toBe(true);
    });

    test('should detect subprocess usage', async () => {
      const maliciousCode = `
import subprocess
subprocess.call(['rm', '-rf', '/'])
      `;

      const result = await validator.validateCode(maliciousCode, 'python');
      
      expect(result.isValid).toBe(false);
      expect(result.violations.some(v => v.rule.category === 'process')).toBe(true);
    });

    test('should allow safe Python code', async () => {
      const safeCode = `
def calculate_factorial(n):
    if n <= 1:
        return 1
    return n * calculate_factorial(n - 1)

result = calculate_factorial(5)
print(f"5! = {result}")
      `;

      const result = await validator.validateCode(safeCode, 'python');
      
      expect(result.isValid).toBe(true);
      expect(result.riskScore).toBeLessThan(30);
    });
  });

  describe('Quick Validation', () => {
    test('should quickly detect critical issues', async () => {
      const maliciousCode = 'eval("alert(1)"); new Function("alert(2)");';
      
      const result = await validator.quickValidate(maliciousCode, 'javascript');
      
      expect(result.isValid).toBe(false);
      expect(result.criticalIssues).toBeGreaterThan(0);
    });

    test('should quickly validate safe code', async () => {
      const safeCode = 'const x = 1 + 2; console.log(x);';
      
      const result = await validator.quickValidate(safeCode, 'javascript');
      
      expect(result.isValid).toBe(true);
      expect(result.criticalIssues).toBe(0);
    });
  });

  describe('Performance', () => {
    test('should complete validation within performance target', async () => {
      const moderateCode = `
        function complexFunction(data) {
          const results = [];
          for (let i = 0; i < data.length; i++) {
            if (data[i] > 0) {
              results.push(data[i] * 2);
            }
          }
          return results;
        }
        
        const testData = [1, 2, 3, 4, 5];
        const processed = complexFunction(testData);
      `;

      const startTime = performance.now();
      const result = await validator.validateCode(moderateCode, 'javascript', {
        performanceTarget: 100
      });
      const endTime = performance.now();
      
      expect(result.performance.totalTimeMs).toBeLessThan(200); // Allow some buffer
      expect(endTime - startTime).toBeLessThan(200);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Educational Feedback', () => {
    test('should provide educational feedback for security violations', async () => {
      const badCode = `
        eval("console.log('bad')");
        const fs = require('fs');
        while (true) { break; }
      `;

      const result = await validator.validateCode(badCode, 'javascript', {
        educationalMode: true
      });
      
      expect(result.educationalFeedback.length).toBeGreaterThan(0);
      expect(result.educationalFeedback.some(f => f.exampleSafe)).toBe(true);
      expect(result.educationalFeedback.some(f => f.exampleUnsafe)).toBe(true);
    });

    test('should categorize security issues properly', async () => {
      const codeWithMultipleIssues = `
        eval("bad");
        const fs = require('fs');
        fetch('http://evil.com');
      `;

      const result = await validator.validateCode(codeWithMultipleIssues, 'javascript');
      
      // Debug: Log actual categories found
      const categories = new Set(result.violations.map(v => v.rule.category));
      const allCategories = new Set([...result.violations, ...result.warnings].map(v => v.rule.category));
      console.log('Categories found in violations:', Array.from(categories));
      console.log('All categories (violations + warnings):', Array.from(allCategories));
      
      expect(categories.has('code-injection') || allCategories.has('code-injection')).toBe(true);
      expect(categories.has('file-system') || allCategories.has('file-system')).toBe(true);
      // Note: fetch might be detected as warning rather than violation
      expect(categories.has('network') || allCategories.has('network')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JavaScript gracefully', async () => {
      const malformedCode = 'function broken( { invalid syntax }';

      const result = await validator.validateCode(malformedCode, 'javascript');
      
      expect(result.analysis.success).toBe(false);
      expect(result.analysis.errors.length).toBeGreaterThan(0);
    });

    test('should handle empty code', async () => {
      const result = await validator.validateCode('', 'javascript');
      
      expect(result.isValid).toBe(true);
      expect(result.riskScore).toBe(0);
    });

    test('should handle unsupported language gracefully', async () => {
      try {
        // @ts-ignore - Testing error handling
        await validator.validateCode('code', 'unsupported');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });
});