/**
 * Sandbox Item Type Definitions for Educational Dashboard
 */

export interface SandboxItem {
  id: string;
  title: string;
  description: string;
  type: 'exercise' | 'demo' | 'tutorial' | 'experiment';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number; // minutes
  prerequisites?: string[];
  objectives: string[];
  content: {
    instructions: string;
    startingCode?: string;
    expectedOutput?: string;
    hints?: string[];
  };
  resources?: {
    title: string;
    url: string;
    type: 'documentation' | 'video' | 'article' | 'example';
  }[];
  validation?: {
    type: 'output' | 'code' | 'manual';
    criteria: string[];
  };
  tags: string[];
}