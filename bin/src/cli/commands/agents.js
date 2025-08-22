/**
 * Agents Command
 * Manage agent executions and view metrics
 */

import chalk from 'chalk';
import inquirer from 'inquirer';

export class AgentsCommand {
  constructor(cli) {
    this.cli = cli;
  }

  async execute(options = {}) {
    // Handle specific options
    if (options.active) {
      await this.showActiveAgents();
      return;
    }

    if (options.metrics) {
      await this.showAgentMetrics();
      return;
    }

    if (options.timeline) {
      const hours = options.timeline === true ? 24 : parseInt(options.timeline);
      await this.showAgentTimeline(hours);
      return;
    }

    if (options.distribution) {
      await this.showAgentDistribution();
      return;
    }

    if (options.performance) {
      await this.showAgentPerformance(options.performance);
      return;
    }

    if (options.tools) {
      await this.showToolUsage();
      return;
    }

    if (options.export) {
      await this.exportAgents(options);
      return;
    }

    // Default: show agent overview with interactive menu
    await this.showAgentOverview();
  }

  async showAgentOverview() {
    const spinner = this.cli.createSpinner('Loading agent overview...');
    spinner.start();

    try {
      const [terminalStatus, metrics, colors] = await Promise.all([
        this.fetchTerminalStatus(),
        this.fetchAgentMetrics(),
        this.fetchAgentColors()
      ]);

      spinner.stop();

      this.cli.print(chalk.bold.cyan('═══════════════════════════════════════'));
      this.cli.print(chalk.bold.cyan('           Agent Overview'));
      this.cli.print(chalk.bold.cyan('═══════════════════════════════════════'));
      this.cli.print('');

      // Show overall metrics
      this.displayAgentSummary(metrics);
      this.cli.print('');

      // Show active agents
      await this.displayActiveAgents(terminalStatus, colors);
      this.cli.print('');

      // Show interactive menu
      await this.showAgentMenu();

    } catch (error) {
      spinner.stop();
      this.cli.printError(`Failed to load agent overview: ${error.message}`);
    }
  }

  async showAgentMenu() {
    const choices = [
      { name: 'Show current metrics', value: 'metrics' },
      { name: 'View agent timeline', value: 'timeline' },
      { name: 'Agent type distribution', value: 'distribution' },
      { name: 'Tool usage analytics', value: 'tools' },
      { name: 'Agent performance analysis', value: 'performance' },
      { name: 'Export agent data', value: 'export' },
      { name: 'Refresh overview', value: 'refresh' },
      { name: 'Exit', value: 'exit' }
    ];

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices
      }
    ]);

    switch (action) {
      case 'metrics':
        await this.showAgentMetrics();
        break;
      case 'timeline':
        await this.selectTimelineHours();
        break;
      case 'distribution':
        await this.showAgentDistribution();
        break;
      case 'tools':
        await this.showToolUsage();
        break;
      case 'performance':
        await this.selectAgentForPerformance();
        break;
      case 'export':
        await this.interactiveExport();
        break;
      case 'refresh':
        await this.showAgentOverview();
        break;
      case 'exit':
        return;
    }
  }

  displayAgentSummary(metrics) {
    this.cli.print(chalk.bold.white('📊 Current Metrics'));
    this.cli.print(chalk.gray('──────────────────'));

    if (!metrics) {
      this.cli.printWarning('No metrics available');
      return;
    }

    const items = [
      { label: 'Total Agents', value: metrics.total_agents, color: 'cyan' },
      { label: 'Active', value: metrics.active_agents, color: 'green' },
      { label: 'Completed', value: metrics.completed_agents, color: 'blue' },
      { label: 'Success Rate', value: `${Math.round((metrics.success_rate || 0) * 100)}%`, color: 'yellow' },
      { label: 'Avg Duration', value: `${Math.round((metrics.average_duration || 0) / 1000)}s`, color: 'magenta' }
    ];

    const line = items.map(item => 
      `${chalk.gray(item.label)}: ${chalk[item.color](item.value)}`
    ).join(' | ');

    this.cli.print(line);
  }

  async displayActiveAgents(terminalStatus, colors) {
    this.cli.print(chalk.bold.green('⚡ Active Agents'));
    this.cli.print(chalk.gray('─────────────────'));

    if (!terminalStatus?.active_agents || terminalStatus.active_agents.length === 0) {
      this.cli.printInfo('No active agents');
      return;
    }

    const tableData = terminalStatus.active_agents.map(agent => {
      const duration = agent.duration_ms ? `${Math.round(agent.duration_ms / 1000)}s` : '0s';
      const agentColor = colors[agent.agent_type] || 'white';
      
      return {
        'Agent Name': agent.agent_name,
        'Type': agent.agent_type,
        'Status': this.formatStatus(agent.status),
        'Duration': duration,
        'Task': (agent.task_description || '').substring(0, 40) + '...',
        'Session': agent.session_id.substring(0, 8) + '...'
      };
    });

    this.cli.print(this.cli.formatOutput(tableData, 'table'));
  }

  async showActiveAgents() {
    const spinner = this.cli.createSpinner('Fetching active agents...');
    spinner.start();

    try {
      const [terminalStatus, colors] = await Promise.all([
        this.fetchTerminalStatus(),
        this.fetchAgentColors()
      ]);

      spinner.stop();

      this.cli.print('');
      this.cli.print(chalk.bold.green('⚡ Active Agents (Detailed View)'));
      this.cli.print(chalk.gray('══════════════════════════════════════'));
      this.cli.print('');

      if (!terminalStatus?.active_agents || terminalStatus.active_agents.length === 0) {
        this.cli.printInfo('No active agents found');
        return;
      }

      terminalStatus.active_agents.forEach((agent, index) => {
        this.displayDetailedAgent(agent, colors, index + 1);
      });

    } catch (error) {
      spinner.stop();
      this.cli.printError(`Failed to fetch active agents: ${error.message}`);
    }
  }

  displayDetailedAgent(agent, colors, index) {
    const agentColor = colors[agent.agent_type] || 'white';
    const statusColor = this.getStatusColor(agent.status);
    const duration = agent.duration_ms ? `${Math.round(agent.duration_ms / 1000)}s` : '0s';

    this.cli.print(chalk.bold.white(`[${index}] ${agent.agent_name}`));
    this.cli.print(`  ${chalk.gray('Type:')} ${chalk[agentColor](agent.agent_type)}`);
    this.cli.print(`  ${chalk.gray('Status:')} ${chalk[statusColor](agent.status)}`);
    this.cli.print(`  ${chalk.gray('Duration:')} ${chalk.yellow(duration)}`);
    this.cli.print(`  ${chalk.gray('Session:')} ${chalk.cyan(agent.session_id)}`);
    this.cli.print(`  ${chalk.gray('Source:')} ${chalk.magenta(agent.source_app)}`);
    
    if (agent.task_description) {
      this.cli.print(`  ${chalk.gray('Task:')} ${agent.task_description}`);
    }
    
    this.cli.print('');
  }

  async showAgentMetrics() {
    const spinner = this.cli.createSpinner('Calculating agent metrics...');
    spinner.start();

    try {
      const metrics = await this.fetchAgentMetrics();
      spinner.stop();

      this.cli.print('');
      this.cli.print(chalk.bold.yellow('📊 Agent Metrics (Detailed)'));
      this.cli.print(chalk.gray('═══════════════════════════════════'));
      this.cli.print('');

      if (!metrics) {
        this.cli.printWarning('No metrics available');
        return;
      }

      // Performance Metrics
      this.cli.print(chalk.bold.white('Performance Overview:'));
      this.cli.print(`  Total Agents Executed: ${chalk.cyan(metrics.total_agents || 0)}`);
      this.cli.print(`  Currently Active: ${chalk.green(metrics.active_agents || 0)}`);
      this.cli.print(`  Successfully Completed: ${chalk.blue(metrics.completed_agents || 0)}`);
      this.cli.print(`  Failed Executions: ${chalk.red(metrics.failed_agents || 0)}`);
      this.cli.print('');

      // Success Rate Analysis
      const successRate = (metrics.success_rate || 0) * 100;
      const rateColor = successRate > 90 ? 'green' : successRate > 70 ? 'yellow' : 'red';
      this.cli.print(chalk.bold.white('Quality Metrics:'));
      this.cli.print(`  Success Rate: ${chalk[rateColor](successRate.toFixed(1) + '%')}`);
      
      if (metrics.average_duration) {
        this.cli.print(`  Average Duration: ${chalk.cyan((metrics.average_duration / 1000).toFixed(1) + 's')}`);
      }
      
      if (metrics.median_duration) {
        this.cli.print(`  Median Duration: ${chalk.cyan((metrics.median_duration / 1000).toFixed(1) + 's')}`);
      }
      
      this.cli.print('');

      // Token Usage
      if (metrics.total_tokens) {
        this.cli.print(chalk.bold.white('Token Usage:'));
        this.cli.print(`  Total Tokens: ${chalk.yellow(this.formatNumber(metrics.total_tokens))}`);
        this.cli.print(`  Average per Agent: ${chalk.yellow(this.formatNumber(metrics.average_tokens || 0))}`);
        
        if (metrics.estimated_cost) {
          this.cli.print(`  Estimated Cost: ${chalk.green('$' + (metrics.estimated_cost / 100).toFixed(2))}`);
        }
      }

    } catch (error) {
      spinner.stop();
      this.cli.printError(`Failed to fetch agent metrics: ${error.message}`);
    }
  }

  async showAgentTimeline(hours = 24) {
    const spinner = this.cli.createSpinner(`Loading ${hours}h agent timeline...`);
    spinner.start();

    try {
      const result = await this.cli.apiRequest('GET', `/api/agents/metrics/timeline?hours=${hours}`);
      spinner.stop();

      if (!result.success) {
        this.cli.printError(`Failed to fetch timeline: ${result.error}`);
        return;
      }

      const timeline = result.data;

      this.cli.print('');
      this.cli.print(chalk.bold.blue(`📈 Agent Timeline (Last ${hours} hours)`));
      this.cli.print(chalk.gray('════════════════════════════════════════'));
      this.cli.print('');

      if (!timeline?.timeline || timeline.timeline.length === 0) {
        this.cli.printInfo('No timeline data available');
        return;
      }

      // Simple timeline visualization
      timeline.timeline.forEach(point => {
        const time = new Date(point.timestamp).toLocaleTimeString();
        const agentCount = point.agent_count || 0;
        const bar = '█'.repeat(Math.min(agentCount, 50));
        
        this.cli.print(
          `${chalk.gray(time)} ${chalk.cyan(bar)} ${chalk.yellow(agentCount)}`
        );
      });

      this.cli.print('');
      this.cli.print(chalk.gray('Peak Activity: ') + chalk.yellow(timeline.peak_agents || 0) + chalk.gray(' agents'));
      this.cli.print(chalk.gray('Total Executions: ') + chalk.yellow(timeline.total_executions || 0));

    } catch (error) {
      spinner.stop();
      this.cli.printError(`Failed to show timeline: ${error.message}`);
    }
  }

  async showAgentDistribution() {
    const spinner = this.cli.createSpinner('Analyzing agent type distribution...');
    spinner.start();

    try {
      const [distribution, colors] = await Promise.all([
        this.cli.apiRequest('GET', '/api/agents/types/distribution'),
        this.fetchAgentColors()
      ]);

      spinner.stop();

      if (!distribution.success) {
        this.cli.printError(`Failed to fetch distribution: ${distribution.error}`);
        return;
      }

      this.cli.print('');
      this.cli.print(chalk.bold.magenta('📋 Agent Type Distribution'));
      this.cli.print(chalk.gray('═══════════════════════════════════'));
      this.cli.print('');

      const data = distribution.data;
      if (!data?.distribution || Object.keys(data.distribution).length === 0) {
        this.cli.printInfo('No distribution data available');
        return;
      }

      // Sort by count descending
      const sorted = Object.entries(data.distribution)
        .sort(([,a], [,b]) => b - a);

      const total = sorted.reduce((sum, [, count]) => sum + count, 0);

      sorted.forEach(([type, count]) => {
        const percentage = ((count / total) * 100).toFixed(1);
        const agentColor = colors[type] || 'white';
        const bar = '█'.repeat(Math.ceil(count / total * 30));
        
        this.cli.print(
          `${chalk[agentColor](type.padEnd(15))} ${chalk.gray(bar)} ` +
          `${chalk.yellow(count.toString().padStart(4))} ${chalk.gray(`(${percentage}%)`)}`
        );
      });

      this.cli.print('');
      this.cli.print(chalk.gray(`Total agent types: ${sorted.length}`));
      this.cli.print(chalk.gray(`Total executions: ${total}`));

    } catch (error) {
      spinner.stop();
      this.cli.printError(`Failed to show distribution: ${error.message}`);
    }
  }

  async showAgentPerformance(agentName) {
    const spinner = this.cli.createSpinner(`Analyzing performance for ${agentName}...`);
    spinner.start();

    try {
      const result = await this.cli.apiRequest('GET', `/api/agents/performance/${encodeURIComponent(agentName)}`);
      spinner.stop();

      if (!result.success) {
        this.cli.printError(`Failed to fetch performance data: ${result.error}`);
        return;
      }

      const performance = result.data;

      this.cli.print('');
      this.cli.print(chalk.bold.green(`🚀 Performance Analysis: ${agentName}`));
      this.cli.print(chalk.gray('══════════════════════════════════════════════'));
      this.cli.print('');

      if (!performance || Object.keys(performance).length === 0) {
        this.cli.printInfo(`No performance data available for ${agentName}`);
        return;
      }

      // Execution Statistics
      this.cli.print(chalk.bold.white('Execution Statistics:'));
      this.cli.print(`  Total Runs: ${chalk.cyan(performance.total_runs || 0)}`);
      this.cli.print(`  Successful: ${chalk.green(performance.successful_runs || 0)}`);
      this.cli.print(`  Failed: ${chalk.red(performance.failed_runs || 0)}`);
      this.cli.print(`  Success Rate: ${chalk.yellow((performance.success_rate * 100).toFixed(1) + '%')}`);
      this.cli.print('');

      // Performance Metrics
      if (performance.performance_metrics) {
        const metrics = performance.performance_metrics;
        this.cli.print(chalk.bold.white('Performance Metrics:'));
        this.cli.print(`  Average Duration: ${chalk.cyan((metrics.avg_duration / 1000).toFixed(1) + 's')}`);
        this.cli.print(`  Minimum Duration: ${chalk.green((metrics.min_duration / 1000).toFixed(1) + 's')}`);
        this.cli.print(`  Maximum Duration: ${chalk.red((metrics.max_duration / 1000).toFixed(1) + 's')}`);
        this.cli.print('');
      }

      // Recent Executions
      if (performance.recent_executions) {
        this.cli.print(chalk.bold.white('Recent Executions:'));
        performance.recent_executions.slice(0, 5).forEach((execution, index) => {
          const status = execution.status === 'success' ? chalk.green('✓') : chalk.red('✗');
          const duration = (execution.duration_ms / 1000).toFixed(1) + 's';
          const time = new Date(execution.completed_at).toLocaleString();
          
          this.cli.print(`  ${status} ${chalk.gray(time)} - ${chalk.yellow(duration)}`);
        });
      }

    } catch (error) {
      spinner.stop();
      this.cli.printError(`Failed to analyze performance: ${error.message}`);
    }
  }

  async showToolUsage() {
    const spinner = this.cli.createSpinner('Analyzing tool usage...');
    spinner.start();

    try {
      const result = await this.cli.apiRequest('GET', '/api/agents/tools/usage');
      spinner.stop();

      if (!result.success) {
        this.cli.printError(`Failed to fetch tool usage: ${result.error}`);
        return;
      }

      const usage = result.data;

      this.cli.print('');
      this.cli.print(chalk.bold.red('🔧 Tool Usage Analytics'));
      this.cli.print(chalk.gray('═══════════════════════════════'));
      this.cli.print('');

      if (!usage?.tool_usage || Object.keys(usage.tool_usage).length === 0) {
        this.cli.printInfo('No tool usage data available');
        return;
      }

      // Sort tools by usage count
      const sorted = Object.entries(usage.tool_usage)
        .sort(([,a], [,b]) => b.count - a.count);

      const total = sorted.reduce((sum, [, data]) => sum + data.count, 0);

      sorted.forEach(([tool, data]) => {
        const percentage = ((data.count / total) * 100).toFixed(1);
        const bar = '█'.repeat(Math.ceil(data.count / total * 25));
        
        this.cli.print(
          `${chalk.cyan(tool.padEnd(20))} ${chalk.gray(bar)} ` +
          `${chalk.yellow(data.count.toString().padStart(4))} ${chalk.gray(`(${percentage}%)`)}`
        );
        
        if (data.avg_duration) {
          this.cli.print(`${' '.repeat(21)} ${chalk.gray('avg:')} ${chalk.magenta((data.avg_duration / 1000).toFixed(1) + 's')}`);
        }
      });

      this.cli.print('');
      this.cli.print(chalk.gray(`Total tool invocations: ${total}`));

    } catch (error) {
      spinner.stop();
      this.cli.printError(`Failed to show tool usage: ${error.message}`);
    }
  }

  // Interactive helpers
  async selectTimelineHours() {
    const { hours } = await inquirer.prompt([
      {
        type: 'list',
        name: 'hours',
        message: 'Select timeline duration:',
        choices: [
          { name: '1 hour', value: 1 },
          { name: '6 hours', value: 6 },
          { name: '24 hours (1 day)', value: 24 },
          { name: '168 hours (1 week)', value: 168 }
        ]
      }
    ]);

    await this.showAgentTimeline(hours);
  }

  async selectAgentForPerformance() {
    // First get list of agents
    const distribution = await this.cli.apiRequest('GET', '/api/agents/types/distribution');
    
    if (!distribution.success || !distribution.data?.distribution) {
      this.cli.printError('No agents available for performance analysis');
      return;
    }

    const agentTypes = Object.keys(distribution.data.distribution);
    const choices = agentTypes.map(type => ({ name: type, value: type }));

    const { agentName } = await inquirer.prompt([
      {
        type: 'list',
        name: 'agentName',
        message: 'Select agent for performance analysis:',
        choices,
        pageSize: 10
      }
    ]);

    await this.showAgentPerformance(agentName);
  }

  async interactiveExport() {
    const { format, includeMetrics } = await inquirer.prompt([
      {
        type: 'list',
        name: 'format',
        message: 'Export format:',
        choices: ['json', 'csv']
      },
      {
        type: 'confirm',
        name: 'includeMetrics',
        message: 'Include detailed metrics?',
        default: true
      }
    ]);

    await this.exportAgents({ export: format, includeMetrics });
  }

  async exportAgents(options) {
    const format = options.export || 'json';
    
    const spinner = this.cli.createSpinner(`Exporting agent data in ${format} format...`);
    spinner.start();

    try {
      const [terminalStatus, metrics, distribution, timeline] = await Promise.all([
        this.fetchTerminalStatus(),
        this.fetchAgentMetrics(),
        this.cli.apiRequest('GET', '/api/agents/types/distribution'),
        this.cli.apiRequest('GET', '/api/agents/metrics/timeline?hours=24')
      ]);

      const exportData = {
        active_agents: terminalStatus?.active_agents || [],
        metrics: metrics || {},
        distribution: distribution.success ? distribution.data : {},
        timeline: timeline.success ? timeline.data : {},
        exported_at: new Date().toISOString()
      };

      spinner.stop();

      if (format === 'json') {
        this.cli.print(JSON.stringify(exportData, null, 2));
      } else if (format === 'csv') {
        this.cli.print(this.convertAgentsToCSV(exportData.active_agents));
      }

    } catch (error) {
      spinner.stop();
      this.cli.printError(`Failed to export agents: ${error.message}`);
    }
  }

  // Helper methods
  async fetchTerminalStatus() {
    const result = await this.cli.apiRequest('GET', '/api/terminal/status');
    return result.success ? result.data : null;
  }

  async fetchAgentMetrics() {
    const result = await this.cli.apiRequest('GET', '/api/agents/metrics/current');
    return result.success ? result.data : null;
  }

  async fetchAgentColors() {
    const result = await this.cli.apiRequest('GET', '/api/terminal/agent-colors');
    return result.success ? result.data : {};
  }

  formatStatus(status) {
    const statusColors = {
      'active': 'green',
      'pending': 'yellow',
      'completing': 'cyan',
      'complete': 'blue',
      'failed': 'red'
    };

    const color = statusColors[status?.toLowerCase()] || 'white';
    return chalk[color](status);
  }

  getStatusColor(status) {
    const statusColors = {
      'active': 'green',
      'pending': 'yellow',
      'completing': 'cyan',
      'complete': 'blue',
      'failed': 'red'
    };

    return statusColors[status?.toLowerCase()] || 'white';
  }

  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  convertAgentsToCSV(agents) {
    if (!agents || agents.length === 0) return '';

    const headers = ['agent_name', 'agent_type', 'status', 'duration_ms', 'session_id', 'source_app'];
    const csvRows = [headers.join(',')];

    agents.forEach(agent => {
      const row = headers.map(header => agent[header] || '');
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }
}