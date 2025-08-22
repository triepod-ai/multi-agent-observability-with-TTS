#!/usr/bin/env node

/**
 * Master Test Runner - Comprehensive Metrics Pipeline Validation
 * 
 * Runs all test files in sequence and provides a comprehensive summary report:
 * 1. test-metrics-pipeline.js - End-to-end pipeline validation
 * 2. test-redis-failure.js - Fallback system validation
 * 3. test-metrics-display.js - Frontend integration validation
 * 4. test-performance.js - Performance and load testing
 * 5. test-health-monitoring.js - Health check endpoint validation
 * 
 * Validates that dashboard shows non-zero values and system is production-ready.
 */

import { spawn } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const MASTER_TEST_SESSION = `master_test_${Date.now()}`;

// Test configuration
const CONFIG = {
  verbose: process.argv.includes('--verbose') || process.argv.includes('-v'),
  skipCleanup: process.argv.includes('--no-cleanup'),
  continueOnFailure: process.argv.includes('--continue-on-failure'),
  generateReport: !process.argv.includes('--no-report'),
  timeout: 300000, // 5 minutes per test
  retries: 1
};

// Test suite definitions
const TEST_SUITES = [
  {
    name: 'Metrics Pipeline End-to-End',
    file: 'test-metrics-pipeline.js',
    description: 'Validates complete event flow from ingestion to dashboard display',
    critical: true,
    priority: 1
  },
  {
    name: 'Redis Failure Fallback',
    file: 'test-redis-failure.js',
    description: 'Tests system behavior when Redis is unavailable',
    critical: true,
    priority: 2
  },
  {
    name: 'Frontend Display Integration',
    file: 'test-metrics-display.js',
    description: 'Validates dashboard shows real data and handles errors gracefully',
    critical: true,
    priority: 3
  },
  {
    name: 'Performance and Load Testing',
    file: 'test-performance.js',
    description: 'Tests system performance under high load conditions',
    critical: false,
    priority: 4
  },
  {
    name: 'Health Monitoring System',
    file: 'test-health-monitoring.js',
    description: 'Validates health check endpoints and monitoring capabilities',
    critical: false,
    priority: 5
  }
];

// Utility functions
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '✅',
    warn: '⚠️',
    error: '❌',
    debug: '🔍',
    test: '🧪',
    master: '👑',
    summary: '📊'
  }[level] || 'ℹ️';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function verbose(message) {
  if (CONFIG.verbose) {
    log(message, 'debug');
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test execution functions
async function runTestSuite(testSuite) {
  return new Promise((resolve, reject) => {
    log(`Starting ${testSuite.name}...`, 'test');
    verbose(`Running: node ${testSuite.file}`);
    
    const startTime = Date.now();
    const args = [];
    
    if (CONFIG.verbose) {
      args.push('--verbose');
    }
    
    const child = spawn('node', [testSuite.file, ...args], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        SERVER_URL,
        CLIENT_URL
      },
      stdio: CONFIG.verbose ? 'inherit' : 'pipe'
    });
    
    let stdout = '';
    let stderr = '';
    
    if (!CONFIG.verbose) {
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
    }
    
    // Set timeout
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Test suite '${testSuite.name}' timed out after ${CONFIG.timeout/1000} seconds`));
    }, CONFIG.timeout);
    
    child.on('close', (code) => {
      clearTimeout(timeout);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const result = {
        name: testSuite.name,
        file: testSuite.file,
        description: testSuite.description,
        critical: testSuite.critical,
        priority: testSuite.priority,
        startTime,
        endTime,
        duration,
        exitCode: code,
        success: code === 0,
        stdout: CONFIG.verbose ? 'See console output above' : stdout,
        stderr: CONFIG.verbose ? 'See console output above' : stderr
      };
      
      if (code === 0) {
        log(`✅ ${testSuite.name} completed successfully (${duration}ms)`, 'test');
      } else {
        log(`❌ ${testSuite.name} failed with exit code ${code} (${duration}ms)`, 'error');
        if (!CONFIG.verbose && stderr) {
          console.error('STDERR:', stderr);
        }
      }
      
      resolve(result);
    });
    
    child.on('error', (error) => {
      clearTimeout(timeout);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const result = {
        name: testSuite.name,
        file: testSuite.file,
        description: testSuite.description,
        critical: testSuite.critical,
        priority: testSuite.priority,
        startTime,
        endTime,
        duration,
        exitCode: -1,
        success: false,
        error: error.message,
        stdout: CONFIG.verbose ? 'See console output above' : stdout,
        stderr: CONFIG.verbose ? 'See console output above' : stderr
      };
      
      log(`❌ ${testSuite.name} failed to start: ${error.message}`, 'error');
      resolve(result); // Don't reject, let the master runner handle failures
    });
  });
}

async function validateServerConnection() {
  log('Validating server connection before tests...', 'master');
  
  try {
    const response = await fetch(`${SERVER_URL}/api/agents/health`);
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }
    
    const health = await response.json();
    log(`✅ Server connection validated: ${health.status}`, 'master');
    return true;
    
  } catch (error) {
    log(`❌ Server connection failed: ${error.message}`, 'error');
    log(`   Make sure server is running at ${SERVER_URL}`, 'error');
    return false;
  }
}

async function prepareTestEnvironment() {
  log('Preparing test environment...', 'master');
  
  // Check if all test files exist
  const missingFiles = [];
  for (const testSuite of TEST_SUITES) {
    try {
      readFileSync(testSuite.file);
    } catch (error) {
      missingFiles.push(testSuite.file);
    }
  }
  
  if (missingFiles.length > 0) {
    throw new Error(`Missing test files: ${missingFiles.join(', ')}`);
  }
  
  log(`✅ All ${TEST_SUITES.length} test files found`, 'master');
  
  // Validate server connection
  const serverConnected = await validateServerConnection();
  if (!serverConnected) {
    throw new Error('Server connection validation failed');
  }
  
  return true;
}

function generateMasterReport(testResults, overallStartTime, overallEndTime) {
  log('Generating master test report...', 'summary');
  
  const totalDuration = overallEndTime - overallStartTime;
  const totalTests = testResults.length;
  const passedTests = testResults.filter(r => r.success).length;
  const failedTests = testResults.filter(r => !r.success).length;
  const criticalTests = testResults.filter(r => r.critical).length;
  const criticalPassed = testResults.filter(r => r.critical && r.success).length;
  const criticalFailed = testResults.filter(r => r.critical && !r.success).length;
  
  const report = {
    masterTestSuite: 'Comprehensive Metrics Pipeline Validation',
    timestamp: new Date().toISOString(),
    server: SERVER_URL,
    client: CLIENT_URL,
    masterTestSession: MASTER_TEST_SESSION,
    configuration: CONFIG,
    overallStartTime,
    overallEndTime,
    totalDuration,
    testSuites: testResults,
    summary: {
      totalTests,
      passedTests,
      failedTests,
      criticalTests,
      criticalPassed,
      criticalFailed,
      overallSuccess: failedTests === 0,
      criticalSuccess: criticalFailed === 0,
      productionReady: criticalFailed === 0 && passedTests >= (totalTests * 0.8), // At least 80% pass rate
      dashboardReady: testResults.find(r => r.name === 'Metrics Pipeline End-to-End')?.success && 
                      testResults.find(r => r.name === 'Frontend Display Integration')?.success
    }
  };
  
  // Generate detailed console report
  console.log('\n' + '='.repeat(100));
  console.log('                    COMPREHENSIVE METRICS PIPELINE VALIDATION REPORT');
  console.log('='.repeat(100));
  console.log(`Master Test Suite: ${report.masterTestSuite}`);
  console.log(`Timestamp: ${report.timestamp}`);
  console.log(`Server: ${report.server}`);
  console.log(`Client: ${report.client}`);
  console.log(`Master Session: ${report.masterTestSession}`);
  console.log(`Total Duration: ${(totalDuration / 1000).toFixed(1)} seconds`);
  console.log('');
  
  console.log('EXECUTIVE SUMMARY:');
  console.log(`  Total Test Suites: ${totalTests}`);
  console.log(`  Passed: ${passedTests}`);
  console.log(`  Failed: ${failedTests}`);
  console.log(`  Critical Tests: ${criticalTests} (${criticalPassed} passed, ${criticalFailed} failed)`);
  console.log(`  Overall Success: ${report.summary.overallSuccess ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`  Critical Success: ${report.summary.criticalSuccess ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`  Production Ready: ${report.summary.productionReady ? '✅ YES' : '❌ NO'}`);
  console.log(`  Dashboard Ready: ${report.summary.dashboardReady ? '✅ YES' : '❌ NO'}`);
  console.log('');
  
  console.log('TEST SUITE RESULTS:');
  for (const result of testResults) {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    const critical = result.critical ? '[CRITICAL]' : '[STANDARD]';
    const duration = `(${(result.duration / 1000).toFixed(1)}s)`;
    
    console.log(`  ${status} ${critical} ${result.name} ${duration}`);
    console.log(`      ${result.description}`);
    
    if (!result.success) {
      if (result.error) {
        console.log(`      Error: ${result.error}`);
      } else if (result.exitCode !== 0) {
        console.log(`      Exit Code: ${result.exitCode}`);
      }
    }
    
    console.log('');
  }
  
  console.log('METRICS PIPELINE ASSESSMENT:');
  const pipelineTest = testResults.find(r => r.name === 'Metrics Pipeline End-to-End');
  const displayTest = testResults.find(r => r.name === 'Frontend Display Integration');
  const fallbackTest = testResults.find(r => r.name === 'Redis Failure Fallback');
  
  if (pipelineTest?.success && displayTest?.success) {
    console.log('  ✅ Dashboard will show real data (not zeros)');
    console.log('  ✅ Complete event flow is working correctly');
    console.log('  ✅ Frontend integration is functional');
  } else {
    console.log('  ❌ Dashboard may show zeros or fail to load data');
    console.log('  ⚠️  Critical pipeline components are not working');
  }
  
  if (fallbackTest?.success) {
    console.log('  ✅ System handles Redis failures gracefully');
    console.log('  ✅ SQLite fallback is operational');
  } else {
    console.log('  ⚠️  Redis failure handling may have issues');
  }
  
  console.log('');
  console.log('PRODUCTION READINESS CHECKLIST:');
  const checklist = [
    { item: 'Event ingestion pipeline', passed: pipelineTest?.success },
    { item: 'Database storage (SQLite)', passed: pipelineTest?.success },
    { item: 'Redis caching layer', passed: fallbackTest?.success },
    { item: 'API endpoints functionality', passed: displayTest?.success },
    { item: 'Frontend data display', passed: displayTest?.success },
    { item: 'Error handling & recovery', passed: displayTest?.success && fallbackTest?.success },
    { item: 'Health monitoring', passed: testResults.find(r => r.name === 'Health Monitoring System')?.success },
    { item: 'Performance under load', passed: testResults.find(r => r.name === 'Performance and Load Testing')?.success }
  ];
  
  for (const check of checklist) {
    const status = check.passed ? '✅' : '❌';
    console.log(`  ${status} ${check.item}`);
  }
  
  console.log('');
  console.log('NEXT STEPS:');
  if (report.summary.overallSuccess) {
    console.log('  🎉 All tests passed! System is ready for production deployment.');
    console.log('  📊 Dashboard will display real metrics data');
    console.log('  🚀 Proceed with confidence');
  } else if (report.summary.criticalSuccess) {
    console.log('  ⚠️  Critical tests passed, but some standard tests failed');
    console.log('  📊 Dashboard should work, but review failed tests');
    console.log('  🔧 Fix non-critical issues when possible');
  } else {
    console.log('  ❌ Critical tests failed - system is NOT ready for production');
    console.log('  🛠️  Fix critical issues immediately:');
    
    const failedCritical = testResults.filter(r => r.critical && !r.success);
    for (const failed of failedCritical) {
      console.log(`      - ${failed.name}: ${failed.error || 'See test output for details'}`);
    }
  }
  
  console.log('='.repeat(100));
  
  // Save detailed report to file if requested
  if (CONFIG.generateReport) {
    const reportFile = `master-test-report-${Date.now()}.json`;
    try {
      writeFileSync(reportFile, JSON.stringify(report, null, 2));
      log(`📄 Detailed report saved to: ${reportFile}`, 'summary');
    } catch (error) {
      log(`Failed to save report file: ${error.message}`, 'warn');
    }
  }
  
  return report;
}

// Main execution
async function runAllTests() {
  const overallStartTime = Date.now();
  let testResults = [];
  
  try {
    log('Starting Comprehensive Metrics Pipeline Validation', 'master');
    log(`Server: ${SERVER_URL}`, 'info');
    log(`Client: ${CLIENT_URL}`, 'info');
    log(`Master Session: ${MASTER_TEST_SESSION}`, 'info');
    log(`Configuration: ${JSON.stringify(CONFIG, null, 2)}`, 'debug');
    
    // Prepare test environment
    await prepareTestEnvironment();
    
    // Sort test suites by priority
    const sortedTestSuites = [...TEST_SUITES].sort((a, b) => a.priority - b.priority);
    
    // Run each test suite
    for (const testSuite of sortedTestSuites) {
      try {
        let attempts = 0;
        let result = null;
        
        // Retry logic for failed tests
        while (attempts <= CONFIG.retries) {
          attempts++;
          
          if (attempts > 1) {
            log(`Retrying ${testSuite.name} (attempt ${attempts}/${CONFIG.retries + 1})...`, 'warn');
            await sleep(2000); // Brief delay before retry
          }
          
          result = await runTestSuite(testSuite);
          
          if (result.success) {
            break;
          } else if (attempts <= CONFIG.retries) {
            log(`${testSuite.name} failed, will retry...`, 'warn');
          }
        }
        
        testResults.push(result);
        
        // Check if we should continue after failure
        if (!result.success && result.critical && !CONFIG.continueOnFailure) {
          log(`Critical test failed: ${testSuite.name}. Stopping execution.`, 'error');
          break;
        }
        
        // Brief delay between tests
        if (sortedTestSuites.indexOf(testSuite) < sortedTestSuites.length - 1) {
          await sleep(1000);
        }
        
      } catch (error) {
        log(`Failed to run test suite ${testSuite.name}: ${error.message}`, 'error');
        
        testResults.push({
          name: testSuite.name,
          file: testSuite.file,
          description: testSuite.description,
          critical: testSuite.critical,
          priority: testSuite.priority,
          startTime: Date.now(),
          endTime: Date.now(),
          duration: 0,
          exitCode: -1,
          success: false,
          error: error.message
        });
        
        if (testSuite.critical && !CONFIG.continueOnFailure) {
          log('Critical test failed to run. Stopping execution.', 'error');
          break;
        }
      }
    }
    
  } catch (error) {
    log(`Critical error in test runner: ${error.message}`, 'error');
    process.exit(1);
  }
  
  const overallEndTime = Date.now();
  
  // Generate and display master report
  const report = generateMasterReport(testResults, overallStartTime, overallEndTime);
  
  // Determine exit code
  let exitCode = 0;
  
  if (!report.summary.criticalSuccess) {
    exitCode = 1; // Critical tests failed
  } else if (!report.summary.overallSuccess) {
    exitCode = 2; // Non-critical tests failed
  }
  
  log(`Master test runner completed with exit code: ${exitCode}`, 'master');
  process.exit(exitCode);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('Master test runner interrupted by user', 'warn');
  process.exit(130);
});

// Show usage information
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Comprehensive Metrics Pipeline Validation Test Runner');
  console.log('');
  console.log('Usage: node run-all-tests.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --verbose, -v              Enable verbose output');
  console.log('  --continue-on-failure      Continue running tests even if critical tests fail');
  console.log('  --no-report               Skip generating JSON report file');
  console.log('  --no-cleanup               Skip cleanup operations');
  console.log('  --help, -h                 Show this help message');
  console.log('');
  console.log('Environment Variables:');
  console.log('  SERVER_URL                 Server URL (default: http://localhost:3001)');
  console.log('  CLIENT_URL                 Client URL (default: http://localhost:5173)');
  console.log('');
  console.log('Exit Codes:');
  console.log('  0  All tests passed');
  console.log('  1  Critical tests failed');
  console.log('  2  Non-critical tests failed');
  console.log('  130  Interrupted by user');
  console.log('');
  process.exit(0);
}

// Run all tests
runAllTests().catch(error => {
  log(`Unexpected error in master test runner: ${error.message}`, 'error');
  process.exit(1);
});