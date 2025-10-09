#!/bin/bash
# End-to-end test of rate limiting and metric extraction

echo "=============================================================="
echo "End-to-End Test: Rate Limiting + Metric Extraction"
echo "=============================================================="

# Test 1: Session completion with metrics (should speak)
echo ""
echo "Test 1: Session completion with metrics"
echo "--------------------------------------------------------------"
cat <<EOF | /home/bryan/bin/speak-ai-summary
{
  "tool_name": "SessionEnd",
  "summary": "Session completed in client",
  "context": {
    "files_affected": 3
  },
  "metrics": {
    "severity": "notable",
    "duration_ms": 12000
  },
  "project_context": {
    "name": "client"
  }
}
EOF

echo "✓ First session completion (should speak with metrics)"

# Test 2: Duplicate session completion (should be rate limited)
echo ""
echo "Test 2: Duplicate session completion (immediate)"
echo "--------------------------------------------------------------"
sleep 1
cat <<EOF | /home/bryan/bin/speak-ai-summary
{
  "tool_name": "SessionEnd",
  "summary": "Session completed in client",
  "context": {
    "files_affected": 3
  },
  "metrics": {
    "severity": "notable",
    "duration_ms": 12000
  },
  "project_context": {
    "name": "client"
  }
}
EOF

echo "✓ Duplicate session completion (should be rate limited)"

# Test 3: Different message with test metrics (should speak)
echo ""
echo "Test 3: Test completion with metrics"
echo "--------------------------------------------------------------"
sleep 1
cat <<EOF | /home/bryan/bin/speak-ai-summary
{
  "tool_name": "Task",
  "summary": "Tests completed",
  "payload": {
    "tests_run": 15,
    "tests_passed": 15,
    "files_affected": 5
  },
  "metrics": {
    "severity": "normal"
  },
  "project_context": {
    "name": "app"
  }
}
EOF

echo "✓ Test completion (should speak with test count metrics)"

# Test 4: Error with metrics (should speak - errors have short cooldown)
echo ""
echo "Test 4: Error with metrics"
echo "--------------------------------------------------------------"
sleep 1
cat <<EOF | /home/bryan/bin/speak-ai-summary
{
  "tool_name": "Bash",
  "summary": "Build failed",
  "payload": {
    "error_occurred": true,
    "files_affected": 2
  },
  "metrics": {
    "severity": "urgent"
  },
  "project_context": {
    "name": "server"
  }
}
EOF

echo "✓ Error message (should speak with error metrics)"

# Show results
echo ""
echo "=============================================================="
echo "Checking logs for results..."
echo "=============================================================="
tail -50 /tmp/tts-queue/speak-ai-summary.log | grep -E "ENHANCED:|RATE_LIMITED:|SPOKEN:" | tail -20

echo ""
echo "=============================================================="
echo "Expected outcomes:"
echo "  1. Session completion: ENHANCED + SPOKEN (with 3 files, 12s)"
echo "  2. Duplicate session:  ENHANCED + RATE_LIMITED"
echo "  3. Test completion:    ENHANCED + SPOKEN (with 15 tests, 5 files)"
echo "  4. Error message:      ENHANCED + SPOKEN (with 2 errors)"
echo "=============================================================="
