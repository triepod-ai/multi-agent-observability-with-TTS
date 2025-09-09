/**
 * Test Data and Fixtures for Cross-Browser Testing
 * Provides consistent test data across all browser tests
 */

export interface TestCodeSnippet {
  language: string;
  code: string;
  expectedOutput?: string;
  description: string;
}

export interface AssessmentQuestion {
  id: string;
  question: string;
  type: 'multiple-choice' | 'code' | 'true-false';
  options?: string[];
  correctAnswer: string | number;
  explanation?: string;
}

export interface BrowserTestData {
  codeSnippets: TestCodeSnippet[];
  assessmentQuestions: AssessmentQuestion[];
  performanceBenchmarks: {
    [browserName: string]: {
      loadTime: number;
      wasmInit: number;
      editorInit: number;
      memoryLimit: number;
    };
  };
}

/**
 * Code snippets for testing across browsers
 */
export const testCodeSnippets: TestCodeSnippet[] = [
  {
    language: 'javascript',
    code: `// Simple function test
function greet(name) {
  return "Hello, " + name + "!";
}
console.log(greet("World"));`,
    expectedOutput: 'Hello, World!',
    description: 'Basic JavaScript function test'
  },
  {
    language: 'javascript',
    code: `// Array manipulation test
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);
console.log(doubled);`,
    expectedOutput: '[2, 4, 6, 8, 10]',
    description: 'Array methods and arrow functions'
  },
  {
    language: 'javascript',
    code: `// Async/await test
async function fetchData() {
  return new Promise(resolve => {
    setTimeout(() => resolve("Data loaded"), 100);
  });
}

fetchData().then(console.log);`,
    expectedOutput: 'Data loaded',
    description: 'Asynchronous JavaScript testing'
  },
  {
    language: 'python',
    code: `# Python list comprehension
numbers = [1, 2, 3, 4, 5]
squared = [x**2 for x in numbers]
print(squared)`,
    expectedOutput: '[1, 4, 9, 16, 25]',
    description: 'Python list comprehension'
  },
  {
    language: 'python',
    code: `# Python function test
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

print(f"5! = {factorial(5)}")`,
    expectedOutput: '5! = 120',
    description: 'Recursive function in Python'
  },
  {
    language: 'json',
    code: `{
  "name": "Educational Dashboard",
  "version": "1.0.0",
  "features": ["cross-browser", "responsive", "accessible"],
  "supported_browsers": {
    "chrome": ">=90",
    "firefox": ">=88",
    "safari": ">=14",
    "edge": ">=90"
  }
}`,
    description: 'JSON configuration example'
  }
];

/**
 * Assessment questions for testing modal functionality
 */
export const testAssessmentQuestions: AssessmentQuestion[] = [
  {
    id: 'hook-basics-1',
    question: 'What is the primary purpose of Claude Code hooks?',
    type: 'multiple-choice',
    options: [
      'To catch errors in code',
      'To provide lifecycle events for AI interactions',
      'To compress files',
      'To manage database connections'
    ],
    correctAnswer: 1,
    explanation: 'Claude Code hooks provide lifecycle events that allow monitoring and automation of AI interactions.'
  },
  {
    id: 'hook-basics-2',
    question: 'Which hook is called when a subagent starts?',
    type: 'multiple-choice',
    options: [
      'session-start',
      'subagent-start',
      'pre-compact',
      'tool-use'
    ],
    correctAnswer: 1,
    explanation: 'The subagent-start hook is triggered when a new subagent begins execution.'
  },
  {
    id: 'code-execution-1',
    question: 'What technology enables code execution in the browser?',
    type: 'multiple-choice',
    options: [
      'Node.js',
      'WebAssembly',
      'Flash',
      'Java Applets'
    ],
    correctAnswer: 1,
    explanation: 'WebAssembly (WASM) enables efficient code execution in web browsers.'
  },
  {
    id: 'accessibility-1',
    question: 'WCAG 2.1 AA compliance ensures websites are accessible to users with disabilities.',
    type: 'true-false',
    correctAnswer: 'true',
    explanation: 'WCAG 2.1 AA is a widely recognized standard for web accessibility.'
  },
  {
    id: 'code-challenge-1',
    question: 'Write a function that returns the sum of an array of numbers.',
    type: 'code',
    correctAnswer: `function sum(arr) {
  return arr.reduce((a, b) => a + b, 0);
}`,
    explanation: 'The reduce method is an efficient way to sum array elements.'
  }
];

/**
 * Browser-specific performance benchmarks
 */
export const performanceBenchmarks = {
  chromium: {
    loadTime: 3000,
    wasmInit: 8000,
    editorInit: 5000,
    memoryLimit: 30 * 1024 * 1024 // 30MB
  },
  firefox: {
    loadTime: 4000,
    wasmInit: 12000,
    editorInit: 8000,
    memoryLimit: 40 * 1024 * 1024 // 40MB
  },
  webkit: {
    loadTime: 5000,
    wasmInit: 18000,
    editorInit: 12000,
    memoryLimit: 50 * 1024 * 1024 // 50MB
  },
  msedge: {
    loadTime: 3000,
    wasmInit: 8000,
    editorInit: 5000,
    memoryLimit: 30 * 1024 * 1024 // 30MB
  }
};

/**
 * Responsive design breakpoints for testing
 */
export const responsiveBreakpoints = [
  { name: 'mobile-small', width: 320, height: 568 },
  { name: 'mobile', width: 375, height: 667 },
  { name: 'mobile-large', width: 414, height: 896 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'tablet-landscape', width: 1024, height: 768 },
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'desktop-large', width: 1440, height: 900 },
  { name: 'wide-screen', width: 1920, height: 1080 }
];

/**
 * Educational dashboard tabs configuration
 */
export const educationalTabs = [
  { id: 'progress', label: 'Progress', icon: '📊', hasAssessment: false },
  { id: 'guide', label: 'Guide', icon: '📖', hasAssessment: true },
  { id: 'flow', label: 'Flow', icon: '🔄', hasAssessment: false },
  { id: 'examples', label: 'Examples', icon: '💡', hasAssessment: true },
  { id: 'sandbox', label: 'Sandbox', icon: '🧪', hasAssessment: true },
  { id: 'scenarios', label: 'Scenarios', icon: '🎯', hasAssessment: true },
  { id: 'reference', label: 'Reference', icon: '📚', hasAssessment: false },
  { id: 'glossary', label: 'Glossary', icon: '📝', hasAssessment: false }
];

/**
 * Claude Code hooks for testing educational content
 */
export const claudeCodeHooks = [
  {
    id: 'session-start',
    name: 'Session Start',
    purpose: 'Initialize new Claude Code sessions',
    useCase: 'Load project context, setup environment'
  },
  {
    id: 'session-end',
    name: 'Session End',
    purpose: 'Clean up when sessions end',
    useCase: 'Save state, backup data'
  },
  {
    id: 'subagent-start',
    name: 'Subagent Start',
    purpose: 'Track when subagents begin',
    useCase: 'Monitor AI agent execution'
  },
  {
    id: 'subagent-stop',
    name: 'Subagent Stop',
    purpose: 'Track when subagents complete',
    useCase: 'Measure performance, log results'
  },
  {
    id: 'pre-compact',
    name: 'Pre Compact',
    purpose: 'Prepare for conversation compression',
    useCase: 'Archive important data before compression'
  },
  {
    id: 'tool-use',
    name: 'Tool Use',
    purpose: 'Monitor tool usage',
    useCase: 'Track file operations, API calls'
  },
  {
    id: 'post-tool-use',
    name: 'Post Tool Use',
    purpose: 'Handle tool completion',
    useCase: 'Process results, update state'
  },
  {
    id: 'error',
    name: 'Error',
    purpose: 'Handle errors and exceptions',
    useCase: 'Error logging, recovery procedures'
  }
];

/**
 * Accessibility test cases
 */
export const accessibilityTests = [
  {
    name: 'Color Contrast',
    description: 'Ensure sufficient color contrast for readability',
    wcagLevel: 'AA',
    priority: 'high'
  },
  {
    name: 'Keyboard Navigation',
    description: 'All interactive elements accessible via keyboard',
    wcagLevel: 'AA',
    priority: 'high'
  },
  {
    name: 'Screen Reader Support',
    description: 'Proper ARIA labels and semantic HTML',
    wcagLevel: 'AA',
    priority: 'high'
  },
  {
    name: 'Focus Management',
    description: 'Visible focus indicators and logical order',
    wcagLevel: 'AA',
    priority: 'high'
  },
  {
    name: 'Alternative Text',
    description: 'Images and media have descriptive alt text',
    wcagLevel: 'A',
    priority: 'medium'
  },
  {
    name: 'Heading Structure',
    description: 'Logical heading hierarchy for navigation',
    wcagLevel: 'AA',
    priority: 'medium'
  }
];

/**
 * Browser feature support matrix
 */
export const browserFeatureMatrix = {
  webAssembly: {
    chromium: 'full',
    firefox: 'full',
    webkit: 'full',
    msedge: 'full'
  },
  monacoEditor: {
    chromium: 'full',
    firefox: 'full',
    webkit: 'partial', // May have some rendering differences
    msedge: 'full'
  },
  serviceWorkers: {
    chromium: 'full',
    firefox: 'full',
    webkit: 'full',
    msedge: 'full'
  },
  webGL: {
    chromium: 'full',
    firefox: 'full',
    webkit: 'partial',
    msedge: 'full'
  },
  touchEvents: {
    chromium: 'full',
    firefox: 'full',
    webkit: 'full',
    msedge: 'full'
  },
  cssGrid: {
    chromium: 'full',
    firefox: 'full',
    webkit: 'full',
    msedge: 'full'
  },
  cssFlexbox: {
    chromium: 'full',
    firefox: 'full',
    webkit: 'full',
    msedge: 'full'
  }
};

export const browserTestData: BrowserTestData = {
  codeSnippets: testCodeSnippets,
  assessmentQuestions: testAssessmentQuestions,
  performanceBenchmarks
};