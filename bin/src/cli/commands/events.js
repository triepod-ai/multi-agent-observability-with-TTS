/**
 * Events Command
 * View and filter system events with watch mode
 */

import chalk from 'chalk';
import inquirer from 'inquirer';

export class EventsCommand {
  constructor(cli) {
    this.cli = cli;
    this.watchMode = false;
    this.watchInterval = null;
  }

  async execute(options = {}) {
    if (options.watch) {
      await this.startWatchMode(options);
      return;
    }

    if (options.export) {
      await this.exportEvents(options);
      return;
    }

    await this.showEvents(options);
  }

  async showEvents(options = {}) {
    const spinner = this.cli.createSpinner('Fetching events...');
    spinner.start();

    try {
      const limit = parseInt(options.limit) || 100;
      const sessionId = options.session;
      const filters = this.parseFilters(options.filter);

      let events = await this.fetchEvents(limit, sessionId);
      
      // Apply filters if provided
      if (filters && Object.keys(filters).length > 0) {
        events = this.applyFilters(events, filters);
      }

      spinner.stop();

      this.cli.print('');
      this.cli.print(chalk.bold.green('📋 System Events'));
      this.cli.print(chalk.gray('═════════════════'));
      this.cli.print('');

      if (!events || events.length === 0) {
        this.cli.printWarning('No events found');
        return;
      }

      this.displayEvents(events, options);

      // Offer interactive options if not watching
      if (!options.watch) {
        await this.showEventOptions(events, options);
      }

    } catch (error) {
      spinner.stop();
      this.cli.printError(`Failed to fetch events: ${error.message}`);
    }
  }

  displayEvents(events, options = {}) {
    if (this.cli.config.jsonOutput) {
      this.cli.print(JSON.stringify(events, null, 2));
      return;
    }

    // Compact view for watching
    if (options.watch || options.compact) {
      this.displayCompactEvents(events);
    } else {
      this.displayDetailedEvents(events);
    }
  }

  displayCompactEvents(events) {
    events.slice(0, 20).forEach((event, index) => {
      const timestamp = new Date(event.timestamp || Date.now()).toLocaleTimeString();
      const typeColor = this.getEventTypeColor(event.hook_event_type);
      const sessionShort = event.session_id?.substring(0, 8) + '...' || 'unknown';
      
      this.cli.print(
        `${chalk.gray(timestamp)} ${chalk[typeColor](event.hook_event_type.padEnd(15))} ` +
        `${chalk.cyan(event.source_app.padEnd(12))} ${chalk.gray(sessionShort)}`
      );
    });

    if (events.length > 20) {
      this.cli.print(chalk.gray(`... and ${events.length - 20} more events`));
    }
  }

  displayDetailedEvents(events) {
    events.slice(0, 10).forEach((event, index) => {
      this.displayDetailedEvent(event, index + 1);
    });

    if (events.length > 10) {
      this.cli.print(chalk.gray(`... and ${events.length - 10} more events (use --limit to see more)`));
    }
  }

  displayDetailedEvent(event, index) {
    const timestamp = new Date(event.timestamp || Date.now()).toLocaleString();
    const typeColor = this.getEventTypeColor(event.hook_event_type);
    
    this.cli.print(chalk.bold.white(`[${index}] ${event.hook_event_type}`));
    this.cli.print(`  ${chalk.gray('Time:')} ${chalk.cyan(timestamp)}`);
    this.cli.print(`  ${chalk.gray('Source:')} ${chalk.magenta(event.source_app)}`);
    this.cli.print(`  ${chalk.gray('Session:')} ${chalk.yellow(event.session_id)}`);
    
    if (event.parent_session_id) {
      this.cli.print(`  ${chalk.gray('Parent:')} ${chalk.yellow(event.parent_session_id)}`);
    }
    
    if (event.session_depth) {
      this.cli.print(`  ${chalk.gray('Depth:')} ${chalk.cyan(event.session_depth)}`);
    }

    // Show payload highlights
    if (event.payload && typeof event.payload === 'object') {
      const highlights = this.extractPayloadHighlights(event.payload);
      if (highlights.length > 0) {
        this.cli.print(`  ${chalk.gray('Details:')} ${highlights.join(', ')}`);
      }
    }

    this.cli.print('');
  }

  extractPayloadHighlights(payload) {
    const highlights = [];
    
    // Agent-related highlights
    if (payload.agent_name) {
      highlights.push(`agent: ${payload.agent_name}`);
    }
    
    if (payload.agent_type) {
      highlights.push(`type: ${payload.agent_type}`);
    }
    
    if (payload.task || payload.description) {
      const task = (payload.task || payload.description).substring(0, 40);
      highlights.push(`task: ${task}${task.length >= 40 ? '...' : ''}`);
    }
    
    if (payload.duration) {
      highlights.push(`duration: ${payload.duration}ms`);
    }
    
    if (payload.tokens_used) {
      highlights.push(`tokens: ${payload.tokens_used}`);
    }
    
    if (payload.result !== undefined) {
      highlights.push(`result: ${payload.result ? 'success' : 'failed'}`);
    }

    return highlights;
  }

  async startWatchMode(options) {
    this.watchMode = true;
    const refreshInterval = 2000; // Fixed 2-second refresh for events
    
    this.cli.printInfo('Starting event watch mode. Press Ctrl+C to exit.');
    
    // Connect to WebSocket for real-time updates
    try {
      const ws = await this.cli.connectWebSocket();
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          if (message.type === 'event') {
            this.handleRealtimeEvent(message.data);
          }
        } catch (error) {
          // Ignore invalid JSON
        }
      });

      this.cli.printSuccess('Connected to real-time event stream');
      
    } catch (error) {
      this.cli.printWarning(`WebSocket connection failed: ${error.message}`);
      this.cli.printInfo('Falling back to polling mode...');
      
      // Fallback to polling
      this.startPollingMode(options);
    }

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.stopWatchMode();
      process.exit(0);
    });
  }

  startPollingMode(options) {
    // Clear screen and show initial events
    process.stdout.write('\x1B[2J\x1B[0f');
    this.showEvents({ ...options, compact: true });
    
    this.watchInterval = setInterval(async () => {
      process.stdout.write('\x1B[2J\x1B[0f');
      await this.showEvents({ ...options, compact: true });
    }, 2000);
  }

  handleRealtimeEvent(event) {
    // Clear current line and show new event
    process.stdout.write('\r\x1B[K');
    
    const timestamp = new Date(event.timestamp || Date.now()).toLocaleTimeString();
    const typeColor = this.getEventTypeColor(event.hook_event_type);
    const sessionShort = event.session_id?.substring(0, 8) + '...' || 'unknown';
    
    this.cli.print(
      `${chalk.bold.green('NEW')} ${chalk.gray(timestamp)} ` +
      `${chalk[typeColor](event.hook_event_type)} ` +
      `${chalk.cyan(event.source_app)} ${chalk.gray(sessionShort)}`
    );
  }

  stopWatchMode() {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = null;
    }
    
    this.cli.disconnectWebSocket();
    this.watchMode = false;
  }

  async showEventOptions(events, options) {
    const choices = [
      { name: 'Filter events', value: 'filter' },
      { name: 'View specific session events', value: 'session' },
      { name: 'Start watch mode', value: 'watch' },
      { name: 'Export events', value: 'export' },
      { name: 'Refresh events', value: 'refresh' },
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
      case 'filter':
        await this.interactiveFilter(options);
        break;
      case 'session':
        await this.selectSessionEvents(events);
        break;
      case 'watch':
        await this.startWatchMode(options);
        break;
      case 'export':
        await this.exportEvents(options);
        break;
      case 'refresh':
        await this.showEvents(options);
        break;
      case 'exit':
        return;
    }
  }

  async interactiveFilter(options) {
    // Get filter options from server
    const filterOptionsResult = await this.cli.apiRequest('GET', '/events/filter-options');
    
    if (!filterOptionsResult.success) {
      this.cli.printError('Failed to fetch filter options');
      return;
    }

    const filterOptions = filterOptionsResult.data;
    
    const { eventType, sourceApp } = await inquirer.prompt([
      {
        type: 'list',
        name: 'eventType',
        message: 'Filter by event type:',
        choices: [
          { name: 'All event types', value: null },
          ...filterOptions.hook_event_types.map(type => ({ name: type, value: type }))
        ]
      },
      {
        type: 'list',
        name: 'sourceApp',
        message: 'Filter by source app:',
        choices: [
          { name: 'All source apps', value: null },
          ...filterOptions.source_apps.map(app => ({ name: app, value: app }))
        ]
      }
    ]);

    const filterString = [
      eventType ? `hook_event_type:${eventType}` : null,
      sourceApp ? `source_app:${sourceApp}` : null
    ].filter(Boolean).join(',');

    await this.showEvents({ ...options, filter: filterString });
  }

  async selectSessionEvents(events) {
    // Get unique sessions from events
    const sessions = [...new Set(events.map(e => e.session_id))]
      .slice(0, 20)
      .map(sessionId => ({
        name: `${sessionId.substring(0, 20)}...`,
        value: sessionId
      }));

    if (sessions.length === 0) {
      this.cli.printWarning('No sessions available');
      return;
    }

    const { sessionId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'sessionId',
        message: 'Select session to view:',
        choices: sessions,
        pageSize: 10
      }
    ]);

    await this.showEvents({ session: sessionId });
  }

  async exportEvents(options) {
    const { format } = await inquirer.prompt([
      {
        type: 'list',
        name: 'format',
        message: 'Export format:',
        choices: ['json', 'csv']
      }
    ]);

    const limit = parseInt(options.limit) || 1000;
    const events = await this.fetchEvents(limit);

    if (format === 'json') {
      this.cli.print(JSON.stringify(events, null, 2));
    } else if (format === 'csv') {
      this.cli.print(this.convertToCSV(events));
    }
  }

  // Helper methods
  async fetchEvents(limit = 100, sessionId = null) {
    const endpoint = sessionId 
      ? `/events/recent?limit=${limit}&session=${sessionId}`
      : `/events/recent?limit=${limit}`;
      
    const result = await this.cli.apiRequest('GET', endpoint);
    
    if (!result.success) {
      throw new Error(`Failed to fetch events: ${result.error}`);
    }
    
    return result.data || [];
  }

  parseFilters(filterString) {
    if (!filterString) return {};
    
    const filters = {};
    const pairs = filterString.split(',');
    
    pairs.forEach(pair => {
      const [key, value] = pair.split(':');
      if (key && value) {
        filters[key.trim()] = value.trim();
      }
    });
    
    return filters;
  }

  applyFilters(events, filters) {
    return events.filter(event => {
      for (const [key, value] of Object.entries(filters)) {
        if (event[key] !== value) {
          return false;
        }
      }
      return true;
    });
  }

  getEventTypeColor(eventType) {
    const colorMap = {
      'SessionStart': 'green',
      'SessionEnd': 'blue',
      'SubagentStart': 'cyan',
      'SubagentStop': 'magenta',
      'ToolUse': 'yellow',
      'PreCompact': 'red',
      'PostToolUse': 'gray'
    };

    return colorMap[eventType] || 'white';
  }

  convertToCSV(events) {
    if (!events || events.length === 0) return '';

    const headers = ['id', 'source_app', 'session_id', 'hook_event_type', 'timestamp'];
    const csvRows = [headers.join(',')];

    events.forEach(event => {
      const row = headers.map(header => {
        const value = event[header];
        if (header === 'timestamp' && value) {
          return new Date(value).toISOString();
        }
        return value || '';
      });
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }
}