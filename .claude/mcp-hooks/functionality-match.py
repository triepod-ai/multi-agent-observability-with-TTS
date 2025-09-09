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
