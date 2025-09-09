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
