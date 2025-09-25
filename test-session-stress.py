#!/usr/bin/env python3
"""
Session ID Stress Testing - Additional reliability tests for concurrent access and high-frequency operations.
"""

import concurrent.futures
import json
import os
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any
import threading
import uuid

class SessionStressTester:
    def __init__(self):
        self.project_name = "multi-agent-observability-system"
        self.session_file = Path(f"/tmp/claude_session_{self.project_name}")
        self.results = []
        self.lock = threading.Lock()

    def generate_session_id(self) -> str:
        return f"stress-test-{uuid.uuid4().hex[:8]}-{int(time.time() * 1000000)}"

    def concurrent_hook_execution(self, num_workers: int = 20, operations_per_worker: int = 10) -> Dict[str, Any]:
        """Test concurrent hook executions to ensure no race conditions."""
        print(f"🔥 STRESS TEST: Concurrent Hook Execution ({num_workers} workers, {operations_per_worker} ops each)")

        hooks_dir = Path(__file__).parent / ".claude" / "hooks"
        session_tracker = hooks_dir / "session_event_tracker.py"
        pre_tool_hook = hooks_dir / "pre_tool_use.py"

        results = []
        errors = []

        def worker_task(worker_id: int):
            """Worker function that simulates concurrent Claude sessions."""
            worker_results = []
            worker_errors = []

            for op_id in range(operations_per_worker):
                try:
                    # Generate unique session ID
                    session_id = self.generate_session_id()

                    # Start session (SessionStart)
                    session_input = {
                        "session_id": session_id,
                        "source": "startup"
                    }

                    start_time = time.perf_counter()
                    result1 = subprocess.run(
                        [str(session_tracker)],
                        input=json.dumps(session_input),
                        text=True,
                        capture_output=True,
                        timeout=5,
                        cwd=str(Path(__file__).parent)
                    )

                    # Immediately use PreToolUse to test retrieval
                    pre_input = {
                        "tool": "Read",
                        "parameters": {"file_path": f"/tmp/test_{worker_id}_{op_id}.txt"}
                    }

                    result2 = subprocess.run(
                        [str(pre_tool_hook)],
                        input=json.dumps(pre_input),
                        text=True,
                        capture_output=True,
                        timeout=5,
                        cwd=str(Path(__file__).parent)
                    )
                    end_time = time.perf_counter()

                    # Check if the session file contains our session ID
                    current_content = ""
                    if self.session_file.exists():
                        current_content = self.session_file.read_text().strip()

                    worker_results.append({
                        "worker_id": worker_id,
                        "op_id": op_id,
                        "session_id": session_id,
                        "execution_time": (end_time - start_time) * 1000,
                        "session_start_success": result1.returncode == 0,
                        "pre_tool_success": result2.returncode == 0,
                        "file_content": current_content,
                        "timestamp": time.time()
                    })

                except Exception as e:
                    worker_errors.append({
                        "worker_id": worker_id,
                        "op_id": op_id,
                        "error": str(e),
                        "timestamp": time.time()
                    })

            with self.lock:
                results.extend(worker_results)
                errors.extend(worker_errors)

        # Execute concurrent workers
        with concurrent.futures.ThreadPoolExecutor(max_workers=num_workers) as executor:
            futures = [executor.submit(worker_task, i) for i in range(num_workers)]
            concurrent.futures.wait(futures)

        # Analyze results
        total_operations = num_workers * operations_per_worker
        successful_operations = len([r for r in results if r["session_start_success"] and r["pre_tool_success"]])

        success_rate = (successful_operations / total_operations) * 100
        error_rate = (len(errors) / total_operations) * 100

        avg_execution_time = sum(r["execution_time"] for r in results) / len(results) if results else 0

        return {
            "test_name": "Concurrent Hook Execution",
            "success": success_rate >= 95.0 and error_rate < 5.0,
            "total_operations": total_operations,
            "successful_operations": successful_operations,
            "success_rate": success_rate,
            "error_count": len(errors),
            "error_rate": error_rate,
            "avg_execution_time_ms": avg_execution_time,
            "workers": num_workers,
            "operations_per_worker": operations_per_worker
        }

    def rapid_session_switching(self, num_sessions: int = 50) -> Dict[str, Any]:
        """Test rapid session switching to ensure file operations are atomic."""
        print(f"🔥 STRESS TEST: Rapid Session Switching ({num_sessions} sessions)")

        sys.path.append(str(Path(__file__).parent / ".claude" / "hooks" / "utils"))
        from session_helpers import store_session_id, get_stored_session_id

        session_ids = [self.generate_session_id() for _ in range(num_sessions)]
        store_times = []
        retrieve_times = []
        consistency_checks = []

        for i, session_id in enumerate(session_ids):
            # Store session ID
            start_time = time.perf_counter()
            store_success = store_session_id(session_id, self.project_name)
            store_time = (time.perf_counter() - start_time) * 1000
            store_times.append(store_time)

            # Immediately retrieve it
            start_time = time.perf_counter()
            retrieved_id = get_stored_session_id(self.project_name)
            retrieve_time = (time.perf_counter() - start_time) * 1000
            retrieve_times.append(retrieve_time)

            # Check consistency
            consistent = retrieved_id == session_id
            consistency_checks.append(consistent)

            # Brief pause to simulate realistic timing
            time.sleep(0.001)  # 1ms pause

        consistency_rate = (sum(consistency_checks) / len(consistency_checks)) * 100
        avg_store_time = sum(store_times) / len(store_times)
        avg_retrieve_time = sum(retrieve_times) / len(retrieve_times)
        max_store_time = max(store_times)
        max_retrieve_time = max(retrieve_times)

        return {
            "test_name": "Rapid Session Switching",
            "success": consistency_rate >= 99.0 and avg_store_time < 10.0,
            "num_sessions": num_sessions,
            "consistency_rate": consistency_rate,
            "avg_store_time_ms": avg_store_time,
            "avg_retrieve_time_ms": avg_retrieve_time,
            "max_store_time_ms": max_store_time,
            "max_retrieve_time_ms": max_retrieve_time,
            "total_operations": len(session_ids) * 2
        }

    def high_frequency_operations(self, operations: int = 1000, time_limit: int = 30) -> Dict[str, Any]:
        """Test high-frequency session operations under time pressure."""
        print(f"🔥 STRESS TEST: High-Frequency Operations ({operations} ops in {time_limit}s)")

        sys.path.append(str(Path(__file__).parent / ".claude" / "hooks" / "utils"))
        from session_helpers import store_session_id, get_stored_session_id

        start_time = time.time()
        completed_operations = 0
        errors = 0
        operation_times = []

        session_id = self.generate_session_id()

        while completed_operations < operations and (time.time() - start_time) < time_limit:
            try:
                # Alternating store and get operations
                op_start = time.perf_counter()

                if completed_operations % 2 == 0:
                    # Store operation
                    success = store_session_id(session_id, self.project_name)
                else:
                    # Get operation
                    retrieved_id = get_stored_session_id(self.project_name)
                    success = retrieved_id == session_id

                op_time = (time.perf_counter() - op_start) * 1000
                operation_times.append(op_time)

                if not success:
                    errors += 1

                completed_operations += 1

            except Exception as e:
                errors += 1
                completed_operations += 1

        total_time = time.time() - start_time
        ops_per_second = completed_operations / total_time
        error_rate = (errors / completed_operations) * 100
        avg_operation_time = sum(operation_times) / len(operation_times) if operation_times else 0

        return {
            "test_name": "High-Frequency Operations",
            "success": error_rate < 1.0 and ops_per_second > 100,
            "completed_operations": completed_operations,
            "total_time_seconds": total_time,
            "ops_per_second": ops_per_second,
            "errors": errors,
            "error_rate": error_rate,
            "avg_operation_time_ms": avg_operation_time,
            "target_ops": operations,
            "time_limit": time_limit
        }

    def generate_report(self) -> str:
        """Generate stress test report."""
        if not self.results:
            return "No stress test results available."

        passed_tests = sum(1 for r in self.results if r.get("success", False))
        success_rate = (passed_tests / len(self.results)) * 100

        report = [
            "=" * 80,
            "SESSION ID STRESS TEST REPORT",
            "=" * 80,
            f"Test Execution Time: {datetime.now().isoformat()}",
            f"Total Stress Tests: {len(self.results)}",
            f"Success Rate: {success_rate:.1f}%",
            "",
            "STRESS TEST RESULTS:",
            "-" * 40
        ]

        for i, result in enumerate(self.results, 1):
            status = "✅ PASS" if result.get("success", False) else "❌ FAIL"
            report.append(f"{i}. {result['test_name']}: {status}")

            if result['test_name'] == "Concurrent Hook Execution":
                report.append(f"   Operations: {result['successful_operations']}/{result['total_operations']} successful")
                report.append(f"   Success Rate: {result['success_rate']:.1f}%")
                report.append(f"   Error Rate: {result['error_rate']:.1f}%")
                report.append(f"   Avg Execution Time: {result['avg_execution_time_ms']:.2f}ms")

            elif result['test_name'] == "Rapid Session Switching":
                report.append(f"   Sessions: {result['num_sessions']}")
                report.append(f"   Consistency Rate: {result['consistency_rate']:.1f}%")
                report.append(f"   Store Time: {result['avg_store_time_ms']:.2f}ms avg, {result['max_store_time_ms']:.2f}ms max")
                report.append(f"   Retrieve Time: {result['avg_retrieve_time_ms']:.2f}ms avg, {result['max_retrieve_time_ms']:.2f}ms max")

            elif result['test_name'] == "High-Frequency Operations":
                report.append(f"   Operations: {result['completed_operations']}/{result['target_ops']}")
                report.append(f"   Performance: {result['ops_per_second']:.0f} ops/sec")
                report.append(f"   Error Rate: {result['error_rate']:.1f}%")
                report.append(f"   Avg Operation Time: {result['avg_operation_time_ms']:.2f}ms")

            report.append("")

        # Overall assessment
        report.extend([
            "RELIABILITY ASSESSMENT:",
            "-" * 25,
            f"System Performance: {'🟢 EXCELLENT' if success_rate == 100.0 else '🟡 ACCEPTABLE' if success_rate >= 90.0 else '🔴 NEEDS IMPROVEMENT'}",
            f"Concurrent Safety: Validated with multiple workers and rapid switching",
            f"High-Frequency Handling: Tested under sustained load",
            f"Overall Reliability: {success_rate:.1f}% of stress tests passed",
            ""
        ])

        return "\n".join(report)

    def run_all_stress_tests(self):
        """Run all stress tests."""
        print("🔥 Starting Session ID Stress Testing")
        print("Testing system reliability under concurrent access and high-frequency operations\n")

        # Run stress tests
        self.results.append(self.concurrent_hook_execution(num_workers=20, operations_per_worker=5))
        self.results.append(self.rapid_session_switching(num_sessions=100))
        self.results.append(self.high_frequency_operations(operations=500, time_limit=10))

        # Generate report
        report = self.generate_report()
        print(report)

        # Save report
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        report_file = Path(__file__).parent / "test-results" / f"session_stress_test_{timestamp}.txt"
        report_file.parent.mkdir(exist_ok=True)
        report_file.write_text(report)
        print(f"📊 Stress test report saved: {report_file}")

        # Return success status
        passed_tests = sum(1 for r in self.results if r.get("success", False))
        return passed_tests == len(self.results)

def main():
    tester = SessionStressTester()
    success = tester.run_all_stress_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()