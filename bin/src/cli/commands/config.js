/**
 * Config Command
 * System configuration management and connectivity testing
 */

import chalk from 'chalk';
import inquirer from 'inquirer';

export class ConfigCommand {
  constructor(cli) {
    this.cli = cli;
  }

  async execute(options = {}) {
    if (options.show) {
      await this.showConfiguration();
      return;
    }

    if (options.test) {
      await this.testConnectivity();
      return;
    }

    if (options.redisTest) {
      await this.testRedisConnectivity();
      return;
    }

    if (options.fallbackStatus) {
      await this.showFallbackStatus();
      return;
    }

    if (options.sync) {
      await this.forceSyncToRedis();
      return;
    }

    // Interactive configuration menu
    await this.showConfigMenu();
  }

  async showConfigMenu() {
    const choices = [
      { name: 'Show current configuration', value: 'show' },
      { name: 'Test system connectivity', value: 'test' },
      { name: 'Test Redis connectivity', value: 'redis-test' },
      { name: 'Show fallback system status', value: 'fallback-status' },
      { name: 'Force sync to Redis', value: 'sync' },
      { name: 'Configure server settings', value: 'configure' },
      { name: 'Exit', value: 'exit' }
    ];

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Configuration options:',
        choices
      }
    ]);

    switch (action) {
      case 'show':
        await this.showConfiguration();
        break;
      case 'test':
        await this.testConnectivity();
        break;
      case 'redis-test':
        await this.testRedisConnectivity();
        break;
      case 'fallback-status':
        await this.showFallbackStatus();
        break;
      case 'sync':
        await this.forceSyncToRedis();
        break;
      case 'configure':
        await this.interactiveConfiguration();
        break;
      case 'exit':
        return;
    }
  }

  async showConfiguration() {
    this.cli.print('');
    this.cli.print(chalk.bold.cyan('⚙️  Configuration'));
    this.cli.print(chalk.gray('═══════════════════'));
    this.cli.print('');

    // CLI Configuration
    this.cli.print(chalk.bold.white('CLI Settings:'));
    this.cli.print(`  Server URL: ${chalk.cyan(this.cli.config.serverUrl)}`);
    this.cli.print(`  Verbose Mode: ${chalk.yellow(this.cli.config.verbose)}`);
    this.cli.print(`  Color Output: ${chalk.yellow(this.cli.config.useColor)}`);
    this.cli.print(`  JSON Output: ${chalk.yellow(this.cli.config.jsonOutput)}`);
    this.cli.print('');

    // Environment Variables
    this.cli.print(chalk.bold.white('Environment Variables:'));
    const envVars = [
      'NODE_ENV',
      'OBS_SERVER_URL',
      'OBS_VERBOSE',
      'OBS_NO_COLOR'
    ];

    envVars.forEach(envVar => {
      const value = process.env[envVar];
      const displayValue = value ? chalk.green(value) : chalk.gray('not set');
      this.cli.print(`  ${envVar}: ${displayValue}`);
    });

    this.cli.print('');

    // System Information
    this.cli.print(chalk.bold.white('System Information:'));
    this.cli.print(`  Platform: ${chalk.cyan(process.platform)}`);
    this.cli.print(`  Node.js: ${chalk.cyan(process.version)}`);
    this.cli.print(`  Architecture: ${chalk.cyan(process.arch)}`);
    this.cli.print(`  Working Directory: ${chalk.cyan(process.cwd())}`);
  }

  async testConnectivity() {
    this.cli.print('');
    this.cli.print(chalk.bold.blue('🔍 Testing System Connectivity'));
    this.cli.print(chalk.gray('══════════════════════════════════'));
    this.cli.print('');

    // Test basic server connectivity
    const spinner = this.cli.createSpinner('Testing server connection...');
    spinner.start();

    try {
      const healthResult = await this.cli.testConnectivity();
      spinner.stop();

      if (healthResult.success) {
        this.cli.printSuccess(`Server is reachable at ${this.cli.config.serverUrl}`);
        
        const health = healthResult.data;
        this.cli.print(`  Status: ${this.formatHealthStatus(health.status)}`);
        this.cli.print(`  Mode: ${chalk.cyan(health.operational_mode || 'unknown')}`);
        this.cli.print(`  Redis: ${this.formatRedisStatus(health.redis_available)}`);
        
      } else {
        this.cli.printError(`Server unreachable: ${healthResult.error}`);
        this.cli.print(`  URL: ${chalk.gray(this.cli.config.serverUrl)}`);
        this.cli.print(`  Status: ${chalk.red(healthResult.status || 'No response')}`);
      }

    } catch (error) {
      spinner.stop();
      this.cli.printError(`Connectivity test failed: ${error.message}`);
    }

    this.cli.print('');

    // Test WebSocket connectivity
    await this.testWebSocketConnectivity();

    this.cli.print('');

    // Test API endpoints
    await this.testApiEndpoints();
  }

  async testWebSocketConnectivity() {
    const spinner = this.cli.createSpinner('Testing WebSocket connection...');
    spinner.start();

    try {
      const ws = await this.cli.connectWebSocket();
      spinner.stop();

      if (ws && this.cli.wsConnected) {
        this.cli.printSuccess('WebSocket connection established');
        this.cli.disconnectWebSocket();
      } else {
        this.cli.printWarning('WebSocket connection failed');
      }

    } catch (error) {
      spinner.stop();
      this.cli.printWarning(`WebSocket test failed: ${error.message}`);
    }
  }

  async testApiEndpoints() {
    this.cli.print(chalk.bold.white('API Endpoint Tests:'));
    
    const endpoints = [
      { path: '/api/fallback/health', name: 'Health Check' },
      { path: '/api/terminal/status', name: 'Terminal Status' },
      { path: '/api/agents/metrics/current', name: 'Agent Metrics' },
      { path: '/api/hooks/coverage', name: 'Hook Coverage' },
      { path: '/events/filter-options', name: 'Event Filters' }
    ];

    for (const endpoint of endpoints) {
      try {
        const result = await this.cli.apiRequest('GET', endpoint.path);
        const status = result.success ? chalk.green('✓') : chalk.red('✗');
        const message = result.success ? 'OK' : result.error;
        
        this.cli.print(`  ${status} ${endpoint.name}: ${chalk.gray(message)}`);
      } catch (error) {
        this.cli.print(`  ${chalk.red('✗')} ${endpoint.name}: ${chalk.red(error.message)}`);
      }
    }
  }

  async testRedisConnectivity() {
    const spinner = this.cli.createSpinner('Testing Redis connectivity...');
    spinner.start();

    try {
      const result = await this.cli.apiRequest('POST', '/api/fallback/test-redis');
      spinner.stop();

      this.cli.print('');
      this.cli.print(chalk.bold.red('🔴 Redis Connectivity Test'));
      this.cli.print(chalk.gray('═══════════════════════════════'));
      this.cli.print('');

      if (result.success) {
        const test = result.data;
        
        // Connection Test
        this.cli.print(chalk.bold.white('Connection Test:'));
        const connStatus = test.connection.connected ? chalk.green('✓ Connected') : chalk.red('✗ Disconnected');
        this.cli.print(`  Status: ${connStatus}`);
        
        if (test.connection.host) {
          this.cli.print(`  Host: ${chalk.cyan(test.connection.host)}`);
          this.cli.print(`  Port: ${chalk.cyan(test.connection.port)}`);
        }
        
        if (test.connection.error) {
          this.cli.print(`  Error: ${chalk.red(test.connection.error)}`);
        }
        
        this.cli.print('');

        // Operations Test
        this.cli.print(chalk.bold.white('Operations Test:'));
        Object.entries(test.operations).forEach(([operation, result]) => {
          const status = result.success ? chalk.green('✓') : chalk.red('✗');
          const timing = result.duration_ms ? chalk.gray(`(${result.duration_ms}ms)`) : '';
          this.cli.print(`  ${status} ${operation} ${timing}`);
          
          if (result.error) {
            this.cli.print(`    ${chalk.red('Error: ' + result.error)}`);
          }
        });

      } else {
        this.cli.printError(`Redis test failed: ${result.error}`);
      }

    } catch (error) {
      spinner.stop();
      this.cli.printError(`Redis connectivity test failed: ${error.message}`);
    }
  }

  async showFallbackStatus() {
    const spinner = this.cli.createSpinner('Fetching fallback system status...');
    spinner.start();

    try {
      const result = await this.cli.apiRequest('GET', '/api/fallback/status');
      spinner.stop();

      this.cli.print('');
      this.cli.print(chalk.bold.yellow('💾 Fallback System Status'));
      this.cli.print(chalk.gray('════════════════════════════════'));
      this.cli.print('');

      if (!result.success) {
        this.cli.printError(`Failed to fetch status: ${result.error}`);
        return;
      }

      const status = result.data;

      // Overall Status
      this.cli.print(chalk.bold.white('System Overview:'));
      const mode = status.overall_status?.mode || 'unknown';
      const modeColor = mode === 'redis' ? 'green' : 'yellow';
      this.cli.print(`  Mode: ${chalk[modeColor](mode)}`);
      this.cli.print(`  Operational: ${chalk.green(status.overall_status?.operational ? 'Yes' : 'No')}`);
      this.cli.print('');

      // Redis Status
      this.cli.print(chalk.bold.white('Redis Status:'));
      const redisConnected = status.redis?.status?.isConnected;
      const redisStatus = redisConnected ? chalk.green('Connected') : chalk.red('Disconnected');
      this.cli.print(`  Connection: ${redisStatus}`);
      
      if (status.redis?.connection_info) {
        const info = status.redis.connection_info;
        this.cli.print(`  Host: ${chalk.cyan(info.host || 'N/A')}`);
        this.cli.print(`  Port: ${chalk.cyan(info.port || 'N/A')}`);
        
        if (info.last_error) {
          this.cli.print(`  Last Error: ${chalk.red(info.last_error)}`);
        }
      }
      this.cli.print('');

      // Fallback Storage
      if (status.fallback_storage) {
        this.cli.print(chalk.bold.white('Fallback Storage:'));
        const enabled = status.fallback_storage.enabled ? chalk.green('Enabled') : chalk.red('Disabled');
        this.cli.print(`  Status: ${enabled}`);
        
        if (status.fallback_storage.stats) {
          const stats = status.fallback_storage.stats;
          this.cli.print(`  Operations: ${chalk.yellow(stats.total_operations || 0)}`);
          this.cli.print(`  Files: ${chalk.yellow(stats.file_count || 0)}`);
          this.cli.print(`  Size: ${chalk.yellow(this.formatBytes(stats.total_size || 0))}`);
        }
        this.cli.print('');
      }

      // Sync Service
      if (status.sync_service) {
        this.cli.print(chalk.bold.white('Sync Service:'));
        const enabled = status.sync_service.enabled ? chalk.green('Enabled') : chalk.red('Disabled');
        const syncing = status.sync_service.is_syncing ? chalk.yellow('In Progress') : chalk.gray('Idle');
        
        this.cli.print(`  Status: ${enabled}`);
        this.cli.print(`  Currently: ${syncing}`);
        
        if (status.sync_service.stats) {
          const stats = status.sync_service.stats;
          this.cli.print(`  Last Sync: ${chalk.cyan(new Date(stats.last_sync_time).toLocaleString())}`);
          this.cli.print(`  Success Rate: ${chalk.green((stats.success_rate * 100).toFixed(1) + '%')}`);
        }
      }

    } catch (error) {
      spinner.stop();
      this.cli.printError(`Failed to fetch fallback status: ${error.message}`);
    }
  }

  async forceSyncToRedis() {
    // Check if Redis is available first
    const healthResult = await this.cli.testConnectivity();
    
    if (!healthResult.success || !healthResult.data?.redis_available) {
      this.cli.printError('Redis is not available. Cannot perform sync.');
      return;
    }

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'This will sync all fallback data to Redis. Continue?',
        default: false
      }
    ]);

    if (!confirm) {
      this.cli.printInfo('Sync cancelled');
      return;
    }

    const spinner = this.cli.createSpinner('Syncing data to Redis...');
    spinner.start();

    try {
      const result = await this.cli.apiRequest('POST', '/api/fallback/sync');
      spinner.stop();

      if (result.success) {
        const sync = result.data;
        
        this.cli.printSuccess('Sync completed successfully!');
        this.cli.print(`  Operations synced: ${chalk.yellow(sync.operations_synced || 0)}`);
        this.cli.print(`  Operations failed: ${chalk.red(sync.operations_failed || 0)}`);
        this.cli.print(`  Duration: ${chalk.cyan((sync.duration_ms || 0) + 'ms')}`);
        
        if (sync.errors && sync.errors.length > 0) {
          this.cli.print('');
          this.cli.printWarning('Some operations failed:');
          sync.errors.slice(0, 5).forEach(error => {
            this.cli.print(`  • ${chalk.red(error)}`);
          });
          
          if (sync.errors.length > 5) {
            this.cli.print(`  • ${chalk.gray(`... and ${sync.errors.length - 5} more`)}`);
          }
        }
        
      } else {
        this.cli.printError(`Sync failed: ${result.error}`);
      }

    } catch (error) {
      spinner.stop();
      this.cli.printError(`Sync operation failed: ${error.message}`);
    }
  }

  async interactiveConfiguration() {
    const { serverUrl, verbose, useColor } = await inquirer.prompt([
      {
        type: 'input',
        name: 'serverUrl',
        message: 'Server URL:',
        default: this.cli.config.serverUrl
      },
      {
        type: 'confirm',
        name: 'verbose',
        message: 'Enable verbose output?',
        default: this.cli.config.verbose
      },
      {
        type: 'confirm',
        name: 'useColor',
        message: 'Enable colored output?',
        default: this.cli.config.useColor
      }
    ]);

    // Update configuration
    this.cli.configure({ serverUrl, verbose, useColor });

    this.cli.printSuccess('Configuration updated!');
    this.cli.print('');
    
    // Show updated configuration
    await this.showConfiguration();
  }

  // Helper methods
  formatHealthStatus(status) {
    switch (status) {
      case 'healthy':
        return chalk.green('Healthy');
      case 'unhealthy':
        return chalk.red('Unhealthy');
      default:
        return chalk.yellow(status || 'Unknown');
    }
  }

  formatRedisStatus(available) {
    if (available === true) {
      return chalk.green('Connected');
    } else if (available === false) {
      return chalk.yellow('Fallback Mode');
    } else {
      return chalk.gray('Unknown');
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}