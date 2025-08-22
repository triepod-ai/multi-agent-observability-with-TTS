/**
 * Monitor Command
 * Live monitoring dashboard with blessed terminal UI
 */

import blessed from 'blessed';
import contrib from 'blessed-contrib';
import chalk from 'chalk';

export class MonitorCommand {
  constructor(cli) {
    this.cli = cli;
    this.screen = null;
    this.widgets = {};
    this.updateInterval = null;
    this.wsConnection = null;
  }

  async execute(options = {}) {
    const refreshInterval = parseInt(options.refresh) || 1000;
    const focusArea = options.focus || 'all';
    const layout = options.layout || 'split';

    try {
      await this.initializeMonitor(focusArea, layout, refreshInterval);
    } catch (error) {
      this.cli.printError(`Failed to start monitor: ${error.message}`);
      await this.showFallbackMonitor(options);
    }
  }

  async initializeMonitor(focusArea, layout, refreshInterval) {
    // Create blessed screen
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'Multi-Agent Observability Monitor'
    });

    // Create layout based on focus area
    switch (layout) {
      case 'split':
        this.createSplitLayout(focusArea);
        break;
      case 'full':
        this.createFullLayout(focusArea);
        break;
      case 'compact':
        this.createCompactLayout(focusArea);
        break;
      default:
        this.createSplitLayout(focusArea);
    }

    // Set up key bindings
    this.setupKeyBindings();

    // Connect to WebSocket for real-time updates
    await this.connectWebSocket();

    // Start periodic updates
    this.startPeriodicUpdates(refreshInterval);

    // Initial data load
    await this.updateAllWidgets();

    // Render screen
    this.screen.render();
  }

  createSplitLayout(focusArea) {
    const grid = new contrib.grid({ rows: 12, cols: 12, screen: this.screen });

    if (focusArea === 'all' || focusArea === 'agents') {
      // Agent Status Table
      this.widgets.agentTable = grid.set(0, 0, 4, 6, contrib.table, {
        keys: true,
        fg: 'white',
        selectedFg: 'white',
        selectedBg: 'blue',
        interactive: true,
        label: 'Active Agents',
        width: '50%',
        height: '33%',
        border: { type: 'line', fg: 'cyan' },
        columnSpacing: 2,
        columnWidth: [20, 15, 10, 15]
      });

      // Agent Metrics Line Chart
      this.widgets.agentMetrics = grid.set(0, 6, 4, 6, contrib.line, {
        style: { line: 'yellow', text: 'green', baseline: 'black' },
        xLabelPadding: 3,
        xPadding: 5,
        label: 'Agent Activity',
        border: { type: 'line', fg: 'cyan' },
        wholeNumbersOnly: false
      });
    }

    if (focusArea === 'all' || focusArea === 'sessions') {
      // Session Tree
      this.widgets.sessionTree = grid.set(4, 0, 4, 6, contrib.tree, {
        fg: 'green',
        label: 'Session Hierarchy',
        border: { type: 'line', fg: 'cyan' }
      });

      // Session Stats
      this.widgets.sessionStats = grid.set(4, 6, 4, 6, blessed.box, {
        label: 'Session Statistics',
        border: { type: 'line', fg: 'cyan' },
        content: 'Loading...',
        tags: true,
        scrollable: true
      });
    }

    if (focusArea === 'all' || focusArea === 'hooks') {
      // Hook Coverage Donut
      this.widgets.hookCoverage = grid.set(8, 0, 4, 6, contrib.donut, {
        label: 'Hook Coverage',
        radius: 8,
        arcWidth: 3,
        remainColor: 'black',
        yPadding: 2,
        border: { type: 'line', fg: 'cyan' }
      });

      // System Log
      this.widgets.systemLog = grid.set(8, 6, 4, 6, contrib.log, {
        fg: 'green',
        selectedFg: 'green',
        label: 'System Events',
        border: { type: 'line', fg: 'cyan' }
      });
    }

    // Status bar
    this.widgets.statusBar = blessed.box({
      parent: this.screen,
      bottom: 0,
      left: 0,
      right: 0,
      height: 1,
      content: 'Press q to quit, r to refresh, f to toggle focus',
      style: { fg: 'white', bg: 'blue' }
    });
  }

  createFullLayout(focusArea) {
    // Single widget taking full screen
    switch (focusArea) {
      case 'agents':
        this.widgets.agentTable = blessed.listtable({
          parent: this.screen,
          top: 0,
          left: 0,
          right: 0,
          bottom: 1,
          label: 'Agents Monitor (Full View)',
          border: { type: 'line', fg: 'cyan' },
          keys: true,
          interactive: true,
          style: {
            selected: { bg: 'blue' }
          }
        });
        break;
      
      case 'sessions':
        this.widgets.sessionTree = contrib.tree({
          parent: this.screen,
          top: 0,
          left: 0,
          right: 0,
          bottom: 1,
          label: 'Sessions Monitor (Full View)',
          border: { type: 'line', fg: 'cyan' }
        });
        break;
        
      default:
        this.createSplitLayout('all');
    }

    this.widgets.statusBar = blessed.box({
      parent: this.screen,
      bottom: 0,
      left: 0,
      right: 0,
      height: 1,
      content: 'Press q to quit, r to refresh, ESC for split view',
      style: { fg: 'white', bg: 'blue' }
    });
  }

  createCompactLayout(focusArea) {
    const grid = new contrib.grid({ rows: 6, cols: 12, screen: this.screen });

    // Compact status displays
    this.widgets.compactStatus = grid.set(0, 0, 2, 12, blessed.box, {
      label: 'System Overview',
      border: { type: 'line', fg: 'cyan' },
      content: 'Loading...',
      tags: true
    });

    this.widgets.agentList = grid.set(2, 0, 3, 6, blessed.list, {
      label: 'Active Agents',
      border: { type: 'line', fg: 'cyan' },
      keys: true,
      interactive: true,
      style: {
        selected: { bg: 'blue' }
      }
    });

    this.widgets.eventList = grid.set(2, 6, 3, 6, blessed.list, {
      label: 'Recent Events',
      border: { type: 'line', fg: 'cyan' },
      keys: true,
      interactive: true,
      style: {
        selected: { bg: 'blue' }
      }
    });

    this.widgets.statusBar = blessed.box({
      parent: this.screen,
      bottom: 0,
      left: 0,
      right: 0,
      height: 1,
      content: 'Press q to quit, r to refresh, s for split view',
      style: { fg: 'white', bg: 'blue' }
    });
  }

  setupKeyBindings() {
    // Quit
    this.screen.key(['escape', 'q', 'C-c'], () => {
      this.cleanup();
      process.exit(0);
    });

    // Refresh
    this.screen.key(['r'], async () => {
      await this.updateAllWidgets();
      this.screen.render();
    });

    // Toggle focus
    this.screen.key(['f'], () => {
      // Cycle through focus areas
      // Implementation depends on current state
    });

    // Help
    this.screen.key(['h', '?'], () => {
      this.showHelp();
    });
  }

  async connectWebSocket() {
    try {
      this.wsConnection = await this.cli.connectWebSocket();
      
      this.wsConnection.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.handleWebSocketMessage(message);
        } catch (error) {
          // Ignore invalid JSON
        }
      });

      this.wsConnection.on('error', (error) => {
        this.logMessage(`WebSocket error: ${error.message}`, 'red');
      });

      this.wsConnection.on('close', () => {
        this.logMessage('WebSocket disconnected', 'yellow');
      });

    } catch (error) {
      this.logMessage(`Failed to connect WebSocket: ${error.message}`, 'red');
    }
  }

  handleWebSocketMessage(message) {
    switch (message.type) {
      case 'event':
        this.handleNewEvent(message.data);
        break;
      case 'agent_started':
        this.handleAgentStarted(message.data);
        break;
      case 'agent_completed':
        this.handleAgentCompleted(message.data);
        break;
      case 'terminal_status':
        this.handleTerminalStatus(message.data);
        break;
      default:
        // Unknown message type
        break;
    }
  }

  handleNewEvent(event) {
    if (this.widgets.systemLog) {
      const timestamp = new Date(event.timestamp || Date.now()).toLocaleTimeString();
      const message = `[${timestamp}] ${event.hook_event_type}: ${event.source_app}`;
      this.widgets.systemLog.log(message);
    }

    if (this.widgets.eventList) {
      const eventText = `${event.hook_event_type} - ${event.source_app}`;
      const items = this.widgets.eventList.items || [];
      items.unshift(eventText);
      
      // Keep only last 50 events
      if (items.length > 50) {
        items.pop();
      }
      
      this.widgets.eventList.setItems(items);
    }

    this.screen.render();
  }

  handleAgentStarted(agent) {
    this.logMessage(`Agent started: ${agent.agent_name}`, 'green');
    this.updateAgentWidgets();
  }

  handleAgentCompleted(agent) {
    this.logMessage(`Agent completed: ${agent.agent_name}`, 'blue');
    this.updateAgentWidgets();
  }

  handleTerminalStatus(status) {
    // Update agent displays with latest status
    this.updateAgentDisplays(status);
  }

  startPeriodicUpdates(interval) {
    this.updateInterval = setInterval(async () => {
      await this.updateAllWidgets();
      this.screen.render();
    }, interval);
  }

  async updateAllWidgets() {
    try {
      await Promise.all([
        this.updateAgentWidgets(),
        this.updateSessionWidgets(),
        this.updateHookWidgets(),
        this.updateSystemWidgets()
      ]);
    } catch (error) {
      this.logMessage(`Update error: ${error.message}`, 'red');
    }
  }

  async updateAgentWidgets() {
    if (this.widgets.agentTable) {
      const terminalStatus = await this.fetchTerminalStatus();
      if (terminalStatus?.active_agents) {
        const headers = ['Agent Name', 'Type', 'Status', 'Duration'];
        const data = [headers];
        
        terminalStatus.active_agents.forEach(agent => {
          const duration = agent.duration_ms ? `${Math.round(agent.duration_ms / 1000)}s` : '0s';
          data.push([
            agent.agent_name,
            agent.agent_type,
            agent.status,
            duration
          ]);
        });
        
        this.widgets.agentTable.setData(data);
      }
    }

    if (this.widgets.agentList) {
      const terminalStatus = await this.fetchTerminalStatus();
      if (terminalStatus?.active_agents) {
        const items = terminalStatus.active_agents.map(agent => 
          `${agent.agent_name} [${agent.status}]`
        );
        this.widgets.agentList.setItems(items);
      }
    }

    if (this.widgets.agentMetrics) {
      // Update metrics chart
      const metrics = await this.fetchAgentTimeline();
      if (metrics) {
        this.updateMetricsChart(metrics);
      }
    }
  }

  async updateSessionWidgets() {
    if (this.widgets.sessionTree) {
      // Implementation for session tree updates
    }

    if (this.widgets.sessionStats) {
      const stats = await this.fetchSessionStats();
      if (stats) {
        this.widgets.sessionStats.setContent(this.formatSessionStats(stats));
      }
    }
  }

  async updateHookWidgets() {
    if (this.widgets.hookCoverage) {
      const coverage = await this.fetchHookCoverage();
      if (coverage) {
        const data = [
          { percent: coverage.totalActiveHooks || 0, label: 'Active', color: 'green' },
          { percent: coverage.totalInactiveHooks || 0, label: 'Inactive', color: 'yellow' },
          { percent: coverage.totalErrorHooks || 0, label: 'Error', color: 'red' }
        ];
        this.widgets.hookCoverage.setData(data);
      }
    }
  }

  async updateSystemWidgets() {
    if (this.widgets.compactStatus) {
      const health = await this.fetchSystemHealth();
      const metrics = await this.fetchAgentMetrics();
      
      const content = this.formatCompactStatus(health, metrics);
      this.widgets.compactStatus.setContent(content);
    }
  }

  updateMetricsChart(metrics) {
    if (!this.widgets.agentMetrics || !metrics.timeline) return;

    const series = {
      title: 'Agents',
      x: metrics.timeline.map(point => point.hour),
      y: metrics.timeline.map(point => point.agent_count)
    };

    this.widgets.agentMetrics.setData([series]);
  }

  formatSessionStats(stats) {
    return [
      '{bold}Session Statistics{/bold}',
      '',
      `Total Sessions: {yellow-fg}${stats.total_sessions || 0}{/yellow-fg}`,
      `Active Sessions: {green-fg}${stats.active_sessions || 0}{/green-fg}`,
      `Avg Duration: {cyan-fg}${stats.average_duration || 'N/A'}{/cyan-fg}`,
      `Success Rate: {green-fg}${Math.round((stats.success_rate || 0) * 100)}%{/green-fg}`,
      '',
      '{bold}Relationship Types:{/bold}',
      ...Object.entries(stats.relationship_types || {}).map(([type, count]) => 
        `  ${type}: {yellow-fg}${count}{/yellow-fg}`
      )
    ].join('\n');
  }

  formatCompactStatus(health, metrics) {
    const healthStatus = health?.status || 'unknown';
    const healthColor = healthStatus === 'healthy' ? 'green' : 'red';
    
    return [
      `{bold}System Status{/bold}`,
      '',
      `Health: {${healthColor}-fg}${healthStatus}{/${healthColor}-fg}`,
      `Active Agents: {yellow-fg}${metrics?.active_agents || 0}{/yellow-fg}`,
      `Total Agents: {cyan-fg}${metrics?.total_agents || 0}{/cyan-fg}`,
      `Success Rate: {green-fg}${Math.round((metrics?.success_rate || 0) * 100)}%{/green-fg}`,
      '',
      `Last Update: {gray-fg}${new Date().toLocaleTimeString()}{/gray-fg}`
    ].join('\n');
  }

  // API helper methods
  async fetchTerminalStatus() {
    const result = await this.cli.apiRequest('GET', '/api/terminal/status');
    return result.success ? result.data : null;
  }

  async fetchAgentMetrics() {
    const result = await this.cli.apiRequest('GET', '/api/agents/metrics/current');
    return result.success ? result.data : null;
  }

  async fetchAgentTimeline() {
    const result = await this.cli.apiRequest('GET', '/api/agents/metrics/timeline?hours=6');
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

  async fetchSessionStats() {
    const result = await this.cli.apiRequest('GET', '/api/relationships/stats');
    return result.success ? result.data : null;
  }

  logMessage(message, color = 'white') {
    if (this.widgets.systemLog) {
      const timestamp = new Date().toLocaleTimeString();
      this.widgets.systemLog.log(`{${color}-fg}[${timestamp}] ${message}{/${color}-fg}`);
    }
  }

  showHelp() {
    const helpBox = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: 60,
      height: 15,
      label: 'Monitor Help',
      border: { type: 'line', fg: 'cyan' },
      content: [
        'Keyboard Shortcuts:',
        '',
        'q, Esc, Ctrl+C - Quit monitor',
        'r              - Refresh all widgets',
        'f              - Toggle focus area',
        'h, ?           - Show this help',
        '',
        'Navigation:',
        'Arrow keys     - Navigate widgets',
        'Enter          - Select item',
        'Tab            - Switch between widgets'
      ].join('\n'),
      tags: true
    });

    helpBox.key(['escape', 'q'], () => {
      helpBox.destroy();
      this.screen.render();
    });

    helpBox.focus();
    this.screen.render();
  }

  async showFallbackMonitor(options) {
    this.cli.printWarning('Server unavailable - starting basic monitor mode');
    
    // Simple text-based monitor
    const refreshInterval = parseInt(options.refresh) || 5000;
    
    this.cli.print('Starting fallback monitor mode...');
    this.cli.print('Press Ctrl+C to exit');
    
    setInterval(() => {
      process.stdout.write('\x1B[2J\x1B[0f'); // Clear screen
      this.cli.print(chalk.red('⚠ OFFLINE MONITOR MODE'));
      this.cli.print(chalk.gray('═'.repeat(50)));
      this.cli.print(`${chalk.red('✗')} Server: Not reachable`);
      this.cli.print(`${chalk.yellow('⚠')} Mode: Fallback monitoring`);
      this.cli.print(`${chalk.gray('ℹ')} Time: ${new Date().toLocaleString()}`);
      this.cli.print('');
      this.cli.print(chalk.gray('Check server connectivity with: obs config --test'));
    }, refreshInterval);
  }

  cleanup() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    if (this.wsConnection) {
      this.cli.disconnectWebSocket();
    }
    
    if (this.screen) {
      this.screen.destroy();
    }
  }
}