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
