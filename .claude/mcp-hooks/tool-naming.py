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
