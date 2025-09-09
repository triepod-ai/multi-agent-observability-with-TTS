/**
 * Security patterns and rules for code validation
 */

export interface SecurityRule {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'dangerous-functions' | 'file-system' | 'network' | 'process' | 'infinite-loop' | 'memory' | 'code-injection';
  pattern?: string | RegExp;
  astNodeTypes?: string[];
  educationalMessage: string;
  exampleSafe?: string;
  exampleUnsafe?: string;
}

export interface SecurityViolation {
  rule: SecurityRule;
  line: number;
  column: number;
  code: string;
  message: string;
}

/**
 * JavaScript/TypeScript security patterns
 */
export const JS_SECURITY_RULES: SecurityRule[] = [
  // Dangerous Functions
  {
    id: 'js-eval-usage',
    name: 'eval() Usage',
    description: 'Code uses eval() which can execute arbitrary code',
    severity: 'critical',
    category: 'code-injection',
    pattern: /\beval\s*\(/gi,
    astNodeTypes: ['CallExpression'],
    educationalMessage: 'eval() can execute arbitrary JavaScript code, making it dangerous for user input. Use JSON.parse() for JSON data or safer alternatives.',
    exampleSafe: 'const data = JSON.parse(jsonString);',
    exampleUnsafe: 'const data = eval(userInput);'
  },
  {
    id: 'js-function-constructor',
    name: 'Function Constructor',
    description: 'Code uses Function constructor which can execute arbitrary code',
    severity: 'critical',
    category: 'code-injection',
    pattern: /new\s+Function\s*\(/gi,
    astNodeTypes: ['NewExpression'],
    educationalMessage: 'Function constructor can create functions from strings, potentially executing malicious code.',
    exampleSafe: 'const add = (a, b) => a + b;',
    exampleUnsafe: 'const add = new Function("a", "b", "return a + b");'
  },

  // File System Operations
  {
    id: 'js-fs-access',
    name: 'File System Access',
    description: 'Code attempts to access the file system',
    severity: 'high',
    category: 'file-system',
    pattern: /require\s*\(\s*['"`]fs['"`]\s*\)/gi,
    astNodeTypes: ['CallExpression'],
    educationalMessage: 'File system access is not allowed in the secure sandbox. Use provided APIs for data persistence.',
    exampleSafe: '// Use localStorage or provided storage APIs',
    exampleUnsafe: 'const fs = require("fs");'
  },
  {
    id: 'js-path-traversal',
    name: 'Path Traversal',
    description: 'Code uses dangerous path patterns',
    severity: 'high',
    category: 'file-system',
    pattern: /\.\.[\/\\]/g,
    educationalMessage: 'Path traversal patterns (../) can access files outside the intended directory.',
    exampleSafe: 'const file = "data.txt";',
    exampleUnsafe: 'const file = "../../../etc/passwd";'
  },

  // Network Operations
  {
    id: 'js-fetch-usage',
    name: 'Network Requests',
    description: 'Code makes network requests',
    severity: 'medium',
    category: 'network',
    pattern: /\b(fetch|XMLHttpRequest|axios|request)\s*\(/gi,
    astNodeTypes: ['CallExpression'],
    educationalMessage: 'Network requests are restricted in the sandbox. Use provided APIs for external data.',
    exampleSafe: '// Use provided data APIs',
    exampleUnsafe: 'fetch("https://external-api.com/data");'
  },
  {
    id: 'js-websocket-usage',
    name: 'WebSocket Usage',
    description: 'Code creates WebSocket connections',
    severity: 'medium',
    category: 'network',
    pattern: /new\s+WebSocket\s*\(/gi,
    astNodeTypes: ['NewExpression'],
    educationalMessage: 'WebSocket connections are not allowed in the sandbox environment.',
    exampleSafe: '// Use provided communication APIs',
    exampleUnsafe: 'const ws = new WebSocket("ws://localhost:8080");'
  },

  // Process Operations
  {
    id: 'js-process-access',
    name: 'Process Access',
    description: 'Code accesses process object',
    severity: 'high',
    category: 'process',
    pattern: /\bprocess\./g,
    educationalMessage: 'Process object access is restricted in the sandbox for security.',
    exampleSafe: '// Use environment variables through provided APIs',
    exampleUnsafe: 'process.exit(1);'
  },
  {
    id: 'js-child-process',
    name: 'Child Process',
    description: 'Code attempts to spawn child processes',
    severity: 'critical',
    category: 'process',
    pattern: /require\s*\(\s*['"`]child_process['"`]\s*\)/gi,
    astNodeTypes: ['CallExpression'],
    educationalMessage: 'Child process spawning is not allowed for security reasons.',
    exampleSafe: '// Use provided computation APIs',
    exampleUnsafe: 'const { spawn } = require("child_process");'
  },

  // Memory Issues
  {
    id: 'js-large-array',
    name: 'Large Array Creation',
    description: 'Code creates potentially large arrays',
    severity: 'medium',
    category: 'memory',
    pattern: /new\s+Array\s*\(\s*\d{6,}\s*\)/gi,
    astNodeTypes: ['NewExpression'],
    educationalMessage: 'Creating very large arrays can consume excessive memory. Consider using generators or streaming.',
    exampleSafe: 'function* generateNumbers(max) { for(let i = 0; i < max; i++) yield i; }',
    exampleUnsafe: 'const arr = new Array(1000000).fill(0);'
  },

  // Infinite Loops (basic patterns)
  {
    id: 'js-while-true',
    name: 'Infinite While Loop',
    description: 'Code contains potential infinite while loop',
    severity: 'high',
    category: 'infinite-loop',
    pattern: /while\s*\(\s*true\s*\)/gi,
    astNodeTypes: ['WhileStatement'],
    educationalMessage: 'Infinite loops can freeze the execution environment. Ensure loops have proper exit conditions.',
    exampleSafe: 'while (condition && counter < maxIterations)',
    exampleUnsafe: 'while (true) { /* no break condition */ }'
  },
  {
    id: 'js-for-infinite',
    name: 'Infinite For Loop',
    description: 'Code contains potential infinite for loop',
    severity: 'high',
    category: 'infinite-loop',
    pattern: /for\s*\(\s*;;\s*\)/gi,
    astNodeTypes: ['ForStatement'],
    educationalMessage: 'For loops without conditions can run indefinitely. Always include proper termination conditions.',
    exampleSafe: 'for (let i = 0; i < 100; i++)',
    exampleUnsafe: 'for (;;) { /* infinite loop */ }'
  }
];

/**
 * Python security patterns
 */
export const PYTHON_SECURITY_RULES: SecurityRule[] = [
  // Dangerous Functions
  {
    id: 'py-eval-usage',
    name: 'eval() Usage',
    description: 'Code uses eval() which can execute arbitrary Python code',
    severity: 'critical',
    category: 'code-injection',
    pattern: /\beval\s*\(/gi,
    educationalMessage: 'eval() can execute arbitrary Python code. Use ast.literal_eval() for safe evaluation of literals.',
    exampleSafe: 'import ast; data = ast.literal_eval(string)',
    exampleUnsafe: 'data = eval(user_input)'
  },
  {
    id: 'py-exec-usage',
    name: 'exec() Usage',
    description: 'Code uses exec() which can execute arbitrary Python code',
    severity: 'critical',
    category: 'code-injection',
    pattern: /\bexec\s*\(/gi,
    educationalMessage: 'exec() can execute arbitrary Python code from strings, which is dangerous with untrusted input.',
    exampleSafe: '# Use direct function calls instead',
    exampleUnsafe: 'exec(user_code)'
  },
  {
    id: 'py-compile-usage',
    name: 'compile() Usage',
    description: 'Code uses compile() to create code objects',
    severity: 'high',
    category: 'code-injection',
    pattern: /\bcompile\s*\(/gi,
    educationalMessage: 'compile() creates executable code objects which can be dangerous.',
    exampleSafe: '# Use predefined functions',
    exampleUnsafe: 'code = compile(source, "string", "exec")'
  },

  // File System Operations
  {
    id: 'py-file-operations',
    name: 'File Operations',
    description: 'Code performs file system operations',
    severity: 'high',
    category: 'file-system',
    pattern: /\b(open|file)\s*\(/gi,
    educationalMessage: 'File operations are restricted in the sandbox. Use provided storage APIs.',
    exampleSafe: '# Use provided data storage APIs',
    exampleUnsafe: 'with open("file.txt", "r") as f:'
  },
  {
    id: 'py-os-import',
    name: 'OS Module Import',
    description: 'Code imports os module',
    severity: 'high',
    category: 'file-system',
    pattern: /\b(import\s+os|from\s+os\s+import)/gi,
    educationalMessage: 'OS module access is restricted for security. Use provided APIs for system information.',
    exampleSafe: '# Use provided environment APIs',
    exampleUnsafe: 'import os'
  },

  // Network Operations
  {
    id: 'py-urllib-usage',
    name: 'URL Operations',
    description: 'Code makes network requests',
    severity: 'medium',
    category: 'network',
    pattern: /\b(urllib|requests|httplib)\b/gi,
    educationalMessage: 'Network requests are restricted in the sandbox environment.',
    exampleSafe: '# Use provided data APIs',
    exampleUnsafe: 'import urllib.request'
  },
  {
    id: 'py-socket-usage',
    name: 'Socket Usage',
    description: 'Code uses socket operations',
    severity: 'high',
    category: 'network',
    pattern: /\bsocket\b/gi,
    educationalMessage: 'Socket operations are not allowed in the secure sandbox.',
    exampleSafe: '# Use provided communication APIs',
    exampleUnsafe: 'import socket'
  },

  // Process Operations
  {
    id: 'py-subprocess-usage',
    name: 'Subprocess Usage',
    description: 'Code uses subprocess module',
    severity: 'critical',
    category: 'process',
    pattern: /\bsubprocess\b/gi,
    educationalMessage: 'Subprocess execution is not allowed for security reasons.',
    exampleSafe: '# Use provided computation functions',
    exampleUnsafe: 'import subprocess'
  },
  {
    id: 'py-system-calls',
    name: 'System Calls',
    description: 'Code makes system calls',
    severity: 'critical',
    category: 'process',
    pattern: /os\.system\s*\(/gi,
    educationalMessage: 'System calls can execute arbitrary commands and are not allowed.',
    exampleSafe: '# Use provided APIs',
    exampleUnsafe: 'os.system("rm -rf /")'
  },

  // Memory Issues
  {
    id: 'py-large-range',
    name: 'Large Range',
    description: 'Code creates very large ranges',
    severity: 'medium',
    category: 'memory',
    pattern: /range\s*\(\s*\d{6,}\s*\)/gi,
    educationalMessage: 'Large ranges can consume excessive memory. Consider using generators.',
    exampleSafe: 'for i in range(0, max_val, step):',
    exampleUnsafe: 'list(range(1000000))'
  },

  // Infinite Loops
  {
    id: 'py-while-true',
    name: 'Infinite While Loop',
    description: 'Code contains potential infinite while loop',
    severity: 'high',
    category: 'infinite-loop',
    pattern: /while\s+True\s*:/gi,
    educationalMessage: 'Infinite loops can freeze execution. Ensure proper break conditions.',
    exampleSafe: 'while condition and counter < max_iterations:',
    exampleUnsafe: 'while True:  # No break condition'
  }
];

/**
 * Get security rules for a specific language
 */
export function getSecurityRules(language: string): SecurityRule[] {
  switch (language.toLowerCase()) {
    case 'javascript':
    case 'typescript':
      return JS_SECURITY_RULES;
    case 'python':
      return PYTHON_SECURITY_RULES;
    default:
      return [];
  }
}

/**
 * Security rule categories with descriptions
 */
export const SECURITY_CATEGORIES = {
  'dangerous-functions': {
    name: 'Dangerous Functions',
    description: 'Functions that can execute arbitrary code or cause security issues'
  },
  'file-system': {
    name: 'File System Access',
    description: 'Operations that access the file system or local storage'
  },
  'network': {
    name: 'Network Operations',
    description: 'Code that makes network requests or connections'
  },
  'process': {
    name: 'Process Operations',
    description: 'Operations that interact with system processes'
  },
  'infinite-loop': {
    name: 'Infinite Loops',
    description: 'Code patterns that may result in infinite execution'
  },
  'memory': {
    name: 'Memory Issues',
    description: 'Operations that may consume excessive memory'
  },
  'code-injection': {
    name: 'Code Injection',
    description: 'Patterns that allow execution of dynamic code'
  }
} as const;

/**
 * Severity levels with descriptions
 */
export const SEVERITY_LEVELS = {
  'low': {
    name: 'Low',
    description: 'Minor security concern, may be allowed with warnings',
    color: '#10b981' // green
  },
  'medium': {
    name: 'Medium', 
    description: 'Moderate security risk, requires careful review',
    color: '#f59e0b' // yellow
  },
  'high': {
    name: 'High',
    description: 'Significant security risk, should be blocked',
    color: '#f97316' // orange
  },
  'critical': {
    name: 'Critical',
    description: 'Severe security risk, must be blocked',
    color: '#dc2626' // red
  }
} as const;