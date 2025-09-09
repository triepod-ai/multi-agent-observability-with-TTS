/**
 * Code Execution Assessment Sample Data
 * Demonstrates the new WebAssembly-powered code execution capabilities
 */

export const codeExecutionAssessment = {
  id: 'code-execution-fundamentals',
  title: '🐍 Python Programming Fundamentals',
  description: 'Test your Python programming skills with real code execution',
  hookId: 'python-fundamentals',
  difficulty: 'intermediate' as const,
  timeLimit: 1800, // 30 minutes
  passingScore: 70,
  questions: [
    {
      id: 'python-hello-world',
      question: 'Write a Python program that prints "Hello, World!" to the console.',
      type: 'code-execution' as const,
      language: 'python' as const,
      starterCode: '# Write your code here\n',
      expectedOutput: 'Hello, World!',
      options: ['90-100%', '70-89%', '50-69%'],
      correctAnswer: 0, // Will be auto-calculated based on execution
      explanation: 'This basic program tests your understanding of Python print statements and basic syntax.',
      competencyDimension: 'knowledge' as const,
      difficulty: 'easy' as const,
      points: 10
    },
    {
      id: 'python-variables',
      question: 'Create variables for your name and age, then print them in a formatted message.',
      type: 'code-execution' as const,
      language: 'python' as const,
      starterCode: '# Create variables and print a formatted message\nname = ""\nage = 0\n\n# Your code here\n',
      expectedOutput: 'My name is Alice and I am 25 years old.',
      options: ['90-100%', '70-89%', '50-69%'],
      correctAnswer: 0,
      explanation: 'This tests variable assignment, string formatting, and print statements.',
      competencyDimension: 'application' as const,
      difficulty: 'easy' as const,
      points: 15,
      testCases: [
        {
          input: [],
          expectedOutput: 'My name is Alice and I am 25 years old.'
        }
      ]
    },
    {
      id: 'python-loop',
      question: 'Write a program that prints numbers from 1 to 5 using a for loop.',
      type: 'code-execution' as const,
      language: 'python' as const,
      starterCode: '# Write a for loop that prints numbers 1 to 5\n',
      expectedOutput: '1\n2\n3\n4\n5',
      options: ['90-100%', '70-89%', '50-69%'],
      correctAnswer: 0,
      explanation: 'This tests your understanding of for loops and the range() function.',
      competencyDimension: 'application' as const,
      difficulty: 'medium' as const,
      points: 20
    },
    {
      id: 'python-function',
      question: 'Create a function called `calculate_area` that takes length and width as parameters and returns the area of a rectangle.',
      type: 'code-execution' as const,
      language: 'python' as const,
      starterCode: '# Define the calculate_area function\ndef calculate_area(length, width):\n    # Your code here\n    pass\n\n# Test your function\nresult = calculate_area(5, 3)\nprint(f"Area: {result}")',
      expectedOutput: 'Area: 15',
      options: ['90-100%', '70-89%', '50-69%'],
      correctAnswer: 0,
      explanation: 'This tests function definition, parameters, return values, and basic arithmetic.',
      competencyDimension: 'application' as const,
      difficulty: 'medium' as const,
      points: 25
    },
    {
      id: 'python-conditional',
      question: 'Write a program that checks if a number is positive, negative, or zero and prints the appropriate message.',
      type: 'code-execution' as const,
      language: 'python' as const,
      starterCode: '# Check if number is positive, negative, or zero\nnumber = -5\n\n# Your code here\n',
      expectedOutput: 'The number is negative',
      options: ['90-100%', '70-89%', '50-69%'],
      correctAnswer: 0,
      explanation: 'This tests conditional statements (if/elif/else) and comparison operators.',
      competencyDimension: 'analysis' as const,
      difficulty: 'medium' as const,
      points: 20
    },
    {
      id: 'python-list-processing',
      question: 'Given a list of numbers, write code to find and print the sum and average.',
      type: 'code-execution' as const,
      language: 'python' as const,
      starterCode: '# Process the list to find sum and average\nnumbers = [10, 20, 30, 40, 50]\n\n# Your code here\n',
      expectedOutput: 'Sum: 150\nAverage: 30.0',
      options: ['90-100%', '70-89%', '50-69%'],
      correctAnswer: 0,
      explanation: 'This tests list manipulation, mathematical operations, and formatting output.',
      competencyDimension: 'analysis' as const,
      difficulty: 'hard' as const,
      points: 30
    }
  ]
};

export const javascriptExecutionAssessment = {
  id: 'javascript-execution-fundamentals',
  title: '🟨 JavaScript Programming Fundamentals',
  description: 'Test your JavaScript programming skills with real code execution',
  hookId: 'javascript-fundamentals',
  difficulty: 'intermediate' as const,
  timeLimit: 1800, // 30 minutes
  passingScore: 70,
  questions: [
    {
      id: 'js-hello-world',
      question: 'Write a JavaScript program that outputs "Hello, JavaScript!" to the console.',
      type: 'code-execution' as const,
      language: 'javascript' as const,
      starterCode: '// Write your code here\n',
      expectedOutput: 'Hello, JavaScript!',
      options: ['90-100%', '70-89%', '50-69%'],
      correctAnswer: 0,
      explanation: 'This basic program tests your understanding of JavaScript console.log() and basic syntax.',
      competencyDimension: 'knowledge' as const,
      difficulty: 'easy' as const,
      points: 10
    },
    {
      id: 'js-arrow-function',
      question: 'Create an arrow function that takes two numbers and returns their product.',
      type: 'code-execution' as const,
      language: 'javascript' as const,
      starterCode: '// Create an arrow function called multiply\nconst multiply = \n\n// Test your function\nconst result = multiply(6, 7);\nconsole.log(`Product: ${result}`);\n',
      expectedOutput: 'Product: 42',
      options: ['90-100%', '70-89%', '50-69%'],
      correctAnswer: 0,
      explanation: 'This tests arrow function syntax, parameters, and return values in ES6+ JavaScript.',
      competencyDimension: 'application' as const,
      difficulty: 'medium' as const,
      points: 20
    },
    {
      id: 'js-array-methods',
      question: 'Use array methods to filter even numbers from an array and then double each remaining number.',
      type: 'code-execution' as const,
      language: 'javascript' as const,
      starterCode: '// Filter and transform array\nconst numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];\n\n// Your code here\n// Filter even numbers, then double them\n\nconsole.log(result);',
      expectedOutput: '[4, 8, 12, 16, 20]',
      options: ['90-100%', '70-89%', '50-69%'],
      correctAnswer: 0,
      explanation: 'This tests understanding of array methods like filter() and map() for functional programming.',
      competencyDimension: 'analysis' as const,
      difficulty: 'hard' as const,
      points: 30
    }
  ]
};

export const typeScriptExecutionAssessment = {
  id: 'typescript-execution-fundamentals',
  title: '🔷 TypeScript Programming Fundamentals',
  description: 'Test your TypeScript programming skills with type-safe code execution',
  hookId: 'typescript-fundamentals',
  difficulty: 'advanced' as const,
  timeLimit: 2400, // 40 minutes
  passingScore: 75,
  questions: [
    {
      id: 'ts-interface',
      question: 'Define an interface for a User with name and age properties, then create and log a user object.',
      type: 'code-execution' as const,
      language: 'typescript' as const,
      starterCode: '// Define User interface and create a user object\ninterface User {\n    // Define properties here\n}\n\n// Create user object\nconst user: User = {\n    // Set properties\n};\n\nconsole.log(`User: ${user.name}, Age: ${user.age}`);\n',
      expectedOutput: 'User: John Doe, Age: 30',
      options: ['90-100%', '70-89%', '50-69%'],
      correctAnswer: 0,
      explanation: 'This tests TypeScript interfaces, type annotations, and object creation with type safety.',
      competencyDimension: 'application' as const,
      difficulty: 'medium' as const,
      points: 25
    },
    {
      id: 'ts-generics',
      question: 'Create a generic function that returns the first element of an array, with proper type safety.',
      type: 'code-execution' as const,
      language: 'typescript' as const,
      starterCode: '// Create a generic function to get first element\nfunction getFirst<T>(items: T[]): T | undefined {\n    // Your implementation here\n}\n\n// Test with different types\nconst numbers = [1, 2, 3];\nconst strings = ["hello", "world"];\n\nconsole.log(getFirst(numbers)); // Should output: 1\nconsole.log(getFirst(strings)); // Should output: hello\n',
      expectedOutput: '1\nhello',
      options: ['90-100%', '70-89%', '50-69%'],
      correctAnswer: 0,
      explanation: 'This tests understanding of TypeScript generics, type parameters, and type safety.',
      competencyDimension: 'synthesis' as const,
      difficulty: 'hard' as const,
      points: 35
    }
  ]
};

// Export all assessments
export const codeExecutionAssessments = {
  python: codeExecutionAssessment,
  javascript: javascriptExecutionAssessment,
  typescript: typeScriptExecutionAssessment
};