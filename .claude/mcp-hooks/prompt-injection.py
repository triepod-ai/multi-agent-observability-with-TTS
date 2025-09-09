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
