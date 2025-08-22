/**
 * Handoffs Command
 * Manage session handoffs for project continuity
 */

import chalk from 'chalk';
import inquirer from 'inquirer';

export class HandoffsCommand {
  constructor(cli) {
    this.cli = cli;
  }

  async execute(options = {}) {
    if (options.get && options.project) {
      await this.getHandoff(options.project);
      return;
    }

    if (options.save && options.project) {
      await this.saveHandoff(options.project, options.save);
      return;
    }

    if (options.list) {
      await this.listHandoffs();
      return;
    }

    // Interactive handoff management
    await this.showHandoffMenu();
  }

  async showHandoffMenu() {
    const choices = [
      { name: 'Get handoff for project', value: 'get' },
      { name: 'Save handoff content', value: 'save' },
      { name: 'List recent handoffs', value: 'list' },
      { name: 'Project handoff status', value: 'status' },
      { name: 'Exit', value: 'exit' }
    ];

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Handoff management:',
        choices
      }
    ]);

    switch (action) {
      case 'get':
        await this.interactiveGet();
        break;
      case 'save':
        await this.interactiveSave();
        break;
      case 'list':
        await this.listHandoffs();
        break;
      case 'status':
        await this.showHandoffStatus();
        break;
      case 'exit':
        return;
    }
  }

  async getHandoff(projectName) {
    const spinner = this.cli.createSpinner(`Fetching handoff for ${projectName}...`);
    spinner.start();

    try {
      const result = await this.cli.apiRequest('GET', `/api/fallback/handoffs/${encodeURIComponent(projectName)}`);
      spinner.stop();

      this.cli.print('');
      this.cli.print(chalk.bold.blue(`📋 Session Handoff: ${projectName}`));
      this.cli.print(chalk.gray('═'.repeat(30 + projectName.length)));
      this.cli.print('');

      if (!result.success) {
        this.cli.printError(`Failed to fetch handoff: ${result.error}`);
        return;
      }

      const handoff = result.data;

      if (!handoff.has_content) {
        this.cli.printWarning(`No handoff content available for project: ${projectName}`);
        return;
      }

      this.cli.print(chalk.bold.white('Handoff Content:'));
      this.cli.print(chalk.gray('─'.repeat(16)));
      this.cli.print('');

      // Display handoff content with formatting
      if (handoff.handoff_content) {
        const lines = handoff.handoff_content.split('\n');
        lines.forEach(line => {
          if (line.startsWith('#')) {
            this.cli.print(chalk.bold.cyan(line));
          } else if (line.startsWith('- ') || line.startsWith('* ')) {
            this.cli.print(chalk.yellow(line));
          } else if (line.trim() === '') {
            this.cli.print('');
          } else {
            this.cli.print(line);
          }
        });
      }

      this.cli.print('');
      this.cli.print(chalk.gray(`Retrieved: ${new Date(handoff.timestamp).toLocaleString()}`));

    } catch (error) {
      spinner.stop();
      this.cli.printError(`Failed to get handoff: ${error.message}`);
    }
  }

  async saveHandoff(projectName, content) {
    const spinner = this.cli.createSpinner(`Saving handoff for ${projectName}...`);
    spinner.start();

    try {
      const handoffData = {
        handoff_content: content,
        session_id: `cli_${Date.now()}`,
        metadata: {
          source: 'cli',
          created_at: new Date().toISOString(),
          project_name: projectName
        }
      };

      const result = await this.cli.apiRequest('POST', `/api/fallback/handoffs/${encodeURIComponent(projectName)}`, handoffData);
      spinner.stop();

      if (result.success) {
        this.cli.printSuccess(`Handoff saved for project: ${projectName}`);
        this.cli.print(`  Content length: ${chalk.yellow(content.length)} characters`);
        this.cli.print(`  Timestamp: ${chalk.cyan(new Date().toLocaleString())}`);
      } else {
        this.cli.printError(`Failed to save handoff: ${result.error}`);
      }

    } catch (error) {
      spinner.stop();
      this.cli.printError(`Failed to save handoff: ${error.message}`);
    }
  }

  async listHandoffs() {
    const spinner = this.cli.createSpinner('Fetching recent handoffs...');
    spinner.start();

    try {
      // Get fallback status which includes handoff information
      const result = await this.cli.apiRequest('GET', '/api/fallback/status');
      spinner.stop();

      this.cli.print('');
      this.cli.print(chalk.bold.green('📄 Recent Handoffs'));
      this.cli.print(chalk.gray('═══════════════════'));
      this.cli.print('');

      if (!result.success) {
        this.cli.printError(`Failed to fetch handoffs: ${result.error}`);
        return;
      }

      const status = result.data;
      
      if (!status.fallback_storage?.stats?.file_count) {
        this.cli.printInfo('No handoffs found');
        return;
      }

      // Display storage statistics
      const stats = status.fallback_storage.stats;
      this.cli.print(chalk.bold.white('Storage Overview:'));
      this.cli.print(`  Total Files: ${chalk.cyan(stats.file_count || 0)}`);
      this.cli.print(`  Total Size: ${chalk.yellow(this.formatBytes(stats.total_size || 0))}`);
      this.cli.print(`  Operations: ${chalk.magenta(stats.total_operations || 0)}`);
      this.cli.print('');

      // Show handoff availability notice
      this.cli.print(chalk.bold.white('Available Handoffs:'));
      this.cli.print(chalk.gray('Use "obs handoffs --get --project <name>" to retrieve specific handoffs'));
      this.cli.print(chalk.gray('Use "obs handoffs status" to see detailed project status'));

    } catch (error) {
      spinner.stop();
      this.cli.printError(`Failed to list handoffs: ${error.message}`);
    }
  }

  async showHandoffStatus() {
    const spinner = this.cli.createSpinner('Checking handoff system status...');
    spinner.start();

    try {
      const result = await this.cli.apiRequest('GET', '/api/fallback/status');
      spinner.stop();

      this.cli.print('');
      this.cli.print(chalk.bold.yellow('📊 Handoff System Status'));
      this.cli.print(chalk.gray('═══════════════════════════'));
      this.cli.print('');

      if (!result.success) {
        this.cli.printError(`Failed to get status: ${result.error}`);
        return;
      }

      const status = result.data;

      // System Mode
      this.cli.print(chalk.bold.white('System Mode:'));
      const mode = status.overall_status?.mode || 'unknown';
      const modeColor = mode === 'redis' ? 'green' : 'yellow';
      this.cli.print(`  Current Mode: ${chalk[modeColor](mode)}`);
      this.cli.print(`  Operational: ${chalk.green(status.overall_status?.operational ? 'Yes' : 'No')}`);
      this.cli.print('');

      // Redis Status
      this.cli.print(chalk.bold.white('Redis Status:'));
      const redisConnected = status.redis?.status?.isConnected;
      const redisStatus = redisConnected ? chalk.green('Connected') : chalk.red('Disconnected');
      this.cli.print(`  Connection: ${redisStatus}`);
      
      if (status.redis?.connection_info?.last_error) {
        this.cli.print(`  Last Error: ${chalk.red(status.redis.connection_info.last_error)}`);
      }
      this.cli.print('');

      // Fallback Storage
      if (status.fallback_storage) {
        this.cli.print(chalk.bold.white('Fallback Storage:'));
        const enabled = status.fallback_storage.enabled ? chalk.green('Enabled') : chalk.red('Disabled');
        this.cli.print(`  Status: ${enabled}`);
        
        if (status.fallback_storage.stats) {
          const stats = status.fallback_storage.stats;
          this.cli.print(`  Files: ${chalk.cyan(stats.file_count || 0)}`);
          this.cli.print(`  Size: ${chalk.yellow(this.formatBytes(stats.total_size || 0))}`);
          this.cli.print(`  Operations: ${chalk.magenta(stats.total_operations || 0)}`);
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
          this.cli.print(`  Last Sync: ${chalk.blue(new Date(stats.last_sync_time).toLocaleString())}`);
          this.cli.print(`  Success Rate: ${chalk.green((stats.success_rate * 100).toFixed(1) + '%')}`);
        }
      }

      // Recommendations
      this.cli.print('');
      this.cli.print(chalk.bold.white('Recommendations:'));
      
      if (!redisConnected && status.fallback_storage?.enabled) {
        this.cli.print(`  ${chalk.yellow('•')} Redis disconnected - using fallback storage`);
        this.cli.print(`  ${chalk.gray('  Consider checking Redis connectivity with:')} ${chalk.cyan('obs config --redis-test')}`);
      }
      
      if (redisConnected && status.sync_service?.enabled) {
        this.cli.print(`  ${chalk.green('•')} System operating optimally with Redis`);
        this.cli.print(`  ${chalk.gray('  Handoffs are being stored in Redis for fast access')}`);
      }

    } catch (error) {
      spinner.stop();
      this.cli.printError(`Failed to get status: ${error.message}`);
    }
  }

  // Interactive helpers
  async interactiveGet() {
    const { projectName } = await inquirer.prompt([
      {
        type: 'input',
        name: 'projectName',
        message: 'Project name:',
        validate: input => input.length > 0 || 'Project name is required'
      }
    ]);

    await this.getHandoff(projectName);
  }

  async interactiveSave() {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'projectName',
        message: 'Project name:',
        validate: input => input.length > 0 || 'Project name is required'
      },
      {
        type: 'list',
        name: 'source',
        message: 'How would you like to provide the content?',
        choices: [
          { name: 'Type content manually', value: 'manual' },
          { name: 'Load from file', value: 'file' }
        ]
      }
    ]);

    let content;

    if (answers.source === 'file') {
      const { filePath } = await inquirer.prompt([
        {
          type: 'input',
          name: 'filePath',
          message: 'Path to content file:',
          validate: input => input.length > 0 || 'File path is required'
        }
      ]);

      try {
        const fs = await import('fs/promises');
        content = await fs.readFile(filePath, 'utf8');
        this.cli.printSuccess(`Loaded ${content.length} characters from ${filePath}`);
      } catch (error) {
        this.cli.printError(`Failed to read file: ${error.message}`);
        return;
      }

    } else {
      const { manualContent } = await inquirer.prompt([
        {
          type: 'editor',
          name: 'manualContent',
          message: 'Enter handoff content (this will open your default editor):',
          validate: input => input.length > 0 || 'Content is required'
        }
      ]);

      content = manualContent;
    }

    await this.saveHandoff(answers.projectName, content);
  }

  // Helper methods
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}