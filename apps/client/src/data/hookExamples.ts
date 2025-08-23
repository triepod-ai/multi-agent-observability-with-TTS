import type { CodeExample } from '../components/InteractiveCodeExample.vue';

export interface HookExampleSet {
  hookId: string;
  hookName: string;
  examples: CodeExample[];
}

export const hookExamples: HookExampleSet[] = [
  {
    hookId: 'pre_tool_use',
    hookName: 'PreToolUse Security Hook',
    examples: [
      {
        id: 'security-validator',
        title: 'Security Validation Hook',
        description: 'Validates tool safety before execution and blocks dangerous commands',
        icon: '🛡️',
        type: 'Security',
        language: 'python',
        code: `#!/usr/bin/env python3
"""Security validation hook - blocks dangerous commands"""
import json
import sys
import re

def validate_tool_use(payload):
    tool_name = payload.get('tool_name', '')
    tool_input = payload.get('tool_input', {})
    
    # 🛡️ Block dangerous file operations
    dangerous_tools = ['rm', 'del', 'format', 'dd']
    if tool_name.lower() in dangerous_tools:
        return {
            "exit_code": 1, 
            "message": f"⛔ Dangerous tool '{tool_name}' blocked for security"
        }
    
    # 🔍 Check for dangerous bash commands
    if tool_name == 'Bash':
        command = tool_input.get('command', '')
        dangerous_patterns = [
            r'rm\s+-rf\s+/',      # rm -rf /
            r'>\s*/dev/sd[a-z]',   # Writing to disk devices
            r'format\s+[c-z]:',   # Format commands
            r'sudo\s+rm',         # Sudo rm commands
        ]
        
        for pattern in dangerous_patterns:
            if re.search(pattern, command, re.IGNORECASE):
                return {
                    "exit_code": 1,
                    "message": f"🚨 Blocked dangerous command pattern: {pattern}"
                }
    
    # ✅ Allow safe operations  
    return {
        "exit_code": 0, 
        "message": f"✅ Tool '{tool_name}' validated and approved"
    }

if __name__ == "__main__":
    try:
        payload = json.loads(sys.stdin.read())
        result = validate_tool_use(payload)
        print(json.dumps(result))
        sys.exit(result['exit_code'])
    except Exception as e:
        print(json.dumps({"exit_code": 1, "message": f"Hook error: {str(e)}"}))
        sys.exit(1)`,
        explanation: 'This hook acts as a **security gate** that can completely prevent dangerous tool execution. It checks both the tool name and command patterns for potential security risks. If it returns `exit_code: 1`, the tool execution is *completely blocked*.',
        estimatedTime: '5ms',
        difficulty: 'intermediate',
        runnable: true,
        expectedOutput: `🛡️ Security validation completed
✅ Tool "git status" - ALLOWED
✅ No dangerous patterns detected
📊 Validation time: 0.003s
💾 Logged to audit trail`
      },
      {
        id: 'simple-validator',
        title: 'Simple Permission Checker',
        description: 'Basic example of allowing/blocking tools based on a whitelist',
        icon: '✅',
        type: 'Permission',
        language: 'python',
        code: `#!/usr/bin/env python3
import json
import sys

# ✅ Allowed tools whitelist
ALLOWED_TOOLS = [
    'Read', 'Grep', 'Glob', 'LS',
    'git', 'npm', 'yarn', 'python'
]

payload = json.loads(sys.stdin.read())
tool_name = payload.get('tool_name', '')

if tool_name in ALLOWED_TOOLS:
    print(json.dumps({"exit_code": 0, "message": f"✅ {tool_name} allowed"}))
    sys.exit(0)
else:
    print(json.dumps({"exit_code": 1, "message": f"❌ {tool_name} not in whitelist"}))
    sys.exit(1)`,
        explanation: 'A simple approach using a **whitelist** of allowed tools. Any tool not in the list is automatically blocked. This is useful for *restricted environments* where only specific tools should be permitted.',
        estimatedTime: '1ms',
        difficulty: 'beginner',
        runnable: true
      }
    ]
  },
  {
    hookId: 'post_tool_use',
    hookName: 'PostToolUse Logging Hook',
    examples: [
      {
        id: 'execution-logger',
        title: 'Comprehensive Tool Execution Logger',
        description: 'Logs all tool executions with performance metrics and error detection',
        icon: '📝',
        type: 'Monitoring',
        language: 'python',
        code: `#!/usr/bin/env python3
"""Comprehensive tool execution logging"""
import json
import sys
from datetime import datetime, timezone
import os

def log_tool_execution(payload):
    # 📝 Extract execution details
    log_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "session_id": payload.get('session_id', 'unknown'),
        "tool": payload.get('tool_name', 'unknown'),
        "success": payload.get('exit_code', 0) == 0,
        "duration_ms": payload.get('duration_ms', 0),
        "tool_input": payload.get('tool_input', {}),
        "tool_output": payload.get('tool_output', {}),
        "error": payload.get('error', None)
    }
    
    # 🔍 Detect common error patterns
    tool_output = str(payload.get('tool_output', ''))
    error_indicators = [
        'Error:', 'Exception:', 'Failed:', 'Permission denied',
        'No such file', 'Command not found', 'Syntax error'
    ]
    
    has_error = any(indicator in tool_output for indicator in error_indicators)
    if has_error and log_entry['success']:
        log_entry['warning'] = 'Tool succeeded but output contains error indicators'
    
    # 📊 Performance analysis
    duration = log_entry['duration_ms']
    if duration > 5000:  # > 5 seconds
        log_entry['performance_alert'] = 'Slow execution detected'
    
    # 💾 Save to audit log (in real implementation)
    log_file = '/var/log/claude-hooks/tool_execution.log'
    try:
        with open(log_file, 'a') as f:
            f.write(json.dumps(log_entry) + '\\n')
    except:
        pass  # Fail silently if log directory doesn't exist
    
    # 📢 Send to observability system
    print(f"AUDIT: {json.dumps(log_entry)}")
    
    return {"exit_code": 0, "message": "Execution logged successfully"}

if __name__ == "__main__":
    try:
        payload = json.loads(sys.stdin.read())
        result = log_tool_execution(payload)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"exit_code": 1, "message": f"Logging error: {str(e)}"}))`,
        explanation: 'This hook captures **everything** about tool execution including performance metrics, error detection, and audit trails. It\'s essential for *monitoring* what Claude actually accomplished and identifying issues.',
        estimatedTime: '3ms',
        difficulty: 'intermediate',
        runnable: true,
        expectedOutput: `📝 Tool execution logged successfully
🔧 Tool: git
📊 Duration: 120ms
✅ Exit code: 0
💾 Saved to: /var/log/claude-hooks/tool_execution.log
🕒 Timestamp: 2024-01-22T10:30:45.123Z`
      },
      {
        id: 'error-detector',
        title: 'Smart Error Detection',
        description: 'Detects failures and errors in tool outputs even when exit code is 0',
        icon: '🔍',
        type: 'Error Detection',
        language: 'python',
        code: `#!/usr/bin/env python3
import json
import sys
import re

payload = json.loads(sys.stdin.read())
tool_output = str(payload.get('tool_output', ''))
tool_name = payload.get('tool_name', '')

# 🔍 Error pattern detection
error_patterns = [
    r'error[:.]',
    r'failed[:.]',
    r'exception[:.]',
    r'permission denied',
    r'no such file',
    r'command not found',
    r'\\[ERROR\\]',
    r'fatal[:.]'
]

detected_errors = []
for pattern in error_patterns:
    matches = re.findall(pattern, tool_output, re.IGNORECASE)
    if matches:
        detected_errors.extend(matches)

result = {
    "tool": tool_name,
    "has_errors": len(detected_errors) > 0,
    "error_count": len(detected_errors),
    "detected_patterns": detected_errors[:5]  # Limit to first 5
}

if detected_errors:
    print(f"🚨 ERRORS DETECTED in {tool_name}: {', '.join(detected_errors[:3])}")
else:
    print(f"✅ No errors detected in {tool_name}")

print(json.dumps(result))`,
        explanation: 'Many tools return `exit_code: 0` even when they encounter errors. This hook uses **pattern matching** to detect error messages in tool output, providing better *error visibility* than exit codes alone.',
        estimatedTime: '2ms',
        difficulty: 'beginner',
        runnable: true
      }
    ]
  },
  {
    hookId: 'session_start',
    hookName: 'SessionStart Context Hook',
    examples: [
      {
        id: 'session-context',
        title: 'Project Context Loader',
        description: 'Loads essential project context including git status, project status, and previous session handoffs',
        icon: '🏗️',
        type: 'Context',
        language: 'python',
        code: `#!/usr/bin/env python3
"""Session context loader with Redis handoff integration"""
import subprocess
import json
import os
from pathlib import Path

def load_project_context():
    context = {"session_start": True, "context_loaded": []}
    
    # 🏗️ Load PROJECT_STATUS.md if it exists
    project_status_file = Path("PROJECT_STATUS.md")
    if project_status_file.exists():
        with open(project_status_file, 'r') as f:
            context["project_status"] = f.read()[:2000]  # Limit size
        context["context_loaded"].append("project_status")
    
    # 🌿 Get git status and recent commits
    try:
        git_status = subprocess.run(['git', 'status', '--porcelain'], 
                                  capture_output=True, text=True)
        if git_status.returncode == 0:
            context["git_status"] = git_status.stdout.strip()
        
        # Recent commits
        git_log = subprocess.run(['git', 'log', '--oneline', '-5'], 
                               capture_output=True, text=True)
        if git_log.returncode == 0:
            context["recent_commits"] = git_log.stdout.strip()
        
        context["context_loaded"].append("git_info")
    except:
        pass
    
    # 💾 Try to load previous session handoff from Redis
    try:
        import redis
        r = redis.Redis(host='localhost', port=6379, decode_responses=True)
        
        # Get latest handoff for this project
        project_name = os.path.basename(os.getcwd())
        keys = r.keys(f"handoff:project:{project_name}:*")
        
        if keys:
            latest_key = sorted(keys)[-1]  # Most recent timestamp
            handoff_data = r.get(latest_key)
            if handoff_data:
                context["previous_session"] = json.loads(handoff_data)
                context["context_loaded"].append("redis_handoff")
    except:
        pass  # Redis not available or no handoff data
    
    # 📊 Inject context into Claude's knowledge
    context_summary = f"""
🏗️ PROJECT CONTEXT LOADED:
📊 Status: {len(context.get('project_status', ''))} chars loaded
🌿 Git: {len(context.get('git_status', '').splitlines())} modified files
💾 Previous session: {'✅' if 'redis_handoff' in context['context_loaded'] else '❌'}
🔧 Components: {', '.join(context['context_loaded'])}

Ready for enhanced Claude interaction with full project context.
"""
    
    print(context_summary)
    return context

if __name__ == "__main__":
    load_project_context()`,
        explanation: 'This hook **sets the foundation** for effective Claude interaction by loading project context, git status, and previous session handoffs. The *quality of this hook* directly impacts Claude\'s ability to understand your project from the first interaction.',
        estimatedTime: '50ms',
        difficulty: 'advanced',
        runnable: true,
        expectedOutput: `🏗️ Session context loaded
📊 Project: multi-agent-observability-system
🌿 Branch: main
📝 Last commit: feat: Add interactive code examples
🔧 Recent changes: 3 files modified
💾 Context injected successfully`
      }
    ]
  },
  {
    hookId: 'subagent_stop',
    hookName: 'SubAgent Monitoring Hook',
    examples: [
      {
        id: 'agent-accountability',
        title: 'Agent Performance Tracker',
        description: 'Tracks subagent performance with intelligent TTS filtering and metrics collection',
        icon: '🤖',
        type: 'Agent Monitoring',
        language: 'python',
        code: `#!/usr/bin/env python3
"""SubAgent performance tracking with TTS filtering"""
import json
import sys
from datetime import datetime

def track_subagent_completion(payload):
    agent_name = payload.get('agent_name', 'unknown')
    agent_type = payload.get('agent_type', 'generic')
    duration_ms = payload.get('duration_ms', 0)
    token_count = payload.get('token_count', 0)
    
    # 🤖 Classify agent type for TTS filtering
    specialized_agents = [
        'code-reviewer', 'debugger', 'security-scanner',
        'performance-optimizer', 'documentation-generator',
        'test-runner', 'deployment-manager'
    ]
    
    # 🔇 Generic agents don't announce completion (reduces audio spam)
    should_announce = any(specialist in agent_name.lower() 
                         for specialist in specialized_agents)
    
    # 📊 Performance metrics
    metrics = {
        "agent_name": agent_name,
        "agent_type": agent_type,
        "execution_time_ms": duration_ms,
        "tokens_used": token_count,
        "efficiency_score": calculate_efficiency(duration_ms, token_count),
        "completion_time": datetime.now().isoformat(),
        "should_announce": should_announce
    }
    
    # 🎯 Determine success/effectiveness
    if duration_ms > 30000:  # > 30 seconds
        metrics["warning"] = "Long execution time"
    
    if token_count > 5000:
        metrics["warning"] = "High token usage"
    
    # 📢 Send TTS notification for specialized agents only
    if should_announce:
        tts_message = f"Agent {agent_name} completed in {duration_ms/1000:.1f} seconds"
        print(f"TTS: {tts_message}")
    
    # 💾 Log metrics for observability dashboard
    print(f"METRICS: {json.dumps(metrics)}")
    
    return {"exit_code": 0, "tracked": True}

def calculate_efficiency(duration_ms, token_count):
    """Simple efficiency score based on tokens per second"""
    if duration_ms == 0:
        return 0
    return round((token_count / (duration_ms / 1000)) * 10, 2)

if __name__ == "__main__":
    payload = json.loads(sys.stdin.read())
    track_subagent_completion(payload)`,
        explanation: 'This hook provides **accountability for delegated AI work**. It includes *intelligent TTS filtering* - only specialized agents announce completion, while generic utilities operate silently to reduce audio spam.',
        estimatedTime: '5ms',
        difficulty: 'intermediate',
        runnable: true
      }
    ]
  },
  {
    hookId: 'notification',
    hookName: 'Notification Hook',
    examples: [
      {
        id: 'smart-notifications',
        title: 'Context-Aware Notification System',
        description: 'Sends intelligent notifications based on event priority and user preferences',
        icon: '🔔',
        type: 'Notification',
        language: 'python',
        code: `#!/usr/bin/env python3
"""Smart notification system with priority filtering"""
import json
import sys
import subprocess
from datetime import datetime

def send_notification(payload):
    message = payload.get('message', '')
    priority = payload.get('priority', 'normal')
    notification_type = payload.get('type', 'info')
    
    # 🎯 Priority-based filtering
    priority_levels = {
        'critical': 3,
        'warning': 2, 
        'normal': 1,
        'info': 0
    }
    
    # 🔔 Send different notification types
    if priority_levels.get(priority, 0) >= 2:  # warning or critical
        send_tts_notification(message, priority)
    
    if priority == 'critical':
        send_desktop_notification(message, notification_type)
        send_email_alert(message)  # For critical issues
    
    # 📱 Always log to notification system
    log_notification(message, priority, notification_type)
    
    return {"exit_code": 0, "notified": True}

def send_tts_notification(message, priority):
    """Send text-to-speech notification"""
    try:
        voice_prefix = "🚨 Critical: " if priority == 'critical' else "⚠️ Warning: "
        full_message = f"{voice_prefix}{message}"
        
        # Use the speak command from the observability system
        subprocess.run(['speak', full_message], check=False)
    except:
        pass

def send_desktop_notification(message, notification_type):
    """Send desktop notification (Linux/macOS)"""
    try:
        icons = {
            'error': 'dialog-error',
            'warning': 'dialog-warning', 
            'info': 'dialog-information',
            'success': 'dialog-ok'
        }
        
        subprocess.run([
            'notify-send',
            '--icon', icons.get(notification_type, 'dialog-information'),
            'Claude Code Alert',
            message
        ], check=False)
    except:
        pass

def send_email_alert(message):
    """Send email for critical alerts (placeholder)"""
    # In real implementation, integrate with email service
    print(f"EMAIL_ALERT: {message}")

def log_notification(message, priority, notification_type):
    """Log notification to observability system"""
    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "message": message,
        "priority": priority,
        "type": notification_type,
        "source": "notification_hook"
    }
    print(f"NOTIFICATION_LOG: {json.dumps(log_entry)}")

if __name__ == "__main__":
    payload = json.loads(sys.stdin.read())
    send_notification(payload)`,
        explanation: 'This hook implements **priority-based notifications** across multiple channels (TTS, desktop, email). It filters notifications by importance to prevent *alert fatigue* while ensuring critical issues get attention.',
        estimatedTime: '10ms',
        difficulty: 'advanced',
        runnable: true
      }
    ]
  },
  {
    hookId: 'stop',
    hookName: 'Session Stop Hook',
    examples: [
      {
        id: 'session-summary',
        title: 'Session Summary Generator',
        description: 'Generates comprehensive session summaries and prepares handoff context for future sessions',
        icon: '💾',
        type: 'Session Management',
        language: 'python',
        code: `#!/usr/bin/env python3
"""Session summary generator with handoff preparation"""
import json
import sys
import subprocess
from datetime import datetime
from pathlib import Path

def generate_session_summary(payload):
    session_id = payload.get('session_id', 'unknown')
    
    # 📊 Collect session metrics
    summary = {
        "session_id": session_id,
        "end_time": datetime.now().isoformat(),
        "summary_generated": True
    }
    
    try:
        # 🔧 Get tools used during session
        tools_used = payload.get('tools_used', [])
        summary["tools_used"] = tools_used
        summary["tool_count"] = len(tools_used)
        
        # 🤖 Get agents spawned
        agents_used = payload.get('agents_used', [])
        summary["agents_used"] = agents_used
        summary["agent_count"] = len(agents_used)
        
        # 📝 Get files modified
        git_changes = get_git_changes()
        summary["files_modified"] = git_changes
        
        # 🎯 Generate achievements summary
        achievements = generate_achievements(tools_used, agents_used, git_changes)
        summary["achievements"] = achievements
        
        # 💾 Save handoff context for next session
        save_handoff_context(summary)
        
        # 📢 Announce session completion
        completion_message = f"""
💾 Session {session_id[:8]} completed successfully
🔧 Tools used: {len(tools_used)}
🤖 Agents spawned: {len(agents_used)}  
📝 Files modified: {len(git_changes)}
🎯 Key achievements: {len(achievements)}

Session summary saved for future reference.
"""
        print(completion_message)
        
    except Exception as e:
        print(f"⚠️ Summary generation failed: {str(e)}")
        summary["error"] = str(e)
    
    return summary

def get_git_changes():
    """Get list of files modified during session"""
    try:
        result = subprocess.run(['git', 'diff', '--name-only', 'HEAD'], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            return result.stdout.strip().split('\\n') if result.stdout.strip() else []
    except:
        pass
    return []

def generate_achievements(tools_used, agents_used, files_modified):
    """Generate list of session achievements"""
    achievements = []
    
    if len(files_modified) > 0:
        achievements.append(f"Modified {len(files_modified)} files")
    
    if 'Bash' in tools_used:
        achievements.append("Executed system commands")
    
    if any('test' in agent.lower() for agent in agents_used):
        achievements.append("Ran automated testing")
    
    if any('deploy' in tool.lower() for tool in tools_used):
        achievements.append("Deployment operations")
    
    return achievements

def save_handoff_context(summary):
    """Save context for next session"""
    handoff_file = Path(f".claude/handoffs/session_{summary['session_id'][:8]}.json")
    handoff_file.parent.mkdir(parents=True, exist_ok=True)
    
    with open(handoff_file, 'w') as f:
        json.dump(summary, f, indent=2)

if __name__ == "__main__":
    payload = json.loads(sys.stdin.read()) if len(sys.argv) == 1 else {}
    summary = generate_session_summary(payload)
    print(json.dumps(summary))`,
        explanation: 'This hook is your **last chance to capture session insights** before Claude stops. It generates meaningful summaries, tracks achievements, and prepares *handoff context* for seamless work resumption in future sessions.',
        estimatedTime: '100ms',
        difficulty: 'advanced',
        runnable: true
      }
    ]
  }
];

// Configuration examples
export const configurationExamples: CodeExample[] = [
  {
    id: 'hook-config',
    title: 'Complete Hook Configuration',
    description: 'Full .claude/settings.local.json configuration with all hooks and TTS integration',
    icon: '⚙️',
    type: 'Configuration',
    language: 'json',
    code: `{
  "hooks": {
    "pre_tool_use": {
      "script": ".claude/hooks/security_validator.py",
      "timeout": 5000,
      "description": "🛡️ Validates tool safety before execution"
    },
    "post_tool_use": {
      "script": ".claude/hooks/execution_logger.py", 
      "timeout": 3000,
      "description": "📝 Logs all tool executions for audit"
    },
    "session_start": {
      "script": ".claude/hooks/session_context_loader.py",
      "timeout": 10000,
      "description": "🏗️ Loads project context and previous session handoffs"
    },
    "user_prompt_submit": {
      "script": ".claude/hooks/prompt_tracker.py",
      "timeout": 2000,
      "description": "📝 Tracks user prompts and conversation flow"
    },
    "subagent_start": {
      "script": ".claude/hooks/subagent_start.py",
      "timeout": 3000,
      "description": "🤖 Tracks subagent spawning and delegation"
    },
    "subagent_stop": {
      "script": ".claude/hooks/subagent_stop.py",
      "timeout": 5000,
      "description": "🤖 Monitors subagent completion with intelligent TTS"
    },
    "notification": {
      "script": ".claude/hooks/notification_handler.py",
      "timeout": 3000,
      "description": "🔔 Handles priority-based notifications"
    },
    "precompact": {
      "script": ".claude/hooks/precompact_summary.py",
      "timeout": 15000,
      "description": "📝 Generates conversation summaries before compaction"
    },
    "stop": {
      "script": ".claude/hooks/session_summary.py --chat",
      "timeout": 10000,
      "description": "💾 Creates session summaries and handoff context"
    }
  },
  "permissions": [
    "Bash(command:*)",
    "Read(*)",
    "Write(*)",
    "Edit(*)",
    "MultiEdit(*)",
    "Grep(*)",
    "Glob(*)",
    "LS(*)"
  ],
  "tts": {
    "enabled": true,
    "provider": "openai",
    "filtering": {
      "subagent_completion": true,
      "error_alerts": true,
      "critical_only": false
    }
  }
}`,
    explanation: 'This configuration enables **complete observability** with all 8 hooks, proper timeouts, and intelligent TTS filtering. Each hook has a specific purpose and timeout based on expected execution complexity.',
    estimatedTime: '0ms',
    difficulty: 'beginner',
    runnable: true,
    docsLink: 'https://docs.claude.ai/hooks-configuration',
    expectedOutput: `⚙️ Configuration validated
✅ pre_tool_use hook registered
✅ post_tool_use hook registered
✅ session_start hook registered
✅ user_prompt_submit hook registered
✅ subagent_start hook registered
✅ subagent_stop hook registered
✅ notification hook registered
✅ precompact hook registered
✅ stop hook registered
📁 Scripts found in .claude/hooks/
🔄 Hook system ready`
  },
  {
    id: 'minimal-config',
    title: 'Minimal Hook Setup',
    description: 'Essential hooks for basic monitoring and security',
    icon: '🚀',
    type: 'Minimal Config',
    language: 'json',
    code: `{
  "hooks": {
    "pre_tool_use": {
      "script": ".claude/hooks/security_check.py",
      "timeout": 3000
    },
    "post_tool_use": {
      "script": ".claude/hooks/basic_logger.py",
      "timeout": 2000
    },
    "stop": {
      "script": ".claude/hooks/session_end.py",
      "timeout": 5000
    }
  },
  "permissions": [
    "Bash(command:*)",
    "Read(*)",
    "Write(*)"
  ]
}`,
    explanation: 'A **minimal configuration** with just the essential hooks: security validation, basic logging, and session cleanup. Perfect for *getting started* or environments where minimal overhead is important.',
    estimatedTime: '0ms',
    difficulty: 'beginner',
    runnable: true
  }
];

// Helper function to get examples for a specific hook
export function getExamplesForHook(hookId: string): CodeExample[] {
  const hookExampleSet = hookExamples.find(set => set.hookId === hookId);
  return hookExampleSet ? hookExampleSet.examples : [];
}

// Helper function to get all examples
export function getAllExamples(): CodeExample[] {
  const allHookExamples = hookExamples.flatMap(set => set.examples);
  return [...allHookExamples, ...configurationExamples];
}

// Helper function to get examples by type
export function getExamplesByType(type: string): CodeExample[] {
  return getAllExamples().filter(example => example.type?.toLowerCase() === type.toLowerCase());
}

// Helper function to get examples by difficulty
export function getExamplesByDifficulty(difficulty: 'beginner' | 'intermediate' | 'advanced'): CodeExample[] {
  return getAllExamples().filter(example => example.difficulty === difficulty);
}

// Helper function to get runnable examples only
export function getRunnableExamples(): CodeExample[] {
  return getAllExamples().filter(example => example.runnable);
}