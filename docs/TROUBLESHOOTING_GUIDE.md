# Multi-Agent Observability System - Troubleshooting Guide

## Overview

This guide provides comprehensive troubleshooting procedures for common issues in the Multi-Agent Observability System, including the recently resolved Hook Coverage Modal data display problems.

## Hook Data Issues

### Hook Data Not Displaying

**Symptoms:**
- Hook Coverage Modal tabs show no data
- API endpoints return empty results  
- Event counts are zero despite active system
- Modal tabs appear grayed out or non-functional

**Root Cause:**
Mixed naming conventions in the database (CamelCase vs snake_case) causing API queries to miss events.

**Diagnostic Steps:**

1. **Check Database Events:**
```sql
-- Connect to the database and check event types
SELECT DISTINCT hook_event_type, COUNT(*) as count 
FROM events 
GROUP BY hook_event_type 
ORDER BY count DESC;

-- Look for both naming patterns:
-- SessionStart vs session_start
-- PreToolUse vs pre_tool_use  
-- PostToolUse vs post_tool_use
```

2. **Test API Endpoints:**
```bash
# Test hook coverage endpoint
curl "http://localhost:3456/api/hook-coverage" | jq '.hooks[] | {type, executionCount}'

# Test specific hook endpoints
curl "http://localhost:3456/api/hooks/session_start/enhanced-context" | jq '.totalExecutions'
```

3. **Verify Enhanced Hook Service:**
```bash
# Check if the service includes both naming conventions
grep -A 10 "getEventTypesForHook" apps/server/src/services/enhancedHookService.ts

# Should show: ['SessionStart', 'session_start'] format
```

**Solution:**
Ensure the `getEventTypesForHook` function in `enhancedHookService.ts` includes both naming conventions:

```typescript
function getEventTypesForHook(hookType: string): string[] {
  const hookMappings: Record<string, string[]> = {
    'session_start': ['SessionStart', 'session_start'],
    'pre_tool_use': ['PreToolUse', 'pre_tool_use'],
    // ... include both patterns for all hooks
  };
  return hookMappings[hookType] || [];
}
```

### API Endpoints Returning 404

**Symptoms:**
- Hook-related API calls return 404 Not Found
- Modal fails to load data
- Console shows network errors

**Diagnostic Steps:**

1. **Verify Server Status:**
```bash
# Check if server is running
curl "http://localhost:3456/health"

# Check available routes
curl "http://localhost:3456/api/" 
```

2. **Check Route Registration:**
```bash
# Verify routes are properly registered
grep -r "hook" apps/server/src/routes/ || echo "No hook routes found"
```

**Solution:**
- Restart the server: `cd apps/server && npm run dev`
- Verify route configuration in server startup
- Check database connection and initialization

### Inconsistent Hook Event Counts

**Symptoms:**
- Event counts vary between different API endpoints
- Modal tabs show different totals
- Performance metrics don't match overview data

**Diagnostic Steps:**

1. **Database Consistency Check:**
```sql
-- Check for duplicate or inconsistent events
SELECT 
  hook_event_type,
  COUNT(*) as total,
  COUNT(DISTINCT session_id) as unique_sessions,
  MIN(timestamp) as earliest,
  MAX(timestamp) as latest
FROM events 
GROUP BY hook_event_type;
```

2. **API Consistency Verification:**
```bash
# Compare counts across different endpoints
hook_type="session_start"
curl "http://localhost:3456/api/hooks/$hook_type/enhanced-context" | jq '.totalExecutions'
curl "http://localhost:3456/api/hooks/$hook_type/performance" | jq '.totalExecutions'
```

**Solution:**
- Database cleanup if duplicate events exist
- Restart services to clear any cached data
- Verify time window parameters are consistent across API calls

## Database Issues

### Database Connection Failures

**Symptoms:**
- "Database not found" errors
- Connection timeout messages
- SQLite file permissions errors

**Diagnostic Steps:**

1. **Check Database File:**
```bash
# Verify database exists and permissions
ls -la *.db *.sqlite*

# Check if readable
sqlite3 your-database.db ".tables"
```

2. **Connection Test:**
```typescript
// Test database connection
import { Database } from 'bun:sqlite';
const db = new Database('path-to-database.db');
console.log(db.query('SELECT COUNT(*) FROM events').get());
```

**Solution:**
- Ensure proper database file permissions (644 or 664)
- Verify database path in server configuration
- Check disk space and write permissions
- Initialize database if missing

### Database Performance Issues

**Symptoms:**
- Slow API response times
- Modal loading delays
- High memory usage during queries

**Diagnostic Steps:**

1. **Query Performance Analysis:**
```sql
-- Check query execution plans
EXPLAIN QUERY PLAN 
SELECT * FROM events 
WHERE hook_event_type = 'SessionStart' 
AND timestamp > 1703700000000;

-- Check index usage
.indexes
```

2. **Database Statistics:**
```sql
-- Check database size and stats
.dbinfo
SELECT COUNT(*) FROM events;
SELECT COUNT(*) FROM sessions;
```

**Solution:**
- Add indexes on frequently queried columns:
```sql
CREATE INDEX idx_hook_timestamp ON events(hook_event_type, timestamp);
CREATE INDEX idx_session_events ON events(session_id, timestamp);
```
- Implement query pagination for large datasets
- Consider archiving old data

## Frontend Issues

### Modal Display Problems

**Symptoms:**
- Modal doesn't open when clicking Hook Coverage Status
- Empty modal content
- JavaScript console errors
- Tabs not switching properly

**Diagnostic Steps:**

1. **Browser Console Check:**
```javascript
// Open browser dev tools and check for errors
// Look for network failures, JavaScript errors, or API call failures
```

2. **Network Tab Inspection:**
```bash
# Check if API calls are being made and their responses
# Look for 404, 500, or timeout errors
```

3. **Component State Debugging:**
```javascript
// In browser console, check Vue component state
$vm.$data  // Check component data
$vm.$props // Check component props
```

**Solution:**
- Clear browser cache and reload
- Check API endpoint accessibility
- Verify component props and data flow
- Ensure WebSocket connections are established

### Data Binding Issues

**Symptoms:**
- Data not updating in real-time
- Stale information displayed
- Charts not refreshing

**Diagnostic Steps:**

1. **WebSocket Connection:**
```bash
# Check WebSocket connection in browser dev tools
# Network tab > WS section
```

2. **Vue Reactivity Check:**
```javascript
// Check if data is reactive
// Monitor component updates in Vue DevTools
```

**Solution:**
- Verify WebSocket connection and event handlers
- Check Vue component reactivity setup
- Implement proper data binding patterns
- Force component refresh if needed

## System Integration Issues

### Hook Installation Problems

**Symptoms:**
- Hook events not being captured
- Missing event data in database
- TTS notifications not working

**Diagnostic Steps:**

1. **Hook Installation Verification:**
```bash
# Check hook installation
ls -la .claude/hooks/
cat .claude/settings.local.json | jq '.hooks'
```

2. **Hook Execution Test:**
```bash
# Test hook execution manually
cd .claude/hooks
python session_start.py --test
```

3. **Event Generation Check:**
```bash
# Verify events are being created
tail -f database.log  # if logging enabled
curl "http://localhost:3456/api/events/recent" | head -20
```

**Solution:**
- Run hook installation script: `bin/install-hooks.sh`
- Verify hook permissions and executable status
- Check Python dependencies and environment
- Restart Claude Code session

### Service Communication Issues

**Symptoms:**
- Client-server communication failures
- Data not syncing between services
- WebSocket disconnections

**Diagnostic Steps:**

1. **Service Status Check:**
```bash
# Check all services are running
ps aux | grep -E "(node|bun)" | grep -v grep

# Port availability
netstat -tulpn | grep -E "(3001|3456)"
```

2. **Cross-Origin Testing:**
```bash
# Test CORS configuration
curl -H "Origin: http://localhost:3001" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     http://localhost:3456/api/hook-coverage
```

**Solution:**
- Restart all services in correct order
- Verify port configurations and CORS settings
- Check firewall and network connectivity
- Update service URLs in configuration files

## Performance Issues

### High Memory Usage

**Symptoms:**
- System becoming slow or unresponsive
- Out of memory errors
- Long query execution times

**Diagnostic Steps:**

1. **Memory Profiling:**
```bash
# Check system memory usage
free -h
ps aux --sort=-%mem | head -10

# Node.js specific memory check
node --max-old-space-size=4096 your-script.js
```

2. **Database Memory Usage:**
```sql
-- Check SQLite memory usage
PRAGMA cache_size;
PRAGMA page_count;
```

**Solution:**
- Implement result pagination
- Add query limits and time windows
- Optimize database indexes
- Consider data archiving strategies
- Increase system memory if needed

### Slow API Response Times

**Symptoms:**
- Modal takes long time to load
- API timeouts
- Poor user experience

**Diagnostic Steps:**

1. **Response Time Testing:**
```bash
# Test API response times
time curl "http://localhost:3456/api/hook-coverage" >/dev/null

# Detailed timing
curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:3456/api/hooks/session_start/enhanced-context"
```

2. **Database Query Profiling:**
```sql
-- Enable query timing
.timer on
SELECT COUNT(*) FROM events WHERE hook_event_type = 'SessionStart';
```

**Solution:**
- Add database indexes for frequently queried fields
- Implement caching layers
- Optimize SQL queries  
- Use pagination for large result sets
- Consider query result caching

## Common Error Messages

### "Tool used: unknown" Errors

**Description:** Hook events showing "unknown" tool usage instead of actual tool names.

**Solution:**
- Update hook event payload structure to include proper tool identification
- Verify tool name extraction logic in event processing
- Check tool_name field population in hook scripts

### WebSocket Connection Failures

**Description:** Real-time updates not working, WebSocket errors in console.

**Solution:**
```javascript
// Implement proper WebSocket error handling
const ws = new WebSocket('ws://localhost:3456');
ws.onerror = (error) => {
  console.error('WebSocket error:', error);
  // Implement reconnection logic
};
```

### Database Lock Errors

**Description:** SQLite database locked errors during concurrent access.

**Solution:**
- Implement proper connection pooling
- Add retry logic for database operations
- Use WAL mode for better concurrency:
```sql
PRAGMA journal_mode=WAL;
```

## Emergency Procedures

### Complete System Reset

If all else fails, perform a complete system reset:

```bash
# 1. Stop all services
pkill -f "node.*dev"
pkill -f "bun.*watch"

# 2. Clean temporary files
rm -rf node_modules/.cache
rm -rf apps/*/node_modules/.cache

# 3. Reinstall dependencies
cd apps/server && npm install
cd ../client && npm install

# 4. Reset database (if acceptable to lose data)
rm -f *.db *.sqlite*
# Reinitialize database with fresh schema

# 5. Reinstall hooks
./bin/install-hooks.sh

# 6. Restart services
cd apps/server && npm run dev &
cd apps/client && npm run dev &
```

### Data Recovery

For data recovery scenarios:

```bash
# 1. Backup current database
cp database.db database.backup.$(date +%Y%m%d_%H%M%S).db

# 2. Check database integrity
sqlite3 database.db "PRAGMA integrity_check;"

# 3. Export data if needed
sqlite3 database.db ".dump" > database_dump.sql

# 4. Selective data export
sqlite3 database.db "SELECT * FROM events WHERE timestamp > $(date -d '1 day ago' +%s)000;" > recent_events.csv
```

## Getting Help

### Log Collection

When reporting issues, collect these logs:

```bash
# System logs
journalctl -u your-service-name -f

# Application logs  
cat apps/server/logs/*.log
cat apps/client/logs/*.log

# Database statistics
sqlite3 database.db ".schema" > schema.sql
sqlite3 database.db "SELECT COUNT(*), hook_event_type FROM events GROUP BY hook_event_type;" > event_counts.txt
```

### Issue Reporting Template

```markdown
## Issue Description
Brief description of the problem

## Steps to Reproduce
1. Step 1
2. Step 2
3. Step 3

## Expected Behavior
What should happen

## Actual Behavior  
What actually happens

## Environment
- OS: 
- Node.js version:
- Database size:
- Recent changes:

## Logs
[Attach relevant logs]

## Screenshots
[If applicable]
```

## Preventive Maintenance

### Regular Health Checks

```bash
# Weekly health check script
#!/bin/bash
echo "=== System Health Check ==="
echo "Database size: $(du -h *.db)"
echo "Event count: $(sqlite3 database.db 'SELECT COUNT(*) FROM events;')"
echo "Service status: $(ps aux | grep -E '(node|bun)' | wc -l) processes running"
echo "Memory usage: $(free -h | grep '^Mem' | awk '{print $3 "/" $2}')"
echo "Disk usage: $(df -h . | tail -1 | awk '{print $3 "/" $2 " (" $5 ")"}')"
```

### Monitoring Setup

- Set up automated monitoring for API endpoints
- Configure alerts for database growth and performance
- Monitor WebSocket connection stability  
- Track memory usage trends
- Set up log rotation and archival