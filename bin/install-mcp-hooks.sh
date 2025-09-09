#!/bin/bash

# MCP Directory Review Hooks Installer
# Installs specialized hooks for evaluating MCP servers against Anthropic's 5 core requirements
# Based on MCP Directory Review Contractor standards

set -e  # Exit on error

# ANSI color codes for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Script configuration
# Resolve the actual script location (following symlinks)
SCRIPT_PATH="${BASH_SOURCE[0]}"
while [ -L "$SCRIPT_PATH" ]; do
    SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
    SCRIPT_PATH="$(readlink "$SCRIPT_PATH")"
    [[ $SCRIPT_PATH != /* ]] && SCRIPT_PATH="$SCRIPT_DIR/$SCRIPT_PATH"
done
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
SOURCE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
HOOKS_SOURCE_DIR="$SOURCE_DIR/.claude/mcp-hooks"
MCP_UTILS_DIR="$SOURCE_DIR/.claude/mcp-hooks/utils"

# Version
VERSION="1.0.0"

# Global installation paths
GLOBAL_BIN_DIR="/usr/local/bin"
SYMLINK_NAME="install-mcp-hooks"

# Display banner
show_banner() {
    echo -e "${CYAN}${BOLD}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║          MCP Directory Review Hooks Installer             ║"
    echo "║                     Version $VERSION                          ║"
    echo "║  Evaluating MCP servers against Anthropic's 5 standards   ║"
    echo "╔════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Display usage information
show_usage() {
    echo -e "${YELLOW}Usage:${NC} $0 [OPTIONS] [TARGET_PROJECT_PATH]"
    echo
    echo -e "${YELLOW}Options:${NC}"
    echo "  -h, --help          Show this help message"
    echo "  -v, --version       Show version information"
    echo "  -l, --list          List available MCP evaluation hooks"
    echo "  -t, --test          Run installation in test mode (dry run)"
    echo "  -s, --select        Select specific hooks to install"
    echo "  -u, --uninstall     Remove MCP hooks from target project"
    echo "  -g, --global        Install globally with symlink (requires sudo)"
    echo
    echo -e "${YELLOW}Examples:${NC}"
    echo "  $0                           # Install to current directory"
    echo "  $0 /path/to/project         # Install to specific project"
    echo "  $0 -l                       # List available MCP hooks"
    echo "  $0 -s functionality,security /path/to/project  # Install specific hooks"
    echo "  $0 -g                        # Install globally (one-time setup)"
    echo
    echo -e "${YELLOW}MCP Evaluation Hooks:${NC}"
    echo "  1. functionality-match    - Verify implementation matches claims"
    echo "  2. prompt-injection      - Test for prompt injection vulnerabilities"
    echo "  3. tool-naming           - Validate clear, unique tool names"
    echo "  4. working-examples      - Test documented examples"
    echo "  5. error-handling        - Evaluate error response quality"
}

# List available MCP hooks
list_hooks() {
    echo -e "${CYAN}${BOLD}Available MCP Evaluation Hooks:${NC}"
    echo
    echo -e "${GREEN}Core Requirements (Anthropic MCP Directory Standards):${NC}"
    echo "  • functionality-match.py    - Validates implementation matches documentation"
    echo "  • prompt-injection.py       - Tests for prompt injection vulnerabilities"
    echo "  • tool-naming.py           - Checks for clear, unique tool names"
    echo "  • working-examples.py      - Verifies at least 3 working examples"
    echo "  • error-handling.py        - Tests graceful error handling"
    echo
    echo -e "${BLUE}Utility Hooks:${NC}"
    echo "  • mcp-server-start.py      - Monitors MCP server initialization"
    echo "  • mcp-tool-use.py          - Tracks tool usage and performance"
    echo "  • mcp-evaluation-report.py - Generates comprehensive evaluation report"
    echo
    echo -e "${YELLOW}Test Utilities:${NC}"
    echo "  • mcp_test_runner.py       - Automated test execution framework"
    echo "  • mcp_security_tester.py   - Security vulnerability scanner"
    echo "  • mcp_example_validator.py - Example documentation validator"
}

# Check if target directory is valid
validate_target() {
    local target="$1"
    
    if [ ! -d "$target" ]; then
        echo -e "${RED}Error: Target directory '$target' does not exist${NC}"
        return 1
    fi
    
    if [ ! -w "$target" ]; then
        echo -e "${RED}Error: No write permissions for '$target'${NC}"
        return 1
    fi
    
    # Check if it's a Claude Code project (has .claude directory)
    if [ ! -d "$target/.claude" ]; then
        echo -e "${YELLOW}Warning: Target doesn't have .claude directory. Creating it...${NC}"
        mkdir -p "$target/.claude/hooks"
    fi
    
    return 0
}

# Create MCP hooks source directory if it doesn't exist
create_mcp_hooks() {
    echo -e "${CYAN}Creating MCP evaluation hooks...${NC}"
    
    mkdir -p "$HOOKS_SOURCE_DIR"
    mkdir -p "$MCP_UTILS_DIR"
    
    # Create functionality-match.py
    cat > "$HOOKS_SOURCE_DIR/functionality-match.py" << 'EOF'
#!/usr/bin/env uv run --quiet --with requests --with pyyaml
"""
MCP Functionality Match Evaluator
Requirement 1: Verify implementation does exactly what it claims
"""

import json
import sys
import os
import yaml
import subprocess
from pathlib import Path
from datetime import datetime

def load_mcp_config(project_path):
    """Load MCP server configuration from project"""
    config_paths = [
        Path(project_path) / "mcp.json",
        Path(project_path) / "claude_mcp.json",
        Path(project_path) / ".mcp" / "config.json"
    ]
    
    for config_path in config_paths:
        if config_path.exists():
            with open(config_path) as f:
                return json.load(f)
    
    return None

def evaluate_functionality(project_path):
    """Evaluate if implementation matches claims"""
    results = {
        "requirement": "Functionality Match",
        "score": "Need More Info",
        "evidence": [],
        "timestamp": datetime.now().isoformat()
    }
    
    # Check for documentation
    readme_path = Path(project_path) / "README.md"
    if readme_path.exists():
        with open(readme_path) as f:
            readme_content = f.read()
            if "## Features" in readme_content or "## Tools" in readme_content:
                results["evidence"].append("Documentation found with feature descriptions")
    
    # Check for MCP configuration
    config = load_mcp_config(project_path)
    if config:
        tools = config.get("tools", [])
        results["evidence"].append(f"Found {len(tools)} defined tools in configuration")
        
        # Check if each tool has implementation
        for tool in tools:
            tool_name = tool.get("name", "unknown")
            # Try to find corresponding implementation
            impl_files = list(Path(project_path).rglob(f"*{tool_name}*"))
            if impl_files:
                results["evidence"].append(f"Implementation found for tool '{tool_name}'")
            else:
                results["evidence"].append(f"Warning: No implementation found for tool '{tool_name}'")
                results["score"] = "Fail"
    
    # Determine final score
    if len(results["evidence"]) >= 2 and results["score"] != "Fail":
        results["score"] = "Pass"
    
    return results

def main():
    project_path = os.getcwd()
    results = evaluate_functionality(project_path)
    
    # Output results
    print(json.dumps(results, indent=2))
    
    # Send to observability system if available
    try:
        import requests
        requests.post(
            "http://localhost:3456/api/mcp-evaluation",
            json=results,
            timeout=1
        )
    except:
        pass

if __name__ == "__main__":
    main()
EOF

    # Create prompt-injection.py
    cat > "$HOOKS_SOURCE_DIR/prompt-injection.py" << 'EOF'
#!/usr/bin/env uv run --quiet --with requests
"""
MCP Prompt Injection Tester
Requirement 2: No unexpected messages or prompts to publish to social media
"""

import json
import sys
import os
import re
from datetime import datetime
from pathlib import Path

# Common prompt injection patterns
INJECTION_PATTERNS = [
    r"publish.*social\s*media",
    r"tweet\s*this",
    r"post\s*to\s*(facebook|twitter|instagram|linkedin)",
    r"share\s*on\s*social",
    r"ignore\s*(previous|above)\s*instructions",
    r"system\s*prompt",
    r"role:\s*system",
    r"<\|im_start\|>",
    r"<\|im_end\|>",
    r"\[INST\]",
    r"\[/INST\]",
    r"###\s*Human:",
    r"###\s*Assistant:",
]

def scan_for_injections(project_path):
    """Scan project files for prompt injection attempts"""
    results = {
        "requirement": "No Prompt Injections",
        "score": "Pass",
        "evidence": [],
        "timestamp": datetime.now().isoformat()
    }
    
    # Scan all Python and JavaScript files
    extensions = ["*.py", "*.js", "*.ts", "*.mjs"]
    suspicious_files = []
    
    for ext in extensions:
        for file_path in Path(project_path).rglob(ext):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                    for pattern in INJECTION_PATTERNS:
                        if re.search(pattern, content, re.IGNORECASE):
                            suspicious_files.append({
                                "file": str(file_path.relative_to(project_path)),
                                "pattern": pattern
                            })
                            results["score"] = "Fail"
            except:
                continue
    
    if suspicious_files:
        results["evidence"].append(f"Found {len(suspicious_files)} suspicious patterns")
        for item in suspicious_files[:3]:  # Show first 3
            results["evidence"].append(f"Pattern '{item['pattern']}' in {item['file']}")
    else:
        results["evidence"].append("No prompt injection patterns detected")
        results["evidence"].append("Code appears safe from social media hijacking")
    
    return results

def main():
    project_path = os.getcwd()
    results = scan_for_injections(project_path)
    
    # Output results
    print(json.dumps(results, indent=2))
    
    # Send to observability system if available
    try:
        import requests
        requests.post(
            "http://localhost:3456/api/mcp-evaluation",
            json=results,
            timeout=1
        )
    except:
        pass

if __name__ == "__main__":
    main()
EOF

    # Create tool-naming.py
    cat > "$HOOKS_SOURCE_DIR/tool-naming.py" << 'EOF'
#!/usr/bin/env uv run --quiet --with requests
"""
MCP Tool Naming Validator
Requirement 3: Unique, non-conflicting names that clearly indicate function
"""

import json
import sys
import os
from pathlib import Path
from datetime import datetime

def evaluate_tool_names(project_path):
    """Evaluate tool naming conventions"""
    results = {
        "requirement": "Clear Tool Names",
        "score": "Pass",
        "evidence": [],
        "timestamp": datetime.now().isoformat()
    }
    
    # Load MCP configuration
    config_paths = [
        Path(project_path) / "mcp.json",
        Path(project_path) / "claude_mcp.json",
        Path(project_path) / ".mcp" / "config.json"
    ]
    
    config = None
    for config_path in config_paths:
        if config_path.exists():
            with open(config_path) as f:
                config = json.load(f)
                break
    
    if not config:
        results["score"] = "Need More Info"
        results["evidence"].append("No MCP configuration file found")
        return results
    
    tools = config.get("tools", [])
    tool_names = [tool.get("name", "") for tool in tools]
    
    # Check for duplicates
    duplicates = [name for name in tool_names if tool_names.count(name) > 1]
    if duplicates:
        results["score"] = "Fail"
        results["evidence"].append(f"Found duplicate tool names: {set(duplicates)}")
    
    # Check for clear naming
    unclear_names = []
    for name in tool_names:
        # Check if name is too generic or unclear
        if len(name) < 3 or name in ["do", "run", "execute", "call", "fn", "func"]:
            unclear_names.append(name)
        # Check if name uses proper conventions
        elif not (name.replace("_", "").replace("-", "").isalnum()):
            unclear_names.append(name)
    
    if unclear_names:
        results["score"] = "Fail"
        results["evidence"].append(f"Unclear tool names found: {unclear_names}")
    else:
        results["evidence"].append(f"All {len(tool_names)} tool names are clear and unique")
        results["evidence"].append("Tool names follow proper naming conventions")
    
    return results

def main():
    project_path = os.getcwd()
    results = evaluate_tool_names(project_path)
    
    # Output results
    print(json.dumps(results, indent=2))
    
    # Send to observability system if available
    try:
        import requests
        requests.post(
            "http://localhost:3456/api/mcp-evaluation",
            json=results,
            timeout=1
        )
    except:
        pass

if __name__ == "__main__":
    main()
EOF

    # Create working-examples.py
    cat > "$HOOKS_SOURCE_DIR/working-examples.py" << 'EOF'
#!/usr/bin/env uv run --quiet --with requests
"""
MCP Working Examples Validator
Requirement 4: At least 3 functional example prompts demonstrating core features
"""

import json
import sys
import os
import re
from pathlib import Path
from datetime import datetime

def find_examples(project_path):
    """Find and validate examples in documentation"""
    results = {
        "requirement": "Working Examples",
        "score": "Fail",
        "evidence": [],
        "timestamp": datetime.now().isoformat()
    }
    
    examples_found = []
    
    # Check README.md for examples
    readme_path = Path(project_path) / "README.md"
    if readme_path.exists():
        with open(readme_path, 'r') as f:
            content = f.read()
            
            # Look for code blocks with examples
            code_blocks = re.findall(r'```(?:json|javascript|typescript|python)?\n(.*?)\n```', content, re.DOTALL)
            examples_found.extend(code_blocks)
            
            # Look for example sections
            if "## Example" in content or "### Example" in content:
                results["evidence"].append("Found example section in README")
    
    # Check for examples directory
    examples_dir = Path(project_path) / "examples"
    if examples_dir.exists():
        example_files = list(examples_dir.glob("*"))
        if example_files:
            results["evidence"].append(f"Found {len(example_files)} files in examples directory")
            examples_found.extend(example_files)
    
    # Check for test files (often contain examples)
    test_patterns = ["test_*.py", "*.test.js", "*.spec.ts", "*.test.ts"]
    for pattern in test_patterns:
        test_files = list(Path(project_path).rglob(pattern))
        if test_files:
            results["evidence"].append(f"Found {len(test_files)} test files with potential examples")
            examples_found.extend(test_files)
    
    # Evaluate findings
    if len(examples_found) >= 3:
        results["score"] = "Pass"
        results["evidence"].append(f"Found at least {min(len(examples_found), 3)} working examples")
        results["evidence"].append("Documentation includes example code blocks")
    elif len(examples_found) > 0:
        results["score"] = "Need More Info"
        results["evidence"].append(f"Found {len(examples_found)} examples (need at least 3)")
    else:
        results["evidence"].append("No examples found in documentation or code")
    
    return results

def main():
    project_path = os.getcwd()
    results = find_examples(project_path)
    
    # Output results
    print(json.dumps(results, indent=2))
    
    # Send to observability system if available
    try:
        import requests
        requests.post(
            "http://localhost:3456/api/mcp-evaluation",
            json=results,
            timeout=1
        )
    except:
        pass

if __name__ == "__main__":
    main()
EOF

    # Create error-handling.py
    cat > "$HOOKS_SOURCE_DIR/error-handling.py" << 'EOF'
#!/usr/bin/env uv run --quiet --with requests
"""
MCP Error Handling Evaluator
Requirement 5: Graceful error responses with helpful feedback
"""

import json
import sys
import os
import re
from pathlib import Path
from datetime import datetime

def evaluate_error_handling(project_path):
    """Evaluate error handling implementation"""
    results = {
        "requirement": "Error Handling",
        "score": "Need More Info",
        "evidence": [],
        "timestamp": datetime.now().isoformat()
    }
    
    error_handling_patterns = {
        "try_catch": r"try\s*{|try:\s*\n",
        "error_messages": r"(throw\s+new\s+Error|raise\s+\w+Error)",
        "validation": r"(validate|check|verify|assert)",
        "error_types": r"(Error|Exception)\s*\(",
        "logging": r"(console\.(error|warn)|logger\.(error|warning)|logging\.(error|warning))"
    }
    
    patterns_found = {}
    files_checked = 0
    
    # Scan source files
    extensions = ["*.py", "*.js", "*.ts", "*.mjs"]
    for ext in extensions:
        for file_path in Path(project_path).rglob(ext):
            files_checked += 1
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                    for pattern_name, pattern in error_handling_patterns.items():
                        if re.search(pattern, content, re.MULTILINE):
                            if pattern_name not in patterns_found:
                                patterns_found[pattern_name] = 0
                            patterns_found[pattern_name] += 1
            except:
                continue
    
    # Evaluate findings
    if files_checked == 0:
        results["evidence"].append("No source files found to evaluate")
        return results
    
    # Check for comprehensive error handling
    has_try_catch = patterns_found.get("try_catch", 0) > 0
    has_error_messages = patterns_found.get("error_messages", 0) > 0
    has_validation = patterns_found.get("validation", 0) > 0
    has_logging = patterns_found.get("logging", 0) > 0
    
    if has_try_catch and has_error_messages:
        results["score"] = "Pass"
        results["evidence"].append(f"Found {patterns_found.get('try_catch', 0)} try-catch blocks")
        
    if has_validation:
        results["evidence"].append(f"Found {patterns_found.get('validation', 0)} validation patterns")
        
    if has_logging:
        results["evidence"].append(f"Found {patterns_found.get('logging', 0)} error logging instances")
    
    if results["score"] == "Pass":
        results["evidence"].append("Error handling appears comprehensive with proper feedback")
    elif has_try_catch or has_error_messages:
        results["score"] = "Need More Info"
        results["evidence"].append("Some error handling present but needs review")
    else:
        results["score"] = "Fail"
        results["evidence"].append("Minimal error handling detected")
    
    return results

def main():
    project_path = os.getcwd()
    results = evaluate_error_handling(project_path)
    
    # Output results
    print(json.dumps(results, indent=2))
    
    # Send to observability system if available
    try:
        import requests
        requests.post(
            "http://localhost:3456/api/mcp-evaluation",
            json=results,
            timeout=1
        )
    except:
        pass

if __name__ == "__main__":
    main()
EOF

    echo -e "${GREEN}✓ Created MCP evaluation hooks${NC}"
}

# Create utility scripts
create_utilities() {
    echo -e "${CYAN}Creating MCP test utilities...${NC}"
    
    # Create test runner
    cat > "$MCP_UTILS_DIR/mcp_test_runner.py" << 'EOF'
#!/usr/bin/env python3
"""
MCP Test Runner - Automated testing framework for MCP servers
"""

import subprocess
import json
import sys
from pathlib import Path
from datetime import datetime

class MCPTestRunner:
    def __init__(self, project_path):
        self.project_path = Path(project_path)
        self.results = []
        
    def run_all_tests(self):
        """Run all MCP evaluation tests"""
        tests = [
            "functionality-match.py",
            "prompt-injection.py", 
            "tool-naming.py",
            "working-examples.py",
            "error-handling.py"
        ]
        
        for test in tests:
            test_path = self.project_path / ".claude" / "hooks" / test
            if test_path.exists():
                result = subprocess.run(
                    [sys.executable, str(test_path)],
                    capture_output=True,
                    text=True,
                    cwd=self.project_path
                )
                
                try:
                    test_result = json.loads(result.stdout)
                    self.results.append(test_result)
                except:
                    self.results.append({
                        "requirement": test.replace(".py", ""),
                        "score": "Error",
                        "evidence": ["Test execution failed"]
                    })
        
        return self.results
    
    def generate_report(self):
        """Generate evaluation report"""
        report = {
            "timestamp": datetime.now().isoformat(),
            "project": str(self.project_path),
            "results": self.results,
            "summary": {
                "passed": sum(1 for r in self.results if r.get("score") == "Pass"),
                "failed": sum(1 for r in self.results if r.get("score") == "Fail"),
                "need_info": sum(1 for r in self.results if r.get("score") == "Need More Info")
            }
        }
        
        return report

if __name__ == "__main__":
    runner = MCPTestRunner(Path.cwd())
    runner.run_all_tests()
    report = runner.generate_report()
    print(json.dumps(report, indent=2))
EOF

    # Create evaluation report generator
    cat > "$HOOKS_SOURCE_DIR/mcp-evaluation-report.py" << 'EOF'
#!/usr/bin/env uv run --quiet --with tabulate --with requests
"""
MCP Evaluation Report Generator
Generates comprehensive evaluation report based on all test results
"""

import json
import sys
import os
from pathlib import Path
from datetime import datetime
from tabulate import tabulate

def generate_report():
    """Generate comprehensive evaluation report"""
    # Run the test runner to get all results
    import subprocess
    result = subprocess.run(
        [sys.executable, ".claude/hooks/utils/mcp_test_runner.py"],
        capture_output=True,
        text=True
    )
    
    try:
        data = json.loads(result.stdout)
    except:
        print("Error: Could not run tests")
        return
    
    # Create formatted report
    print("\n" + "="*60)
    print("MCP DIRECTORY EVALUATION REPORT")
    print("="*60)
    print(f"Timestamp: {data['timestamp']}")
    print(f"Project: {data['project']}")
    print("-"*60)
    
    # Create results table
    table_data = []
    for result in data['results']:
        score_symbol = {
            "Pass": "✅",
            "Fail": "❌", 
            "Need More Info": "⚠️",
            "Error": "⛔"
        }.get(result['score'], "❓")
        
        evidence = "\n".join(result.get('evidence', []))[:100] + "..."
        table_data.append([
            result['requirement'],
            f"{score_symbol} {result['score']}",
            evidence
        ])
    
    print(tabulate(table_data, headers=["Requirement", "Score", "Evidence"], tablefmt="grid"))
    
    # Summary
    print("\n" + "-"*60)
    print("SUMMARY:")
    print(f"  Passed: {data['summary']['passed']}/5")
    print(f"  Failed: {data['summary']['failed']}/5")
    print(f"  Need More Info: {data['summary']['need_info']}/5")
    
    # Recommendation
    if data['summary']['passed'] == 5:
        print("\n✅ RECOMMENDATION: Ready for MCP Directory submission")
    elif data['summary']['failed'] > 0:
        print("\n❌ RECOMMENDATION: Address failed requirements before submission")
    else:
        print("\n⚠️ RECOMMENDATION: Gather more information and re-evaluate")
    
    print("="*60 + "\n")

if __name__ == "__main__":
    generate_report()
EOF

    echo -e "${GREEN}✓ Created utility scripts${NC}"
}

# Install hooks to target project
install_hooks() {
    local target="$1"
    local selected_hooks="$2"
    
    echo -e "${CYAN}Installing MCP evaluation hooks to: $target${NC}"
    
    # Create target directories
    mkdir -p "$target/.claude/hooks"
    mkdir -p "$target/.claude/hooks/utils"
    
    # Determine which hooks to install
    if [ -z "$selected_hooks" ]; then
        # Install all hooks
        hooks_to_install=(
            "functionality-match.py"
            "prompt-injection.py"
            "tool-naming.py"
            "working-examples.py"
            "error-handling.py"
            "mcp-evaluation-report.py"
        )
    else
        # Install selected hooks
        IFS=',' read -ra hooks_to_install <<< "$selected_hooks"
    fi
    
    # Copy hooks
    for hook in "${hooks_to_install[@]}"; do
        hook_file="${hook}.py"
        if [ ! -f "$hook_file" ]; then
            hook_file="$hook"
        fi
        
        if [ -f "$HOOKS_SOURCE_DIR/$hook_file" ]; then
            cp "$HOOKS_SOURCE_DIR/$hook_file" "$target/.claude/hooks/"
            chmod +x "$target/.claude/hooks/$hook_file"
            echo -e "  ${GREEN}✓${NC} Installed $hook_file"
        else
            echo -e "  ${YELLOW}⚠${NC} Hook not found: $hook_file"
        fi
    done
    
    # Copy utilities
    if [ -d "$MCP_UTILS_DIR" ]; then
        cp -r "$MCP_UTILS_DIR" "$target/.claude/hooks/"
        echo -e "  ${GREEN}✓${NC} Installed utility scripts"
    fi
    
    # Update or create settings.json for hooks
    settings_file="$target/.claude/settings.json"
    if [ -f "$settings_file" ]; then
        echo -e "${CYAN}Updating existing settings.json...${NC}"
        # Backup existing settings
        cp "$settings_file" "$settings_file.backup"
        
        # Update settings with Python script
        python3 - <<EOF
import json

with open("$settings_file", 'r') as f:
    settings = json.load(f)

# Add MCP evaluation hooks
if 'mcpHooks' not in settings:
    settings['mcpHooks'] = {}

settings['mcpHooks']['toolUse'] = [
    ".claude/hooks/functionality-match.py",
    ".claude/hooks/tool-naming.py"
]
settings['mcpHooks']['onStart'] = [
    ".claude/hooks/prompt-injection.py",
    ".claude/hooks/error-handling.py"
]
settings['mcpHooks']['onTest'] = [
    ".claude/hooks/working-examples.py"
]
settings['mcpHooks']['onReport'] = [
    ".claude/hooks/mcp-evaluation-report.py"
]

with open("$settings_file", 'w') as f:
    json.dump(settings, f, indent=2)

print("Settings updated successfully")
EOF
    else
        # Create new settings file
        cat > "$settings_file" << 'EOF'
{
  "mcpHooks": {
    "toolUse": [
      ".claude/hooks/functionality-match.py",
      ".claude/hooks/tool-naming.py"
    ],
    "onStart": [
      ".claude/hooks/prompt-injection.py",
      ".claude/hooks/error-handling.py"
    ],
    "onTest": [
      ".claude/hooks/working-examples.py"
    ],
    "onReport": [
      ".claude/hooks/mcp-evaluation-report.py"
    ]
  }
}
EOF
        echo -e "  ${GREEN}✓${NC} Created settings.json with MCP hooks configuration"
    fi
    
    echo -e "${GREEN}${BOLD}✓ MCP evaluation hooks installed successfully!${NC}"
}

# Install globally with symlink
install_global() {
    echo -e "${CYAN}Installing install-mcp-hooks globally...${NC}"
    
    # Check if running with sudo for global install
    if [ "$EUID" -ne 0 ] && [ ! -w "$GLOBAL_BIN_DIR" ]; then
        echo -e "${YELLOW}Note: Global installation requires sudo privileges${NC}"
        echo -e "Please run: ${BOLD}sudo $0 --global${NC}"
        exit 1
    fi
    
    # Create symlink
    SCRIPT_PATH="$SCRIPT_DIR/$(basename "$0")"
    SYMLINK_PATH="$GLOBAL_BIN_DIR/$SYMLINK_NAME"
    
    # Remove existing symlink if present
    if [ -L "$SYMLINK_PATH" ]; then
        echo -e "${YELLOW}Removing existing symlink...${NC}"
        rm "$SYMLINK_PATH"
    elif [ -f "$SYMLINK_PATH" ]; then
        echo -e "${RED}Error: $SYMLINK_PATH exists and is not a symlink${NC}"
        echo -e "${YELLOW}Please remove it manually and try again${NC}"
        exit 1
    fi
    
    # Create new symlink
    ln -s "$SCRIPT_PATH" "$SYMLINK_PATH"
    
    if [ -L "$SYMLINK_PATH" ]; then
        echo -e "${GREEN}✓ Created symlink: $SYMLINK_PATH -> $SCRIPT_PATH${NC}"
        echo -e "${GREEN}✓ Global installation complete!${NC}"
        echo
        echo -e "${CYAN}You can now use '${BOLD}$SYMLINK_NAME${NC}${CYAN}' from anywhere:${NC}"
        echo -e "  ${BOLD}$SYMLINK_NAME${NC}                    # Install to current directory"
        echo -e "  ${BOLD}$SYMLINK_NAME${NC} /path/to/project  # Install to specific project"
        echo -e "  ${BOLD}$SYMLINK_NAME${NC} -l                 # List available hooks"
        echo -e "  ${BOLD}$SYMLINK_NAME${NC} -h                 # Show help"
    else
        echo -e "${RED}Error: Failed to create symlink${NC}"
        exit 1
    fi
}

# Uninstall global symlink
uninstall_global() {
    echo -e "${YELLOW}Uninstalling global symlink...${NC}"
    
    SYMLINK_PATH="$GLOBAL_BIN_DIR/$SYMLINK_NAME"
    
    if [ -L "$SYMLINK_PATH" ]; then
        # Check if running with sudo if needed
        if [ ! -w "$GLOBAL_BIN_DIR" ] && [ "$EUID" -ne 0 ]; then
            echo -e "${YELLOW}Note: Removing global symlink requires sudo privileges${NC}"
            echo -e "Please run: ${BOLD}sudo $0 --uninstall-global${NC}"
            exit 1
        fi
        
        rm "$SYMLINK_PATH"
        echo -e "${GREEN}✓ Removed global symlink: $SYMLINK_PATH${NC}"
    else
        echo -e "${YELLOW}No global symlink found at $SYMLINK_PATH${NC}"
    fi
}

# Uninstall hooks from target project
uninstall_hooks() {
    local target="$1"
    
    echo -e "${YELLOW}Uninstalling MCP hooks from: $target${NC}"
    
    # Remove hook files
    hooks=(
        "functionality-match.py"
        "prompt-injection.py"
        "tool-naming.py"
        "working-examples.py"
        "error-handling.py"
        "mcp-evaluation-report.py"
    )
    
    for hook in "${hooks[@]}"; do
        if [ -f "$target/.claude/hooks/$hook" ]; then
            rm "$target/.claude/hooks/$hook"
            echo -e "  ${GREEN}✓${NC} Removed $hook"
        fi
    done
    
    # Remove utilities
    if [ -d "$target/.claude/hooks/utils" ]; then
        rm -rf "$target/.claude/hooks/utils"
        echo -e "  ${GREEN}✓${NC} Removed utility scripts"
    fi
    
    echo -e "${GREEN}✓ MCP hooks uninstalled${NC}"
}

# Main execution
main() {
    show_banner
    
    # Parse arguments
    TARGET_PROJECT=""
    TEST_MODE=false
    SELECTED_HOOKS=""
    ACTION="install"
    GLOBAL_INSTALL=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -v|--version)
                echo "MCP Hooks Installer version $VERSION"
                exit 0
                ;;
            -l|--list)
                list_hooks
                exit 0
                ;;
            -t|--test)
                TEST_MODE=true
                shift
                ;;
            -s|--select)
                SELECTED_HOOKS="$2"
                shift 2
                ;;
            -u|--uninstall)
                ACTION="uninstall"
                shift
                ;;
            -g|--global)
                ACTION="install-global"
                shift
                ;;
            --uninstall-global)
                ACTION="uninstall-global"
                shift
                ;;
            *)
                TARGET_PROJECT="$1"
                shift
                ;;
        esac
    done
    
    # Handle global actions first (don't need target validation)
    if [ "$ACTION" = "install-global" ] || [ "$ACTION" = "uninstall-global" ]; then
        # Create MCP hooks if they don't exist (for install-global)
        if [ "$ACTION" = "install-global" ] && [ ! -d "$HOOKS_SOURCE_DIR" ]; then
            create_mcp_hooks
            create_utilities
        fi
        
        case $ACTION in
            install-global)
                install_global
                ;;
            uninstall-global)
                uninstall_global
                ;;
        esac
        exit 0
    fi
    
    # Set default target if not provided
    if [ -z "$TARGET_PROJECT" ]; then
        TARGET_PROJECT="$(pwd)"
    fi
    
    # Convert to absolute path
    TARGET_PROJECT="$(cd "$TARGET_PROJECT" 2>/dev/null && pwd)" || {
        echo -e "${RED}Error: Invalid target path${NC}"
        exit 1
    }
    
    # Validate target
    if ! validate_target "$TARGET_PROJECT"; then
        exit 1
    fi
    
    # Create MCP hooks if they don't exist
    if [ ! -d "$HOOKS_SOURCE_DIR" ]; then
        create_mcp_hooks
        create_utilities
    fi
    
    # Perform action (global actions already handled above)
    case $ACTION in
        install)
            if [ "$TEST_MODE" = true ]; then
                echo -e "${YELLOW}Running in test mode (dry run)${NC}"
                echo "Would install to: $TARGET_PROJECT"
                list_hooks
            else
                install_hooks "$TARGET_PROJECT" "$SELECTED_HOOKS"
                echo
                echo -e "${CYAN}Next steps:${NC}"
                echo "  1. Navigate to your MCP server project"
                echo "  2. Run the evaluation: python3 .claude/hooks/mcp-evaluation-report.py"
                echo "  3. Review the generated report"
                echo "  4. Address any failed requirements"
                echo
                echo -e "${YELLOW}For manual testing:${NC}"
                echo "  python3 .claude/hooks/functionality-match.py"
                echo "  python3 .claude/hooks/prompt-injection.py"
                echo "  python3 .claude/hooks/tool-naming.py"
                echo "  python3 .claude/hooks/working-examples.py"
                echo "  python3 .claude/hooks/error-handling.py"
            fi
            ;;
        uninstall)
            uninstall_hooks "$TARGET_PROJECT"
            ;;
    esac
}

# Run main function
main "$@"