/**
 * Integration tests for WASI Runtime Manager with AST Security Validation
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { WasiRuntimeManager } from '../services/wasiRuntimeManager';

describe('WASI Security Integration', () => {
  let wasiManager: WasiRuntimeManager;

  beforeEach(() => {
    wasiManager = new WasiRuntimeManager();
  });

  describe('Security Validation Integration', () => {
    test('should block execution of malicious JavaScript code', async () => {
      const maliciousCode = `
        // Attempt to use eval (critical security issue)
        const userInput = "alert('XSS Attack!')";
        const result = eval(userInput);
        console.log(result);
      `;

      const result = await wasiManager.executeCode({
        language: 'javascript',
        code: maliciousCode,
        strictSecurityMode: true
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Security validation failed');
      expect(result.error).toContain('eval() Usage');
      expect(result.securityValidation?.violations.length).toBeGreaterThan(0);
      expect(result.securityValidation?.educationalFeedback.length).toBeGreaterThan(0);
    });

    test('should block execution of Python code with subprocess', async () => {
      const maliciousCode = `
import subprocess
result = subprocess.call(['rm', '-rf', '/'])
print("System destroyed!")
      `;

      const result = await wasiManager.executeCode({
        language: 'python',
        code: maliciousCode,
        strictSecurityMode: true
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Security validation failed');
      expect(result.securityValidation?.violations.length).toBeGreaterThan(0);
    });

    test('should allow safe JavaScript code to execute', async () => {
      const safeCode = `
        function calculateFibonacci(n) {
          if (n <= 1) return n;
          return calculateFibonacci(n - 1) + calculateFibonacci(n - 2);
        }
        
        const result = calculateFibonacci(8);
        console.log('Fibonacci(8) =', result);
        return result;
      `;

      const result = await wasiManager.executeCode({
        language: 'javascript',
        code: safeCode,
        strictSecurityMode: true
      });

      expect(result.securityValidation?.isValid).toBe(true);
      expect(result.securityValidation?.riskScore).toBeLessThan(30);
      expect(result.securityValidation?.violations.length).toBe(0);
      // Note: Actual execution might fail due to missing JavaScript engine in test environment
      // but security validation should pass
    });

    test('should allow safe Python code to execute', async () => {
      const safeCode = `
def calculate_prime_numbers(limit):
    primes = []
    for num in range(2, limit + 1):
        is_prime = True
        for i in range(2, int(num ** 0.5) + 1):
            if num % i == 0:
                is_prime = False
                break
        if is_prime:
            primes.append(num)
    return primes

result = calculate_prime_numbers(20)
print(f"Prime numbers up to 20: {result}")
      `;

      const result = await wasiManager.executeCode({
        language: 'python',
        code: safeCode,
        strictSecurityMode: true
      });

      expect(result.securityValidation?.isValid).toBe(true);
      expect(result.securityValidation?.riskScore).toBeLessThan(30);
      expect(result.securityValidation?.violations.length).toBe(0);
    });

    test('should provide educational feedback for security violations', async () => {
      const codeWithIssues = `
        // Multiple security issues
        eval("console.log('eval usage')");
        const fs = require('fs');
        while (true) {
          // Infinite loop with break - should be flagged
          break;
        }
      `;

      const result = await wasiManager.executeCode({
        language: 'javascript',
        code: codeWithIssues
      });

      expect(result.securityValidation?.educationalFeedback.length).toBeGreaterThan(0);
      
      const feedbackMessages = result.securityValidation?.educationalFeedback.map(f => f.message);
      expect(feedbackMessages?.some(msg => msg.includes('eval'))).toBe(true);
      expect(result.securityValidation?.educationalFeedback.some(f => f.exampleSafe)).toBe(true);
    });

    test('should allow execution bypass for trusted code', async () => {
      const trustedButUnsafeCode = `
        // This would normally be blocked, but we trust it
        const config = eval('({ timeout: 5000 })');
        console.log('Config loaded:', config);
      `;

      const result = await wasiManager.executeCode({
        language: 'javascript',
        code: trustedButUnsafeCode,
        skipSecurityValidation: true // Bypass security validation
      });

      expect(result.securityValidation).toBeUndefined();
      // Note: Execution might still fail due to missing engine, but security wasn't checked
    });
  });

  describe('Quick Security Check', () => {
    test('should quickly identify critical security issues', async () => {
      const maliciousCode = 'eval("alert(1)"); new Function("alert(2)");';
      
      const result = await wasiManager.quickSecurityCheck(maliciousCode, 'javascript');
      
      expect(result.isValid).toBe(false);
      expect(result.criticalIssues).toBeGreaterThan(0);
      expect(result.riskScore).toBeGreaterThan(0);
    });

    test('should quickly validate safe code', async () => {
      const safeCode = 'const x = 1 + 2; console.log(x);';
      
      const result = await wasiManager.quickSecurityCheck(safeCode, 'javascript');
      
      expect(result.isValid).toBe(true);
      expect(result.criticalIssues).toBe(0);
    });
  });

  describe('Full Security Validation', () => {
    test('should provide comprehensive security analysis', async () => {
      const codeToAnalyze = `
        function processUserData(userData) {
          // Some complexity here
          if (userData && userData.length > 0) {
            const processed = userData.map(item => {
              return {
                id: item.id,
                name: item.name.toUpperCase(),
                timestamp: Date.now()
              };
            });
            return processed;
          }
          return [];
        }
        
        const testData = [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' }
        ];
        
        const result = processUserData(testData);
      `;

      const validation = await wasiManager.validateCodeSecurity(codeToAnalyze, 'javascript');
      
      expect(validation.isValid).toBe(true);
      expect(validation.analysis.success).toBe(true);
      expect(validation.analysis.metrics.functions).toBeGreaterThan(0);
      expect(validation.performance.totalTimeMs).toBeLessThan(200);
      expect(validation.riskScore).toBeLessThan(10); // Very safe code
    });

    test('should detect and explain complex security issues', async () => {
      const complexMaliciousCode = `
        function dangerousFunction(userInput) {
          // Multiple layers of dangerous operations
          const fs = require('fs');
          const path = '../../../etc/passwd';
          
          try {
            const data = fs.readFileSync(path, 'utf8');
            return eval('(' + userInput + ')');
          } catch (error) {
            new Function('return ' + userInput)();
          }
        }
        
        while (true) {
          // Infinite processing
          if (Math.random() > 0.5) break;
        }
      `;

      const validation = await wasiManager.validateCodeSecurity(complexMaliciousCode, 'javascript');
      
      expect(validation.isValid).toBe(false);
      expect(validation.violations.length).toBeGreaterThan(2);
      expect(validation.riskScore).toBeGreaterThan(50);
      
      const categories = new Set(validation.violations.map(v => v.rule.category));
      expect(categories.has('code-injection')).toBe(true);
      expect(categories.has('file-system')).toBe(true);
    });
  });

  describe('Performance Requirements', () => {
    test('should complete security validation within performance targets', async () => {
      const moderateCode = `
        class DataProcessor {
          constructor() {
            this.cache = new Map();
          }
          
          processData(data) {
            const results = [];
            for (let i = 0; i < data.length; i++) {
              const item = data[i];
              if (this.cache.has(item.id)) {
                results.push(this.cache.get(item.id));
              } else {
                const processed = this.transform(item);
                this.cache.set(item.id, processed);
                results.push(processed);
              }
            }
            return results;
          }
          
          transform(item) {
            return {
              ...item,
              processed: true,
              timestamp: Date.now()
            };
          }
        }
      `;

      const startTime = performance.now();
      const validation = await wasiManager.validateCodeSecurity(moderateCode, 'javascript', false);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(200); // Should complete within 200ms
      expect(validation.performance.totalTimeMs).toBeLessThan(150);
      expect(validation.isValid).toBe(true);
    });
  });
});