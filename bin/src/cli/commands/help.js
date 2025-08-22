/**
 * Help Command
 * Interactive help system with command examples and documentation
 */

import chalk from 'chalk';
import inquirer from 'inquirer';

export class HelpCommand {
  constructor(cli) {
    this.cli = cli;
  }

  async execute() {
    await this.showInteractiveHelp();
  }

  async showInteractiveHelp() {
    this.cli.print('');
    this.cli.print(chalk.bold.cyan('🆘 Interactive Help System'));
    this.cli.print(chalk.gray('═══════════════════════════'));
    this.cli.print('');

    const choices = [
      { name: 'Quick Start Guide', value: 'quickstart' },
      { name: 'Command Reference', value: 'commands' },
      { name: 'Common Use Cases', value: 'usecases' },
      { name: 'Configuration Guide', value: 'config' },
      { name: 'Troubleshooting', value: 'troubleshooting' },
      { name: 'Examples & Recipes', value: 'examples' },
      { name: 'System Overview', value: 'overview' },
      { name: 'Exit Help', value: 'exit' }
    ];

    const { topic } = await inquirer.prompt([
      {
        type: 'list',
        name: 'topic',
        message: 'What would you like help with?',
        choices,
        pageSize: 10
      }
    ]);

    switch (topic) {
      case 'quickstart':
        await this.showQuickStart();
        break;
      case 'commands':
        await this.showCommandReference();
        break;
      case 'usecases':
        await this.showUseCases();
        break;
      case 'config':
        await this.showConfigurationGuide();
        break;
      case 'troubleshooting':
        await this.showTroubleshooting();
        break;
      case 'examples':
        await this.showExamples();
        break;
      case 'overview':
        await this.showSystemOverview();
        break;
      case 'exit':
        return;
    }

    // Loop back to help menu unless user exits
    if (topic !== 'exit') {
      this.cli.print('');
      const { continue_ } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'continue_',
          message: 'Would you like to see more help topics?',
          default: true
        }
      ]);

      if (continue_) {
        await this.showInteractiveHelp();
      }
    }
  }

  async showQuickStart() {
    this.cli.print(chalk.bold.green('🚀 Quick Start Guide'));
    this.cli.print(chalk.gray('═══════════════════'));
    this.cli.print('');

    this.cli.print(chalk.bold.white('1. Check System Status'));
    this.cli.print('   First, verify the observability server is running:');
    this.cli.print(`   ${chalk.cyan('obs status')}`);
    this.cli.print('');

    this.cli.print(chalk.bold.white('2. View Active Agents'));
    this.cli.print('   See what agents are currently running:');
    this.cli.print(`   ${chalk.cyan('obs agents --active')}`);
    this.cli.print('');

    this.cli.print(chalk.bold.white('3. Monitor in Real-time'));
    this.cli.print('   Start the live monitoring dashboard:');
    this.cli.print(`   ${chalk.cyan('obs monitor')}`);
    this.cli.print('');

    this.cli.print(chalk.bold.white('4. View Recent Events'));
    this.cli.print('   See what\'s happening in the system:');
    this.cli.print(`   ${chalk.cyan('obs events --watch')}`);
    this.cli.print('');

    this.cli.print(chalk.bold.white('5. Check Configuration'));
    this.cli.print('   Test connectivity and view settings:');
    this.cli.print(`   ${chalk.cyan('obs config --test')}`);
    this.cli.print('');

    this.cli.print(chalk.yellow('💡 Tip: Most commands have interactive modes. Just run the command without options!'));
  }

  async showCommandReference() {
    const commandCategories = [
      {
        name: 'Monitoring & Status',
        commands: [
          { cmd: 'obs status', desc: 'Show system status' },
          { cmd: 'obs status --watch', desc: 'Watch status in real-time' },
          { cmd: 'obs monitor', desc: 'Live dashboard' },
          { cmd: 'obs monitor --focus agents', desc: 'Focus on agents only' }
        ]
      },
      {
        name: 'Agent Management',
        commands: [
          { cmd: 'obs agents', desc: 'Interactive agent overview' },
          { cmd: 'obs agents --active', desc: 'Show active agents' },
          { cmd: 'obs agents --metrics', desc: 'Agent performance metrics' },
          { cmd: 'obs agents --timeline 6', desc: 'Agent activity timeline' }
        ]
      },
      {
        name: 'Session Management',
        commands: [
          { cmd: 'obs sessions', desc: 'Interactive session management' },
          { cmd: 'obs sessions --tree <id>', desc: 'Show session hierarchy' },
          { cmd: 'obs sessions --stats', desc: 'Session statistics' }
        ]
      },
      {
        name: 'Events & Data',
        commands: [
          { cmd: 'obs events', desc: 'View system events' },
          { cmd: 'obs events --watch', desc: 'Watch events live' },
          { cmd: 'obs export --type events', desc: 'Export event data' },
          { cmd: 'obs export --format csv', desc: 'Export as CSV' }
        ]
      },
      {
        name: 'Configuration',
        commands: [
          { cmd: 'obs config', desc: 'Interactive configuration' },
          { cmd: 'obs config --test', desc: 'Test connectivity' },
          { cmd: 'obs config --redis-test', desc: 'Test Redis connection' }
        ]
      }
    ];

    this.cli.print(chalk.bold.blue('📚 Command Reference'));
    this.cli.print(chalk.gray('════════════════════'));
    this.cli.print('');

    commandCategories.forEach(category => {
      this.cli.print(chalk.bold.yellow(category.name + ':'));
      category.commands.forEach(({ cmd, desc }) => {
        this.cli.print(`  ${chalk.cyan(cmd.padEnd(30))} ${chalk.gray(desc)}`);
      });
      this.cli.print('');
    });

    this.cli.print(chalk.yellow('💡 Use --help with any command for detailed options'));
  }

  async showUseCases() {
    this.cli.print(chalk.bold.magenta('🎯 Common Use Cases'));
    this.cli.print(chalk.gray('════════════════════'));
    this.cli.print('');

    const useCases = [
      {
        title: 'Debugging Agent Issues',
        steps: [
          'obs agents --active  # See what\'s running',
          'obs agents --performance <name>  # Check performance',
          'obs events --session <id>  # View session events',
          'obs sessions --tree <id>  # See session hierarchy'
        ]
      },
      {
        title: 'System Health Monitoring',
        steps: [
          'obs status  # Quick health check',
          'obs monitor  # Live dashboard',
          'obs config --test  # Test connectivity',
          'obs agents --metrics  # Performance overview'
        ]
      },
      {
        title: 'Data Analysis & Export',
        steps: [
          'obs export --type agents --format csv  # Export agent data',
          'obs sessions --stats  # Get session statistics',
          'obs agents --distribution  # Agent type analysis',
          'obs events --export json  # Export event history'
        ]
      },
      {
        title: 'Project Handoff Management',
        steps: [
          'obs handoffs --list  # See available handoffs',
          'obs handoffs --get --project myproject  # Get handoff',
          'obs handoffs --save "content" --project myproject  # Save handoff',
          'obs config --fallback-status  # Check storage status'
        ]
      },
      {
        title: 'Theme Management',
        steps: [
          'obs themes --list  # Browse themes',
          'obs themes --search dark  # Find specific themes',
          'obs themes --export <id>  # Export theme',
          'obs themes --stats  # Usage statistics'
        ]
      }
    ];

    useCases.forEach(useCase => {
      this.cli.print(chalk.bold.white(useCase.title + ':'));
      useCase.steps.forEach(step => {
        const [command, comment] = step.split('  # ');
        this.cli.print(`  ${chalk.cyan(command)}${comment ? chalk.gray('  # ' + comment) : ''}`);
      });
      this.cli.print('');
    });
  }

  async showConfigurationGuide() {
    this.cli.print(chalk.bold.red('⚙️ Configuration Guide'));
    this.cli.print(chalk.gray('═════════════════════'));
    this.cli.print('');

    this.cli.print(chalk.bold.white('Environment Variables:'));
    this.cli.print(`  ${chalk.cyan('OBS_SERVER_URL')}    Server URL (default: http://localhost:4000)`);
    this.cli.print(`  ${chalk.cyan('OBS_VERBOSE')}       Enable verbose output (true/false)`);
    this.cli.print(`  ${chalk.cyan('OBS_NO_COLOR')}      Disable colored output (true/false)`);
    this.cli.print('');

    this.cli.print(chalk.bold.white('Command Line Options:'));
    this.cli.print(`  ${chalk.cyan('--server <url>')}    Override server URL`);
    this.cli.print(`  ${chalk.cyan('--verbose')}         Enable verbose output`);
    this.cli.print(`  ${chalk.cyan('--no-color')}        Disable colored output`);
    this.cli.print(`  ${chalk.cyan('--json')}            Output in JSON format`);
    this.cli.print('');

    this.cli.print(chalk.bold.white('Server Configuration:'));
    this.cli.print('  The CLI connects to the observability server which should be running on:');
    this.cli.print(`  ${chalk.yellow('http://localhost:4000')} (default)`);
    this.cli.print('');
    this.cli.print('  WebSocket endpoint for real-time updates:');
    this.cli.print(`  ${chalk.yellow('ws://localhost:4000/stream')}`);
    this.cli.print('');

    this.cli.print(chalk.bold.white('Testing Configuration:'));
    this.cli.print(`  ${chalk.cyan('obs config --test')}         Test server connectivity`);
    this.cli.print(`  ${chalk.cyan('obs config --redis-test')}   Test Redis connectivity`);
    this.cli.print(`  ${chalk.cyan('obs config --show')}         Show current configuration`);
  }

  async showTroubleshooting() {
    this.cli.print(chalk.bold.red('🔧 Troubleshooting'));
    this.cli.print(chalk.gray('═══════════════════'));
    this.cli.print('');

    const issues = [
      {
        problem: 'Server not reachable',
        solutions: [
          'Check if the observability server is running',
          'Verify server URL with: obs config --show',
          'Test connectivity: obs config --test',
          'Check firewall and network settings'
        ]
      },
      {
        problem: 'WebSocket connection failed',
        solutions: [
          'Server may be overloaded - try again',
          'Check if WebSocket port is blocked',
          'CLI will fall back to polling mode automatically',
          'Use --verbose to see connection details'
        ]
      },
      {
        problem: 'No agents showing',
        solutions: [
          'Check if agents are actually running',
          'Verify hook system is properly installed',
          'Check server logs for agent events',
          'Use obs events to see if events are flowing'
        ]
      },
      {
        problem: 'Redis connection issues',
        solutions: [
          'Test Redis: obs config --redis-test',
          'System will use fallback storage automatically',
          'Check Redis server status and configuration',
          'Verify network connectivity to Redis'
        ]
      },
      {
        problem: 'Performance issues',
        solutions: [
          'Use --json flag for faster output',
          'Reduce data with --limit option',
          'Check server resource usage',
          'Use compact display modes'
        ]
      }
    ];

    issues.forEach(issue => {
      this.cli.print(chalk.bold.yellow(`❌ ${issue.problem}:`));
      issue.solutions.forEach((solution, index) => {
        this.cli.print(`   ${index + 1}. ${solution}`);
      });
      this.cli.print('');
    });

    this.cli.print(chalk.bold.white('Getting More Help:'));
    this.cli.print('  • Use --verbose flag for detailed output');
    this.cli.print('  • Check server logs for error details');
    this.cli.print('  • Test individual components with config commands');
    this.cli.print('  • Use obs status for overall system health');
  }

  async showExamples() {
    this.cli.print(chalk.bold.green('📖 Examples & Recipes'));
    this.cli.print(chalk.gray('═══════════════════════'));
    this.cli.print('');

    const examples = [
      {
        title: 'Monitor System During Development',
        commands: [
          '# Start monitoring in a separate terminal',
          'obs monitor --focus agents',
          '',
          '# In another terminal, watch events',
          'obs events --watch',
          '',
          '# Check status periodically',
          'obs status --compact'
        ]
      },
      {
        title: 'Analyze Agent Performance',
        commands: [
          '# Get overview of all agents',
          'obs agents --metrics',
          '',
          '# Check specific agent performance',
          'obs agents --performance my-agent',
          '',
          '# View activity timeline',
          'obs agents --timeline 24',
          '',
          '# Export performance data',
          'obs export --type agents --format csv > agents.csv'
        ]
      },
      {
        title: 'Debug Session Issues',
        commands: [
          '# Find the problematic session',
          'obs sessions --stats',
          '',
          '# View session hierarchy',
          'obs sessions --tree session_123',
          '',
          '# Check session events',
          'obs events --session session_123',
          '',
          '# Export session data for analysis',
          'obs export --type sessions --format json > sessions.json'
        ]
      },
      {
        title: 'System Health Checks',
        commands: [
          '# Quick health check',
          'obs status',
          '',
          '# Detailed connectivity test',
          'obs config --test',
          '',
          '# Check Redis status',
          'obs config --redis-test',
          '',
          '# View fallback system status',
          'obs config --fallback-status'
        ]
      }
    ];

    examples.forEach(example => {
      this.cli.print(chalk.bold.cyan(example.title + ':'));
      example.commands.forEach(cmd => {
        if (cmd.startsWith('#')) {
          this.cli.print(chalk.gray(cmd));
        } else if (cmd === '') {
          this.cli.print('');
        } else {
          this.cli.print(`  ${chalk.yellow(cmd)}`);
        }
      });
      this.cli.print('');
    });
  }

  async showSystemOverview() {
    this.cli.print(chalk.bold.blue('🏗️ System Overview'));
    this.cli.print(chalk.gray('═══════════════════'));
    this.cli.print('');

    this.cli.print(chalk.bold.white('Multi-Agent Observability System'));
    this.cli.print('The system consists of several components working together:');
    this.cli.print('');

    this.cli.print(chalk.bold.cyan('🖥️  Server (Port 4000)'));
    this.cli.print('   • REST API for data access');
    this.cli.print('   • WebSocket endpoint for real-time updates');
    this.cli.print('   • SQLite database for event storage');
    this.cli.print('   • Redis integration for caching and handoffs');
    this.cli.print('');

    this.cli.print(chalk.bold.green('🤖 Agent System'));
    this.cli.print('   • Claude Code subagents with monitoring hooks');
    this.cli.print('   • Automatic event tracking and metrics');
    this.cli.print('   • Session relationship tracking');
    this.cli.print('   • Performance and token usage monitoring');
    this.cli.print('');

    this.cli.print(chalk.bold.yellow('📊 This CLI Tool'));
    this.cli.print('   • Terminal-first interface for all operations');
    this.cli.print('   • Real-time monitoring and live dashboards');
    this.cli.print('   • Data export and analysis capabilities');
    this.cli.print('   • Interactive help and configuration');
    this.cli.print('');

    this.cli.print(chalk.bold.magenta('🎨 Additional Features'));
    this.cli.print('   • Theme management for UI customization');
    this.cli.print('   • Session handoff system for project continuity');
    this.cli.print('   • Fallback storage when Redis is unavailable');
    this.cli.print('   • Educational mode for learning the system');
    this.cli.print('');

    this.cli.print(chalk.bold.white('Data Flow:'));
    this.cli.print(`${chalk.cyan('Agents')} ${chalk.gray('→')} ${chalk.yellow('Hooks')} ${chalk.gray('→')} ${chalk.blue('Server')} ${chalk.gray('→')} ${chalk.green('CLI Dashboard')}`);
    this.cli.print('');

    this.cli.print(chalk.gray('The CLI provides complete access to all system functionality'));
    this.cli.print(chalk.gray('through an intuitive terminal interface.'));
  }
}