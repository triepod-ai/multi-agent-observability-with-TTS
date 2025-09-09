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
