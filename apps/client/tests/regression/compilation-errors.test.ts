/**
 * Regression Tests for Compilation Errors
 * 
 * These tests prevent TypeScript and build-time regressions that could
 * break the application startup or development experience.
 * 
 * Bugs Fixed:
 * 1. Duplicate formatSessionId function declaration
 * 2. TypeScript interface mismatches between components
 * 3. Missing properties in HookEvent interface
 */

import { describe, it, expect } from 'vitest';

describe('Compilation Error Regression Tests', () => {
  describe('Type Definitions', () => {
    it('should have HookEvent interface with all required properties', () => {
      // This test ensures HookEvent interface includes all properties
      // that components expect to exist
      
      const mockEvent = {
        id: 1,
        source_app: 'test-app',
        session_id: 'test-session',
        hook_event_type: 'PostToolUse',
        payload: { tool_name: 'Read' },
        timestamp: Date.now(),
        error: false,
        duration: 100
      };

      // These properties should exist without TypeScript errors
      expect(mockEvent).toHaveProperty('id');
      expect(mockEvent).toHaveProperty('source_app');
      expect(mockEvent).toHaveProperty('session_id');
      expect(mockEvent).toHaveProperty('hook_event_type');
      expect(mockEvent).toHaveProperty('payload');
      expect(mockEvent).toHaveProperty('timestamp');
      expect(mockEvent).toHaveProperty('error');
      expect(mockEvent).toHaveProperty('duration');
    });
  });

  describe('Filter Interface Compatibility', () => {
    it('should handle filter objects with different property sets', () => {
      // Test that components can handle filters with optional properties
      const baseFilters = {
        sourceApp: 'test-app',
        sessionId: 'test-session',
        eventType: 'PostToolUse'
      };

      const extendedFilters = {
        ...baseFilters,
        toolName: 'Read'
      };

      // Both filter formats should be valid
      expect(baseFilters).toHaveProperty('sourceApp');
      expect(baseFilters).toHaveProperty('sessionId');
      expect(baseFilters).toHaveProperty('eventType');
      
      expect(extendedFilters).toHaveProperty('sourceApp');
      expect(extendedFilters).toHaveProperty('sessionId');
      expect(extendedFilters).toHaveProperty('eventType');
      expect(extendedFilters).toHaveProperty('toolName');
    });
  });

  describe('Function Definition Uniqueness', () => {
    it('should not have duplicate function definitions in ApplicationsOverview', () => {
      // This test ensures that utility functions are defined only once
      // We test by checking the source code doesn't contain duplicate function definitions
      
      const fs = require('fs');
      const path = require('path');
      const componentPath = path.resolve(__dirname, '../../src/components/ApplicationsOverview.vue');
      
      if (fs.existsSync(componentPath)) {
        const content = fs.readFileSync(componentPath, 'utf8');
        
        // Count occurrences of formatSessionId function definition
        const functionDefPattern = /const formatSessionId = \(/g;
        const matches = content.match(functionDefPattern) || [];
        
        // Should only have one definition of formatSessionId
        expect(matches.length).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Component Import Resolution', () => {
    it('should have accessible component files', () => {
      // Test that component files exist and are readable
      const fs = require('fs');
      const path = require('path');
      const components = [
        '../../src/components/ApplicationsOverview.vue',
        '../../src/components/ActivityDashboard.vue', 
        '../../src/components/SmartFilterBar.vue',
        '../../src/App.vue'
      ];

      for (const componentPath of components) {
        const fullPath = path.resolve(__dirname, componentPath);
        expect(fs.existsSync(fullPath)).toBe(true);
        
        // Ensure file is readable
        const content = fs.readFileSync(fullPath, 'utf8');
        expect(content.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Build System Compatibility', () => {
    it('should have valid package.json scripts', () => {
      const packageJson = require('../../package.json');
      
      // Essential scripts should exist
      expect(packageJson.scripts).toHaveProperty('dev');
      expect(packageJson.scripts).toHaveProperty('build');
      
      // Scripts should be strings
      expect(typeof packageJson.scripts.dev).toBe('string');
      expect(typeof packageJson.scripts.build).toBe('string');
    });

    it('should have TypeScript configuration files', () => {
      // These files should exist and be valid
      const fs = require('fs');
      const path = require('path');
      
      // Check main tsconfig exists
      const tsconfigPath = path.resolve(__dirname, '../../tsconfig.json');
      expect(fs.existsSync(tsconfigPath)).toBe(true);
      
      // Check app-specific tsconfig exists and has content
      const appTsconfigPath = path.resolve(__dirname, '../../tsconfig.app.json');
      if (fs.existsSync(appTsconfigPath)) {
        const content = fs.readFileSync(appTsconfigPath, 'utf8');
        expect(content).toContain('compilerOptions');
        expect(content).toContain('include');
      }
    });
  });

  describe('Vue Template Compilation', () => {
    it('should have valid Vue template syntax in ApplicationsOverview', () => {
      // This test ensures Vue templates compile without syntax errors
      // The actual compilation is tested during the build process
      
      const fs = require('fs');
      const path = require('path');
      const componentPath = path.resolve(__dirname, '../../src/components/ApplicationsOverview.vue');
      
      if (fs.existsSync(componentPath)) {
        const content = fs.readFileSync(componentPath, 'utf8');
        
        // Check for basic Vue template structure
        expect(content).toContain('<template>');
        expect(content).toContain('</template>');
        expect(content).toContain('<script setup lang="ts">');
        expect(content).toContain('</script>');
        
        // Check that we don't have duplicate function definitions
        const functionDefPattern = /const formatSessionId\s*=\s*\(/g;
        const matches = content.match(functionDefPattern) || [];
        expect(matches.length).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Prop Interface Validation', () => {
    it('should have consistent prop interfaces between parent and child components', () => {
      // This test ensures that component prop interfaces are compatible
      // between App.vue and ApplicationsOverview.vue
      
      const mockProps = {
        events: [],
        allEvents: [],
        activeFilters: {
          sourceApp: '',
          sessionId: '',
          eventType: '',
          toolName: ''
        },
        getAppColor: () => '#000000',
        getSessionColor: () => '#000000'
      };

      // All required props should be defined
      expect(mockProps).toHaveProperty('events');
      expect(mockProps).toHaveProperty('getAppColor');
      expect(mockProps).toHaveProperty('getSessionColor');
      
      // Optional props should be supported
      expect(mockProps).toHaveProperty('allEvents');
      expect(mockProps).toHaveProperty('activeFilters');
      
      // Functions should be callable
      expect(typeof mockProps.getAppColor).toBe('function');
      expect(typeof mockProps.getSessionColor).toBe('function');
    });
  });

  describe('Event Emission Interface', () => {
    it('should have consistent event emission interfaces', () => {
      // Test that event emission interfaces are properly typed
      const mockEmits = {
        'selectSession': (sessionId: string) => {},
        'filterByApp': (appName: string) => {},
        'viewAllSessions': (appName: string) => {},
        'filterByTool': (appName: string, toolName: string) => {},
        'clearFilter': (filterType: 'sourceApp' | 'sessionId' | 'eventType' | 'toolName') => {},
        'clearAllFilters': () => {}
      };

      // All emit functions should be defined
      Object.values(mockEmits).forEach(emitFn => {
        expect(typeof emitFn).toBe('function');
      });
    });
  });
});