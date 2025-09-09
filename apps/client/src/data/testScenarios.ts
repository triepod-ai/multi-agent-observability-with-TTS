// Test scenarios for the Interactive Prompt Tester
// This file contains various testing scenarios for different hook types

export interface TestScenario {
  id: string;
  title: string;
  description: string;
  hookType: 'session_start' | 'session_stop' | 'subagent_start' | 'subagent_stop' | 'pre_compact' | 'custom';
  language: 'python' | 'bash' | 'javascript';
  code: string;
  expectedOutput?: string;
  securityLevel: 'safe' | 'moderate' | 'high';
  tags: string[];
}

export const testScenarios: TestScenario[] = [
  // Session Start Hooks
  {
    id: 'python-session-start-basic',
    title: 'Basic Python Session Start',
    description: 'A simple Python hook that displays project information',
    hookType: 'session_start',
    language: 'python',
    securityLevel: 'safe',
    tags: ['python', 'session', 'basic', 'project-info'],
    code: `#!/usr/bin/env python3
"""
Basic Session Start Hook - Project Context Loader
Safe project information gathering and context initialization
"""

import os
import sys
import json
from datetime import datetime

def main():
    print("🏗️ Session Starting - Project Context")
    print("=" * 40)
    
    # Basic project information
    cwd = os.getcwd()
    project_name = os.path.basename(cwd)
    
    print(f"📁 Project: {project_name}")
    print(f"📂 Directory: {cwd}")
    print(f"🐍 Python: {sys.version.split()[0]}")
    print(f"📅 Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Check for common project files (safe)
    project_files = {
        'package.json': '📦 Node.js',
        'requirements.txt': '🐍 Python',
        'Cargo.toml': '🦀 Rust',
        'pom.xml': '☕ Java',
        'composer.json': '🐘 PHP'
    }
    
    for file, icon in project_files.items():
        if os.path.exists(file):
            print(f"{icon} {file} found")
    
    print("✅ Session context loaded successfully")

if __name__ == "__main__":
    main()`,
    expectedOutput: `🏗️ Session Starting - Project Context
========================================
📁 Project: my-project
📂 Directory: /home/user/my-project
🐍 Python: 3.9.7
📅 Started: 2024-01-23 14:30:22
📦 package.json found
✅ Session context loaded successfully`
  },

  {
    id: 'python-session-start-git',
    title: 'Python Session Start with Git Info',
    description: 'Enhanced session start hook with Git repository information',
    hookType: 'session_start',
    language: 'python',
    securityLevel: 'safe',
    tags: ['python', 'session', 'git', 'advanced'],
    code: `#!/usr/bin/env python3
"""
Enhanced Session Start Hook - Git Integration
Safe Git repository information and branch status
"""

import os
import subprocess
import sys
from datetime import datetime

def run_git_command(cmd):
    """Safely run git command and return output"""
    try:
        result = subprocess.run(
            ['git'] + cmd.split(),
            capture_output=True,
            text=True,
            cwd=os.getcwd(),
            timeout=5
        )
        return result.stdout.strip() if result.returncode == 0 else None
    except Exception:
        return None

def main():
    print("🏗️ Session Starting - Enhanced Context")
    print("=" * 42)
    
    # Project basics
    cwd = os.getcwd()
    project_name = os.path.basename(cwd)
    
    print(f"📁 Project: {project_name}")
    print(f"📂 Path: {cwd}")
    print(f"📅 Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Git information (if available)
    if os.path.exists('.git'):
        print("\\n🌿 Git Repository Information:")
        
        branch = run_git_command('branch --show-current')
        if branch:
            print(f"   Branch: {branch}")
            
        status = run_git_command('status --porcelain')
        if status:
            changes = len(status.split('\\n'))
            print(f"   Changes: {changes} files modified")
        else:
            print("   Status: Clean working tree")
            
        last_commit = run_git_command('log -1 --pretty=format:%h %s')
        if last_commit:
            print(f"   Last: {last_commit}")
    
    print("\\n✅ Enhanced context loaded successfully")

if __name__ == "__main__":
    main()`,
    expectedOutput: `🏗️ Session Starting - Enhanced Context
==========================================
📁 Project: my-project
📂 Path: /home/user/my-project
📅 Time: 2024-01-23 14:30:22

🌿 Git Repository Information:
   Branch: main
   Status: Clean working tree
   Last: abc123f Add new feature

✅ Enhanced context loaded successfully`
  },

  // Session Stop Hooks
  {
    id: 'python-session-stop-summary',
    title: 'Python Session Stop with Summary',
    description: 'Session cleanup and summary generation',
    hookType: 'session_stop',
    language: 'python',
    securityLevel: 'safe',
    tags: ['python', 'session', 'cleanup', 'summary'],
    code: `#!/usr/bin/env python3
"""
Session Stop Hook - Cleanup and Summary
Safe session cleanup with activity summary
"""

import os
import sys
import time
from datetime import datetime, timedelta

def main():
    print("🏁 Session Ending - Cleanup & Summary")
    print("=" * 38)
    
    # Session timing (mock data for demo)
    session_start = datetime.now() - timedelta(minutes=45, seconds=23)
    session_duration = datetime.now() - session_start
    
    print(f"📅 Started: {session_start.strftime('%H:%M:%S')}")
    print(f"🕒 Duration: {session_duration}")
    print(f"📁 Project: {os.path.basename(os.getcwd())}")
    
    # Mock activity summary
    print("\\n📊 Session Activity Summary:")
    print("   • Files modified: 3")
    print("   • Commands run: 12")
    print("   • Tests executed: 5")
    print("   • Git commits: 2")
    
    # Safe cleanup operations
    print("\\n🧹 Cleanup Operations:")
    temp_files = ['.tmp', '.cache', '__pycache__']
    for temp_dir in temp_files:
        if os.path.exists(temp_dir):
            print(f"   Cleaned: {temp_dir}")
    
    print("\\n✅ Session ended successfully")
    print("💾 Activity log saved")

if __name__ == "__main__":
    main()`,
    expectedOutput: `🏁 Session Ending - Cleanup & Summary
======================================
📅 Started: 13:45:22
🕒 Duration: 0:45:23
📁 Project: my-project

📊 Session Activity Summary:
   • Files modified: 3
   • Commands run: 12
   • Tests executed: 5
   • Git commits: 2

🧹 Cleanup Operations:
   Cleaned: .tmp
   Cleaned: __pycache__

✅ Session ended successfully
💾 Activity log saved`
  },

  // Subagent Hooks
  {
    id: 'python-subagent-start',
    title: 'Python Subagent Start Hook',
    description: 'Subagent initialization with resource allocation',
    hookType: 'subagent_start',
    language: 'python',
    securityLevel: 'safe',
    tags: ['python', 'subagent', 'initialization', 'resources'],
    code: `#!/usr/bin/env python3
"""
Subagent Start Hook - Agent Initialization
Safe subagent setup with resource allocation
"""

import os
import sys
import psutil
from datetime import datetime

def get_system_resources():
    """Get basic system resource information"""
    try:
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        return {
            'cpu': cpu_percent,
            'memory_used': memory.percent,
            'disk_used': disk.percent
        }
    except Exception:
        return {'cpu': 0, 'memory_used': 0, 'disk_used': 0}

def main():
    # Get agent info from environment (mock for demo)
    agent_name = os.environ.get('AGENT_NAME', 'demo-agent')
    agent_type = os.environ.get('AGENT_TYPE', 'general')
    
    print(f"🤖 Subagent Starting: {agent_name}")
    print("=" * (20 + len(agent_name)))
    
    print(f"📋 Type: {agent_type}")
    print(f"📅 Started: {datetime.now().strftime('%H:%M:%S')}")
    print(f"🐍 Python: {sys.version.split()[0]}")
    
    # Resource check
    resources = get_system_resources()
    print(f"\\n💻 System Resources:")
    print(f"   CPU Usage: {resources['cpu']:.1f}%")
    print(f"   Memory: {resources['memory_used']:.1f}%")
    print(f"   Disk: {resources['disk_used']:.1f}%")
    
    # Agent-specific setup
    print(f"\\n⚙️ Initializing {agent_name}...")
    print("   ✓ Loading configuration")
    print("   ✓ Setting up workspace")
    print("   ✓ Validating permissions")
    
    print(f"\\n🚀 {agent_name} ready for operation")

if __name__ == "__main__":
    main()`,
    expectedOutput: `🤖 Subagent Starting: demo-agent
=================================
📋 Type: general
📅 Started: 14:30:22
🐍 Python: 3.9.7

💻 System Resources:
   CPU Usage: 15.2%
   Memory: 45.8%
   Disk: 62.1%

⚙️ Initializing demo-agent...
   ✓ Loading configuration
   ✓ Setting up workspace
   ✓ Validating permissions

🚀 demo-agent ready for operation`
  },

  {
    id: 'python-subagent-stop',
    title: 'Python Subagent Stop Hook',
    description: 'Subagent cleanup with performance metrics',
    hookType: 'subagent_stop',
    language: 'python',
    securityLevel: 'safe',
    tags: ['python', 'subagent', 'cleanup', 'metrics'],
    code: `#!/usr/bin/env python3
"""
Subagent Stop Hook - Cleanup and Metrics
Safe subagent cleanup with performance reporting
"""

import os
import sys
import time
import random
from datetime import datetime, timedelta

def generate_mock_metrics():
    """Generate realistic mock performance metrics"""
    return {
        'execution_time': round(random.uniform(1.5, 45.2), 2),
        'memory_peak': round(random.uniform(50, 150), 1),
        'operations': random.randint(5, 50),
        'files_processed': random.randint(1, 10),
        'success_rate': round(random.uniform(85, 100), 1)
    }

def main():
    # Get agent info from environment (mock for demo)
    agent_name = os.environ.get('AGENT_NAME', 'demo-agent')
    agent_type = os.environ.get('AGENT_TYPE', 'general')
    
    print(f"🏁 Subagent Stopping: {agent_name}")
    print("=" * (21 + len(agent_name)))
    
    # Mock performance metrics
    metrics = generate_mock_metrics()
    
    print(f"📊 Performance Metrics:")
    print(f"   Execution Time: {metrics['execution_time']}s")
    print(f"   Peak Memory: {metrics['memory_peak']}MB")
    print(f"   Operations: {metrics['operations']}")
    print(f"   Files Processed: {metrics['files_processed']}")
    print(f"   Success Rate: {metrics['success_rate']}%")
    
    # Cleanup operations
    print(f"\\n🧹 Cleanup Operations:")
    print("   ✓ Releasing resources")
    print("   ✓ Saving state")
    print("   ✓ Clearing temporary data")
    
    # Final status
    if metrics['success_rate'] >= 95:
        status = "🎯 Excellent"
    elif metrics['success_rate'] >= 85:
        status = "✅ Good"
    else:
        status = "⚠️ Needs attention"
    
    print(f"\\n{status} - {agent_name} completed successfully")
    print("💾 Metrics logged to observability system")

if __name__ == "__main__":
    main()`,
    expectedOutput: `🏁 Subagent Stopping: demo-agent
==================================
📊 Performance Metrics:
   Execution Time: 23.4s
   Peak Memory: 89.2MB
   Operations: 27
   Files Processed: 5
   Success Rate: 94.8%

🧹 Cleanup Operations:
   ✓ Releasing resources
   ✓ Saving state
   ✓ Clearing temporary data

✅ Good - demo-agent completed successfully
💾 Metrics logged to observability system`
  },

  // Bash Hooks
  {
    id: 'bash-hook-simple',
    title: 'Simple Bash Hook',
    description: 'Basic bash hook for system information gathering',
    hookType: 'session_start',
    language: 'bash',
    securityLevel: 'safe',
    tags: ['bash', 'system-info', 'basic'],
    code: `#!/bin/bash
# Simple SessionStart Hook - Safe System Info

echo "🏗️ Session Starting - System Info"
echo "=================================="

# Safe system information
echo "📅 Date: $(date)"
echo "👤 User: $(whoami)" 
echo "📁 Working Directory: $(pwd)"
echo "🖥️  OS: $(uname -s)"

# Check for git repository (safe)
if [ -d ".git" ]; then
    echo "🌿 Git Branch: $(git branch --show-current 2>/dev/null || echo 'unknown')"
    echo "📝 Last Commit: $(git log -1 --pretty=format:'%h %s' 2>/dev/null || echo 'none')"
fi

# Project detection (safe patterns)
if [ -f "package.json" ]; then
    echo "📦 Node.js project detected"
elif [ -f "requirements.txt" ]; then
    echo "🐍 Python project detected"  
elif [ -f "Cargo.toml" ]; then
    echo "🦀 Rust project detected"
fi

echo "✅ Session context loaded successfully"
echo "⏱️  Initialization completed in: \${SECONDS}s"`,
    expectedOutput: `🏗️ Session Starting - System Info
==================================
📅 Date: Wed Jan 23 14:30:22 EST 2024
👤 User: demo-user
📁 Working Directory: /home/demo/project
🖥️  OS: Linux
🌿 Git Branch: main
📝 Last Commit: abc123f Add new feature
📦 Node.js project detected
✅ Session context loaded successfully
⏱️  Initialization completed in: 2s`
  },

  {
    id: 'bash-git-status',
    title: 'Bash Git Status Hook',
    description: 'Comprehensive git repository status checker',
    hookType: 'session_start',
    language: 'bash',
    securityLevel: 'safe',
    tags: ['bash', 'git', 'status', 'repository'],
    code: `#!/bin/bash
# Git Status Hook - Repository Information

echo "🌿 Git Repository Status"
echo "======================="

# Check if we're in a git repository
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "❌ Not a git repository"
    exit 1
fi

# Repository information
echo "📁 Repository: $(basename $(git rev-parse --show-toplevel))"
echo "🌿 Branch: $(git branch --show-current)"

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️ Uncommitted changes detected:"
    git status --porcelain | head -5
else
    echo "✅ Working tree clean"
fi

# Recent commits
echo ""
echo "📝 Recent commits:"
git log --oneline -3

# Remote status
if git remote >/dev/null 2>&1; then
    echo ""
    echo "🔗 Remote status:"
    git remote -v | head -2
fi

echo ""
echo "✅ Git status check complete"`,
    expectedOutput: `🌿 Git Repository Status
=======================
📁 Repository: my-project
🌿 Branch: main
✅ Working tree clean

📝 Recent commits:
abc123f Add new feature
def456g Fix bug in auth
789hij Update documentation

🔗 Remote status:
origin  https://github.com/user/my-project.git (fetch)
origin  https://github.com/user/my-project.git (push)

✅ Git status check complete`
  },

  // PreCompact Hooks
  {
    id: 'python-precompact-summary',
    title: 'Python PreCompact Summary',
    description: 'Session summary generation before context compaction',
    hookType: 'pre_compact',
    language: 'python',
    securityLevel: 'safe',
    tags: ['python', 'precompact', 'summary', 'context'],
    code: `#!/usr/bin/env python3
"""
PreCompact Hook - Session Summary Generator
Generates intelligent session summary before context compaction
"""

import os
import re
import sys
from datetime import datetime
from typing import List, Dict, Any

class SessionAnalyzer:
    def __init__(self):
        self.activities = []
        self.achievements = []
        self.blockers = []
        
    def analyze_mock_session(self) -> Dict[str, Any]:
        """Generate mock session analysis for demo"""
        return {
            'session_duration': '1h 23m',
            'files_modified': ['src/components/Dashboard.vue', 'src/api/client.ts'],
            'git_commits': ['feat: Add dashboard filters', 'fix: API error handling'],
            'commands_run': 15,
            'tests_executed': 8,
            'key_activities': [
                'Implemented dashboard filtering system',
                'Fixed API error handling bugs', 
                'Added comprehensive test coverage',
                'Updated documentation'
            ],
            'achievements': [
                'Successfully integrated new filtering component',
                'Achieved 95% test coverage',
                'Resolved critical API timeout issue'
            ],
            'blockers': [
                'Database migration pending review',
                'Deployment pipeline configuration needed'
            ],
            'next_actions': [
                'Complete database migration testing',
                'Set up CI/CD pipeline',
                'Conduct code review with team'
            ]
        }

def main():
    print("🎯 PreCompact Hook - Session Summary")
    print("=" * 36)
    
    analyzer = SessionAnalyzer()
    summary = analyzer.analyze_mock_session()
    
    print(f"📅 Session Duration: {summary['session_duration']}")
    print(f"📁 Project: {os.path.basename(os.getcwd())}")
    
    print("\\n🎯 Key Achievements:")
    for achievement in summary['achievements']:
        print(f"   ✅ {achievement}")
    
    print("\\n⚡ Activities Completed:")
    for activity in summary['key_activities']:
        print(f"   • {activity}")
    
    if summary['blockers']:
        print("\\n🚧 Current Blockers:")
        for blocker in summary['blockers']:
            print(f"   ❌ {blocker}")
    
    print("\\n📋 Next Actions:")
    for action in summary['next_actions']:
        print(f"   🎯 {action}")
    
    print("\\n📊 Session Stats:")
    print(f"   Files Modified: {len(summary['files_modified'])}")
    print(f"   Git Commits: {len(summary['git_commits'])}")
    print(f"   Commands: {summary['commands_run']}")
    print(f"   Tests: {summary['tests_executed']}")
    
    print("\\n💾 Summary saved for next session")
    print("✅ Ready for context compaction")

if __name__ == "__main__":
    main()`,
    expectedOutput: `🎯 PreCompact Hook - Session Summary
====================================
📅 Session Duration: 1h 23m
📁 Project: my-project

🎯 Key Achievements:
   ✅ Successfully integrated new filtering component
   ✅ Achieved 95% test coverage
   ✅ Resolved critical API timeout issue

⚡ Activities Completed:
   • Implemented dashboard filtering system
   • Fixed API error handling bugs
   • Added comprehensive test coverage
   • Updated documentation

🚧 Current Blockers:
   ❌ Database migration pending review
   ❌ Deployment pipeline configuration needed

📋 Next Actions:
   🎯 Complete database migration testing
   🎯 Set up CI/CD pipeline
   🎯 Conduct code review with team

📊 Session Stats:
   Files Modified: 2
   Git Commits: 2
   Commands: 15
   Tests: 8

💾 Summary saved for next session
✅ Ready for context compaction`
  },

  // JavaScript/Node.js Hooks
  {
    id: 'js-session-start',
    title: 'JavaScript Session Start',
    description: 'Node.js session initialization with package analysis',
    hookType: 'session_start',
    language: 'javascript',
    securityLevel: 'safe',
    tags: ['javascript', 'nodejs', 'session', 'packages'],
    code: `#!/usr/bin/env node
/**
 * JavaScript Session Start Hook
 * Node.js session initialization with package analysis
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function safeExec(command) {
    try {
        return execSync(command, { encoding: 'utf8', timeout: 5000 }).trim();
    } catch (error) {
        return null;
    }
}

function analyzeProject() {
    const cwd = typeof process !== 'undefined' ? process.cwd() : '/browser-environment';
    const projectName = cwd.split('/').pop() || 'unknown-project';
    
    console.log('🚀 JavaScript Session Starting');
    console.log('==============================');
    console.log(\`📁 Project: \${projectName}\`);
    console.log(\`📂 Directory: \${cwd}\`);
    console.log(\`⚡ Environment: \${typeof process !== 'undefined' ? process.version : 'Browser'}\`);
    
    // Package.json analysis
    if (fs.existsSync('package.json')) {
        try {
            const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            console.log('\\n📦 Package Information:');
            console.log(\`   Name: \${pkg.name || 'unnamed'}\`);
            console.log(\`   Version: \${pkg.version || 'unknown'}\`);
            
            if (pkg.scripts) {
                const scriptCount = Object.keys(pkg.scripts).length;
                console.log(\`   Scripts: \${scriptCount} available\`);
            }
            
            if (pkg.dependencies) {
                const depCount = Object.keys(pkg.dependencies).length;
                console.log(\`   Dependencies: \${depCount}\`);
            }
        } catch (error) {
            console.log('   ⚠️  Package.json parsing error');
        }
    }
    
    // Git information
    if (fs.existsSync('.git')) {
        console.log('\\n🌿 Git Repository:');
        const branch = safeExec('git branch --show-current');
        if (branch) console.log(\`   Branch: \${branch}\`);
        
        const lastCommit = safeExec('git log -1 --pretty=format:"%h %s"');
        if (lastCommit) console.log(\`   Last: \${lastCommit}\`);
    }
    
    console.log('\\n✅ JavaScript session initialized');
}

// Run analysis
analyzeProject();`,
    expectedOutput: `🚀 JavaScript Session Starting
==============================
📁 Project: my-app
📂 Directory: /home/user/my-app
⚡ Node.js: v18.17.0

📦 Package Information:
   Name: my-app
   Version: 1.2.3
   Scripts: 8 available
   Dependencies: 25

🌿 Git Repository:
   Branch: main
   Last: abc123f "Add new feature"

✅ JavaScript session initialized`
  },

  // Advanced/Complex Examples
  {
    id: 'python-advanced-monitoring',
    title: 'Advanced Python Monitoring Hook',
    description: 'Comprehensive system monitoring with alerts',
    hookType: 'session_start',
    language: 'python',
    securityLevel: 'moderate',
    tags: ['python', 'monitoring', 'advanced', 'system'],
    code: `#!/usr/bin/env python3
"""
Advanced Monitoring Hook - System Health Check
Comprehensive system monitoring with intelligent alerts
"""

import os
import sys
import psutil
import json
import time
from datetime import datetime
from typing import Dict, List, Any

class SystemMonitor:
    def __init__(self):
        self.alerts = []
        self.metrics = {}
        
    def check_system_health(self) -> Dict[str, Any]:
        """Comprehensive system health assessment"""
        health_data = {
            'timestamp': datetime.now().isoformat(),
            'system': {
                'cpu_percent': psutil.cpu_percent(interval=1),
                'memory_percent': psutil.virtual_memory().percent,
                'disk_percent': psutil.disk_usage('/').percent,
                'load_avg': os.getloadavg() if hasattr(os, 'getloadavg') else [0, 0, 0]
            },
            'process': {
                'total_processes': len(psutil.pids()),
                'python_processes': self._count_python_processes()
            },
            'network': self._check_network_status(),
            'alerts': self.alerts
        }
        
        self._evaluate_thresholds(health_data['system'])
        return health_data
    
    def _count_python_processes(self) -> int:
        """Count active Python processes"""
        python_count = 0
        for proc in psutil.process_iter(['pid', 'name']):
            try:
                if 'python' in proc.info['name'].lower():
                    python_count += 1
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        return python_count
    
    def _check_network_status(self) -> Dict[str, Any]:
        """Basic network connectivity check"""
        network_stats = psutil.net_io_counters()
        return {
            'bytes_sent': network_stats.bytes_sent,
            'bytes_recv': network_stats.bytes_recv,
            'packets_sent': network_stats.packets_sent,
            'packets_recv': network_stats.packets_recv
        }
    
    def _evaluate_thresholds(self, system_data: Dict[str, Any]):
        """Evaluate system metrics against thresholds"""
        if system_data['cpu_percent'] > 80:
            self.alerts.append({
                'level': 'warning',
                'message': f"High CPU usage: {system_data['cpu_percent']:.1f}%"
            })
        
        if system_data['memory_percent'] > 85:
            self.alerts.append({
                'level': 'warning', 
                'message': f"High memory usage: {system_data['memory_percent']:.1f}%"
            })
            
        if system_data['disk_percent'] > 90:
            self.alerts.append({
                'level': 'critical',
                'message': f"Critical disk usage: {system_data['disk_percent']:.1f}%"
            })

def main():
    print("🔍 Advanced System Monitoring")
    print("=" * 30)
    
    monitor = SystemMonitor()
    health = monitor.check_system_health()
    
    # System Overview
    sys_data = health['system']
    print(f"💻 System Status:")
    print(f"   CPU: {sys_data['cpu_percent']:.1f}%")
    print(f"   Memory: {sys_data['memory_percent']:.1f}%") 
    print(f"   Disk: {sys_data['disk_percent']:.1f}%")
    print(f"   Load: {sys_data['load_avg'][0]:.2f}")
    
    # Process Information
    proc_data = health['process']
    print(f"\\n🔧 Process Information:")
    print(f"   Total Processes: {proc_data['total_processes']}")
    print(f"   Python Processes: {proc_data['python_processes']}")
    
    # Network Status
    net_data = health['network']
    print(f"\\n🌐 Network Activity:")
    print(f"   Bytes Sent: {net_data['bytes_sent']:,}")
    print(f"   Bytes Received: {net_data['bytes_recv']:,}")
    
    # Alerts
    if health['alerts']:
        print("\\n⚠️ System Alerts:")
        for alert in health['alerts']:
            level_icon = "🚨" if alert['level'] == 'critical' else "⚠️"
            print(f"   {level_icon} {alert['message']}")
    else:
        print("\\n✅ No system alerts - all metrics within normal ranges")
    
    print("\\n📊 Monitoring data logged")
    print("🎯 System health check complete")

if __name__ == "__main__":
    main()`,
    expectedOutput: `🔍 Advanced System Monitoring
==============================
💻 System Status:
   CPU: 23.4%
   Memory: 67.2%
   Disk: 45.8%
   Load: 1.23

🔧 Process Information:
   Total Processes: 287
   Python Processes: 12

🌐 Network Activity:
   Bytes Sent: 1,234,567
   Bytes Received: 9,876,543

✅ No system alerts - all metrics within normal ranges

📊 Monitoring data logged
🎯 System health check complete`
  }
];

// Helper functions for the test scenarios
export function getScenariosByTag(tag: string): TestScenario[] {
  return testScenarios.filter(scenario => scenario.tags.includes(tag));
}

export function getScenariosByHookType(hookType: TestScenario['hookType']): TestScenario[] {
  return testScenarios.filter(scenario => scenario.hookType === hookType);
}

export function getScenariosByLanguage(language: TestScenario['language']): TestScenario[] {
  return testScenarios.filter(scenario => scenario.language === language);
}

export function getScenariosBySecurityLevel(level: TestScenario['securityLevel']): TestScenario[] {
  return testScenarios.filter(scenario => scenario.securityLevel === level);
}

// Export categories for UI filtering
export const HOOK_TYPES = ['session_start', 'session_stop', 'subagent_start', 'subagent_stop', 'pre_compact', 'custom'] as const;
export const LANGUAGES = ['python', 'bash', 'javascript'] as const;
export const SECURITY_LEVELS = ['safe', 'moderate', 'high'] as const;
export const ALL_TAGS = [
  'python', 'bash', 'javascript', 'nodejs',
  'session', 'subagent', 'precompact', 'custom',
  'basic', 'advanced', 'monitoring', 'git',
  'system-info', 'cleanup', 'summary', 'metrics',
  'initialization', 'resources', 'packages',
  'repository', 'context', 'safe', 'project-info'
] as const;

// Missing exports that PromptTester.vue is trying to import
export const scenarioCategories = {
  'Session Management': {
    hookTypes: ['session_start', 'session_stop'],
    description: 'Hooks for session lifecycle management'
  },
  'Subagent Operations': {
    hookTypes: ['subagent_start', 'subagent_stop'], 
    description: 'Hooks for AI subagent lifecycle management'
  },
  'Context Management': {
    hookTypes: ['pre_compact'],
    description: 'Hooks for context and memory management'
  },
  'Custom Hooks': {
    hookTypes: ['custom'],
    description: 'Custom user-defined hooks'
  }
} as const;

export const scenarioDifficulties = {
  'Beginner': {
    tags: ['basic', 'safe', 'project-info', 'system-info'],
    description: 'Simple, safe examples for learning'
  },
  'Intermediate': {
    tags: ['git', 'packages', 'cleanup', 'summary'],
    description: 'Practical examples with common functionality'
  },
  'Advanced': {
    tags: ['advanced', 'monitoring', 'metrics', 'resources'],
    description: 'Complex examples with comprehensive features'
  }
} as const;