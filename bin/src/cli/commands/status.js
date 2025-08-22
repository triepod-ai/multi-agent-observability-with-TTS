/**
 * Status Command
 * Shows real-time agent and system status with optional watch mode
 */

import chalk from 'chalk';
import ora from 'ora';

export class StatusCommand {
  constructor(cli) {
    this.cli = cli;
    this.watchMode = false;
    this.watchInterval = null;
  }

  async execute(options = {}) {
    if (options.watch) {
      await this.startWatchMode(options);
    } else {
      await this.showStatus(options);
    }
  }

  async showStatus(options = {}) {
    const spinner = this.cli.createSpinner('Fetching system status...');
    spinner.start();

    try {
      // Fetch multiple data sources in parallel
      const [
        terminalStatus,
        agentMetrics,
        systemHealth,
        hookCoverage
      ] = await Promise.all([
        this.fetchTerminalStatus(),
        this.fetchAgentMetrics(),
        this.fetchSystemHealth(),
        this.fetchHookCoverage()
      ]);

      spinner.stop();

      if (options.compact) {
        this.displayCompactStatus({
          terminal: terminalStatus,
          agents: agentMetrics,
          health: systemHealth,
          hooks: hookCoverage
        });
      } else {
        this.displayFullStatus({
          terminal: terminalStatus,
          agents: agentMetrics,
          health: systemHealth,
          hooks: hookCoverage
        });
      }

    } catch (error) {
      spinner.stop();
      this.cli.printError(`Failed to fetch status: ${error.message}`);
      
      // Try fallback mode
      await this.showFallbackStatus();
    }
  }

  async startWatchMode(options) {
    this.watchMode = true;
    const refreshInterval = parseInt(options.refresh) || 2000;
    
    this.cli.printInfo(`Starting watch mode (refresh every ${refreshInterval}ms). Press Ctrl+C to exit.`);
    
    // Clear screen and show initial status
    process.stdout.write('\x1B[2J\x1B[0f');
    await this.showStatus(options);
    
    this.watchInterval = setInterval(async () => {
      // Clear screen and redraw
      process.stdout.write('\x1B[2J\x1B[0f');
      await this.showStatus(options);
    }, refreshInterval);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.stopWatchMode();
      process.exit(0);
    });
  }

  stopWatchMode() {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = null;
    }
    this.watchMode = false;
  }

  async fetchTerminalStatus() {
    const result = await this.cli.apiRequest('GET', '/api/terminal/status');
    return result.success ? result.data : null;
  }

  async fetchAgentMetrics() {
    const result = await this.cli.apiRequest('GET', '/api/agents/metrics/current');
    return result.success ? result.data : null;
  }

  async fetchSystemHealth() {
    const result = await this.cli.apiRequest('GET', '/api/fallback/health');
    return result.success ? result.data : null;
  }

  async fetchHookCoverage() {
    const result = await this.cli.apiRequest('GET', '/api/hooks/coverage');
    return result.success ? result.data : null;
  }

  displayFullStatus(data) {
    const timestamp = new Date().toISOString();
    
    // Header
    this.cli.print(chalk.bold.cyan('═══════════════════════════════════════════════════'));
    this.cli.print(chalk.bold.cyan('    Multi-Agent Observability System Status'));
    this.cli.print(chalk.bold.cyan('═══════════════════════════════════════════════════'));
    this.cli.print(chalk.gray(`Last updated: ${timestamp}`));
    this.cli.print('');

    // System Health Section
    this.displaySystemHealth(data.health);
    this.cli.print('');

    // Active Agents Section
    this.displayActiveAgents(data.terminal, data.agents);
    this.cli.print('');

    // Agent Metrics Section
    this.displayAgentMetrics(data.agents);
    this.cli.print('');

    // Hook Coverage Section
    this.displayHookCoverage(data.hooks);
    
    if (this.watchMode) {
      this.cli.print('');
      this.cli.print(chalk.gray('Press Ctrl+C to exit watch mode'));
    }
  }

  displayCompactStatus(data) {
    const health = data.health?.status || 'unknown';
    const healthColor = health === 'healthy' ? 'green' : 'red';
    
    const activeAgents = data.terminal?.active_agents?.length || 0;
    const totalAgents = data.agents?.total_agents || 0;
    
    const activeHooks = data.hooks?.totalActiveHooks || 0;
    const totalHooks = data.hooks?.hooks?.length || 0;

    this.cli.print(
      `${chalk[healthColor]('●')} System: ${chalk[healthColor](health)} | ` +
      `${chalk.cyan('⚡')} Agents: ${chalk.yellow(activeAgents)}/${chalk.gray(totalAgents)} | ` +
      `${chalk.blue('🔗')} Hooks: ${chalk.yellow(activeHooks)}/${chalk.gray(totalHooks)} | ` +
      `${chalk.gray(new Date().toLocaleTimeString())}`
    );
  }

  displaySystemHealth(health) {
    this.cli.print(chalk.bold.blue('🏥 System Health'));
    this.cli.print(chalk.gray('────────────────'));
    
    if (!health) {
      this.cli.print(chalk.red('✗ Unable to fetch system health'));
      return;
    }

    const status = health.status || 'unknown';
    const statusColor = status === 'healthy' ? 'green' : 'red';
    const statusIcon = status === 'healthy' ? '✓' : '✗';
    
    this.cli.print(`${chalk[statusColor](statusIcon)} Status: ${chalk[statusColor](status)}`);
    
    if (health.redis_available !== undefined) {
      const redisIcon = health.redis_available ? '✓' : '✗';
      const redisColor = health.redis_available ? 'green' : 'yellow';
      this.cli.print(`${chalk[redisColor](redisIcon)} Redis: ${chalk[redisColor](health.redis_available ? 'Connected' : 'Fallback Mode')}`);
    }
    
    if (health.operational_mode) {
      this.cli.print(`${chalk.cyan('⚙')} Mode: ${chalk.white(health.operational_mode)}`);
    }
  }

  displayActiveAgents(terminalData, agentData) {
    this.cli.print(chalk.bold.green('⚡ Active Agents'));
    this.cli.print(chalk.gray('─────────────────'));
    
    if (!terminalData?.active_agents || terminalData.active_agents.length === 0) {
      this.cli.print(chalk.gray('No active agents'));
      return;
    }

    terminalData.active_agents.slice(0, 10).forEach(agent => {
      const duration = agent.duration_ms ? `${Math.round(agent.duration_ms / 1000)}s` : 'just started';
      const statusColor = this.getAgentStatusColor(agent.status);
      
      this.cli.print(
        `${chalk[statusColor]('●')} ${chalk.white(agent.agent_name)} ` +
        `${chalk.gray(`[${agent.agent_type}]`)} ` +
        `${chalk.yellow(duration)} ` +
        `${chalk.gray(`- ${agent.session_id.substring(0, 8)}...`)}`
      );
    });

    if (terminalData.active_agents.length > 10) {
      this.cli.print(chalk.gray(`... and ${terminalData.active_agents.length - 10} more`));
    }
  }

  displayAgentMetrics(metrics) {
    this.cli.print(chalk.bold.yellow('📊 Agent Metrics'));
    this.cli.print(chalk.gray('──────────────────'));
    
    if (!metrics) {
      this.cli.print(chalk.gray('No metrics available'));
      return;
    }

    if (metrics.total_agents !== undefined) {
      this.cli.print(`Total Agents: ${chalk.yellow(metrics.total_agents)}`);
    }
    
    if (metrics.active_agents !== undefined) {
      this.cli.print(`Active: ${chalk.green(metrics.active_agents)}`);
    }
    
    if (metrics.completed_agents !== undefined) {
      this.cli.print(`Completed: ${chalk.blue(metrics.completed_agents)}`);
    }
    
    if (metrics.success_rate !== undefined) {
      const rate = Math.round(metrics.success_rate * 100);
      const rateColor = rate > 90 ? 'green' : rate > 70 ? 'yellow' : 'red';
      this.cli.print(`Success Rate: ${chalk[rateColor](rate + '%')}`);
    }
    
    if (metrics.average_duration !== undefined) {
      this.cli.print(`Avg Duration: ${chalk.cyan(Math.round(metrics.average_duration / 1000) + 's')}`);
    }
  }

  displayHookCoverage(hookData) {
    this.cli.print(chalk.bold.magenta('🔗 Hook Coverage'));
    this.cli.print(chalk.gray('─────────────────'));
    
    if (!hookData) {
      this.cli.print(chalk.gray('No hook data available'));
      return;
    }

    const summary = [
      `Active: ${chalk.green(hookData.totalActiveHooks || 0)}`,
      `Inactive: ${chalk.yellow(hookData.totalInactiveHooks || 0)}`,
      `Errors: ${chalk.red(hookData.totalErrorHooks || 0)}`
    ].join(' | ');

    this.cli.print(summary);
    
    if (hookData.overallSuccessRate !== undefined) {
      const rate = Math.round(hookData.overallSuccessRate * 100);
      const rateColor = rate > 90 ? 'green' : rate > 70 ? 'yellow' : 'red';
      this.cli.print(`Success Rate: ${chalk[rateColor](rate + '%')}`);
    }

    // Show top 5 most active hooks
    if (hookData.hooks && hookData.hooks.length > 0) {
      const activeHooks = hookData.hooks
        .filter(hook => hook.status === 'active')
        .sort((a, b) => (b.executionCount || 0) - (a.executionCount || 0))
        .slice(0, 5);

      if (activeHooks.length > 0) {
        this.cli.print(chalk.gray('Most Active:'));
        activeHooks.forEach(hook => {
          this.cli.print(`  ${chalk.cyan('•')} ${hook.displayName}: ${chalk.yellow(hook.executionCount || 0)} executions`);
        });
      }
    }
  }

  async showFallbackStatus() {
    this.cli.printWarning('Server unavailable - showing fallback status');
    
    // Try to show basic local information
    this.cli.print('');
    this.cli.print(chalk.bold.red('⚠ Offline Mode'));
    this.cli.print(chalk.gray('─────────────────'));
    this.cli.print(`${chalk.red('✗')} Server: Not reachable`);
    this.cli.print(`${chalk.yellow('⚠')} Mode: Local fallback`);
    this.cli.print(`${chalk.gray('ℹ')} Check server status with: obs config --test`);
  }

  getAgentStatusColor(status) {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'running':
        return 'green';
      case 'completing':
      case 'pending':
        return 'yellow';
      case 'complete':
      case 'success':
        return 'blue';
      case 'failed':
      case 'error':
        return 'red';
      default:
        return 'white';
    }
  }
}