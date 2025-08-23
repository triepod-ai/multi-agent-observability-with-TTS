#!/bin/bash
# QA Agent Setup Verification Script

echo "=== QA Agent Setup Verification ==="
echo

echo "1. Checking qa-agent configuration..."
if [ -f ".claude/agents/qa-agent.md" ]; then
    echo "✅ qa-agent.md found in project agents directory"
    echo "   Tools configured: Read, LS, Bash, Grep, Glob, Playwright MCP tools"
    echo "   Specialization: Vue.js UI testing and validation"
else
    echo "❌ qa-agent.md not found"
fi

echo
echo "2. Checking project testing setup..."
if [ -f "apps/client/package.json" ]; then
    echo "✅ Client package.json found"
    echo "   Testing framework: Vitest with Vue Test Utils"
    echo "   Available scripts: test, test:run, test:ui, test:regression"
else
    echo "❌ Client package.json not found"
fi

echo
echo "3. Checking Vue.js components for UI streamlining work..."
components=(
    "apps/client/src/components/StreamlinedAgentMetrics.vue"
    "apps/client/src/components/ResponsiveLayoutWrapper.vue"
    "apps/client/src/components/HookStatusGrid.vue"
    "apps/client/src/components/ActivityDashboard.vue"
)

for component in "${components[@]}"; do
    if [ -f "$component" ]; then
        echo "✅ Found: $(basename $component)"
    else
        echo "❌ Missing: $(basename $component)"
    fi
done

echo
echo "4. Checking existing test structure..."
if [ -d "apps/client/tests" ]; then
    echo "✅ Test directory exists"
    echo "   Existing tests: $(find apps/client/tests -name "*.test.*" | wc -l) test files"
    echo "   Regression tests: $(ls apps/client/tests/regression/ 2>/dev/null | wc -l) files"
else
    echo "❌ Test directory not found"
fi

echo
echo "5. Checking development server status..."
if pgrep -f "vite" > /dev/null; then
    echo "✅ Vite development server is running"
else
    echo "⚠️  Vite development server not detected (needed for browser testing)"
    echo "   Run: cd apps/client && npm run dev"
fi

echo
echo "=== QA Agent Ready for UI Troubleshooting ==="
echo "Use: @qa-agent to start comprehensive UI validation"
echo "Focus areas: Responsive design, accessibility, component integration"
