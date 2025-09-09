/**
 * Guide Hook Type Definitions for Educational Dashboard
 */

export interface GuideHook {
  id: string;
  name: string;
  description: string;
  purpose: string;
  example?: string;
  documentation?: string;
  category: 'lifecycle' | 'interaction' | 'system' | 'development';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  prerequisites?: string[];
  relatedHooks?: string[];
  bestPractices?: string[];
  commonIssues?: string[];
  troubleshooting?: {
    issue: string;
    solution: string;
  }[];
}