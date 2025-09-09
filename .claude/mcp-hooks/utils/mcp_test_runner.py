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
