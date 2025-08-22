/**
 * Sessions Command
 * Manage and view session relationships and metrics
 */

import chalk from 'chalk';
import inquirer from 'inquirer';

export class SessionsCommand {
  constructor(cli) {
    this.cli = cli;
  }

  async execute(options = {}) {
    // If specific options provided, handle them directly
    if (options.tree) {
      await this.showSessionTree(options.tree);
      return;
    }

    if (options.relationships) {
      await this.showSessionRelationships(options.relationships);
      return;
    }

    if (options.stats) {
      await this.showSessionStats();
      return;
    }

    if (options.export) {
      await this.exportSessions(options);
      return;
    }

    // Otherwise show session list with interactive options
    await this.showSessionList(options);
  }

  async showSessionList(options = {}) {
    const spinner = this.cli.createSpinner('Fetching session data...');
    spinner.start();

    try {
      const limit = parseInt(options.limit) || 50;
      const sessions = await this.fetchRecentSessions(limit);
      
      spinner.stop();

      if (!sessions || sessions.length === 0) {
        this.cli.printWarning('No sessions found');
        return;
      }

      this.cli.print(chalk.bold.cyan('═════════════════════════════════════'));
      this.cli.print(chalk.bold.cyan('         Recent Sessions'));
      this.cli.print(chalk.bold.cyan('═════════════════════════════════════'));
      this.cli.print('');

      // Format sessions for display
      const tableData = sessions.map(session => ({
        'Session ID': session.session_id?.substring(0, 12) + '...' || 'N/A',
        'Source App': session.source_app || 'N/A',
        'Events': session.event_count || 0,
        'Duration': this.formatDuration(session.duration_ms),
        'Status': session.last_event_type || 'Active',
        'Started': this.formatTimestamp(session.first_timestamp)
      }));

      this.cli.print(this.cli.formatOutput(tableData, 'table'));

      // Offer interactive options
      await this.showInteractiveOptions(sessions);

    } catch (error) {
      spinner.stop();
      this.cli.printError(`Failed to fetch sessions: ${error.message}`);
    }
  }

  async showInteractiveOptions(sessions) {
    const choices = [
      { name: 'View session tree for specific session', value: 'tree' },
      { name: 'Show session relationships', value: 'relationships' },
      { name: 'Display session statistics', value: 'stats' },
      { name: 'Export session data', value: 'export' },
      { name: 'Refresh session list', value: 'refresh' },
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
      case 'tree':
        await this.selectSessionForTree(sessions);
        break;
      case 'relationships':
        await this.selectSessionForRelationships(sessions);
        break;
      case 'stats':
        await this.showSessionStats();
        break;
      case 'export':
        await this.interactiveExport();
        break;
      case 'refresh':
        await this.showSessionList();
        break;
      case 'exit':
        return;
    }
  }

  async selectSessionForTree(sessions) {
    const choices = sessions.map(session => ({
      name: `${session.session_id?.substring(0, 20)}... - ${session.source_app}`,
      value: session.session_id
    }));

    const { sessionId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'sessionId',
        message: 'Select session to view tree:',
        choices,
        pageSize: 10
      }
    ]);

    await this.showSessionTree(sessionId);
  }

  async selectSessionForRelationships(sessions) {
    const choices = sessions.map(session => ({
      name: `${session.session_id?.substring(0, 20)}... - ${session.source_app}`,
      value: session.session_id
    }));

    const { sessionId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'sessionId',
        message: 'Select session to view relationships:',
        choices,
        pageSize: 10
      }
    ]);

    await this.showSessionRelationships(sessionId);
  }

  async showSessionTree(sessionId) {
    const spinner = this.cli.createSpinner(`Building session tree for ${sessionId}...`);
    spinner.start();

    try {
      const result = await this.cli.apiRequest('GET', `/api/sessions/${sessionId}/tree?maxDepth=5`);
      spinner.stop();

      if (!result.success) {
        this.cli.printError(`Failed to fetch session tree: ${result.error}`);
        return;
      }

      this.cli.print('');
      this.cli.print(chalk.bold.green('🌳 Session Hierarchy Tree'));
      this.cli.print(chalk.gray('══════════════════════════'));
      this.cli.print('');

      if (result.data) {
        this.cli.print(this.cli.formatOutput(result.data, 'tree'));
      } else {
        this.cli.printWarning('No tree data available for this session');
      }

    } catch (error) {
      spinner.stop();
      this.cli.printError(`Failed to build session tree: ${error.message}`);
    }
  }

  async showSessionRelationships(sessionId) {
    const spinner = this.cli.createSpinner(`Fetching relationships for ${sessionId}...`);
    spinner.start();

    try {
      const result = await this.cli.apiRequest('GET', 
        `/api/sessions/${sessionId}/relationships?includeParent=true&includeChildren=true&includeSiblings=true`
      );
      
      spinner.stop();

      if (!result.success) {
        this.cli.printError(`Failed to fetch relationships: ${result.error}`);
        return;
      }

      this.cli.print('');
      this.cli.print(chalk.bold.blue('🔗 Session Relationships'));
      this.cli.print(chalk.gray('═══════════════════════════'));
      this.cli.print('');

      const relationships = result.data;
      
      if (relationships.parent) {
        this.cli.print(chalk.bold.yellow('Parent Session:'));
        this.displayRelationship(relationships.parent, 'parent');
        this.cli.print('');
      }

      if (relationships.children && relationships.children.length > 0) {
        this.cli.print(chalk.bold.green('Child Sessions:'));
        relationships.children.forEach(child => {
          this.displayRelationship(child, 'child');
        });
        this.cli.print('');
      }

      if (relationships.siblings && relationships.siblings.length > 0) {
        this.cli.print(chalk.bold.cyan('Sibling Sessions:'));
        relationships.siblings.forEach(sibling => {
          this.displayRelationship(sibling, 'sibling');
        });
        this.cli.print('');
      }

      if (!relationships.parent && (!relationships.children || relationships.children.length === 0) && (!relationships.siblings || relationships.siblings.length === 0)) {
        this.cli.printInfo('This session has no relationships');
      }

    } catch (error) {
      spinner.stop();
      this.cli.printError(`Failed to fetch relationships: ${error.message}`);
    }
  }

  displayRelationship(relationship, type) {
    const sessionId = type === 'parent' ? relationship.parent_session_id : relationship.child_session_id;
    const shortId = sessionId.substring(0, 12) + '...';
    const relationshipType = relationship.relationship_type || 'unknown';
    const spawnReason = relationship.spawn_reason || 'unknown';
    
    let statusIcon = '●';
    let statusColor = 'white';
    
    if (relationship.completed_at) {
      statusIcon = '✓';
      statusColor = 'green';
    } else {
      statusIcon = '⚡';
      statusColor = 'yellow';
    }

    this.cli.print(
      `  ${chalk[statusColor](statusIcon)} ${chalk.white(shortId)} ` +
      `${chalk.gray(`[${relationshipType}]`)} ` +
      `${chalk.cyan(spawnReason)} ` +
      `${chalk.gray(`depth: ${relationship.depth_level || 0}`)}`
    );

    if (relationship.spawn_metadata) {
      const metadata = relationship.spawn_metadata;
      if (metadata.task_description) {
        this.cli.print(`    ${chalk.gray('Task:')} ${metadata.task_description}`);
      }
      if (metadata.agent_name) {
        this.cli.print(`    ${chalk.gray('Agent:')} ${metadata.agent_name}`);
      }
    }
  }

  async showSessionStats() {
    const spinner = this.cli.createSpinner('Calculating session statistics...');
    spinner.start();

    try {
      const result = await this.cli.apiRequest('GET', '/api/relationships/stats');
      spinner.stop();

      if (!result.success) {
        this.cli.printError(`Failed to fetch statistics: ${result.error}`);
        return;
      }

      const stats = result.data;

      this.cli.print('');
      this.cli.print(chalk.bold.magenta('📊 Session Statistics'));
      this.cli.print(chalk.gray('════════════════════════'));
      this.cli.print('');

      // Overall Stats
      this.cli.print(chalk.bold.white('Overall Statistics:'));
      this.cli.print(`  Total Relationships: ${chalk.yellow(stats.totalRelationships || 0)}`);
      this.cli.print(`  Average Depth: ${chalk.cyan((stats.averageDepth || 0).toFixed(1))}`);
      this.cli.print(`  Maximum Depth: ${chalk.red(stats.maxDepth || 0)}`);
      this.cli.print(`  Completion Rate: ${chalk.green(Math.round((stats.completionRate || 0) * 100) + '%')}`);
      this.cli.print('');

      // Relationship Types
      if (stats.relationshipTypes && Object.keys(stats.relationshipTypes).length > 0) {
        this.cli.print(chalk.bold.white('Relationship Types:'));
        Object.entries(stats.relationshipTypes).forEach(([type, count]) => {
          this.cli.print(`  ${chalk.cyan(type)}: ${chalk.yellow(count)}`);
        });
        this.cli.print('');
      }

      // Spawn Reasons
      if (stats.spawnReasons && Object.keys(stats.spawnReasons).length > 0) {
        this.cli.print(chalk.bold.white('Spawn Reasons:'));
        Object.entries(stats.spawnReasons).forEach(([reason, count]) => {
          this.cli.print(`  ${chalk.cyan(reason)}: ${chalk.yellow(count)}`);
        });
        this.cli.print('');
      }

      // Delegation Types
      if (stats.delegationTypes && Object.keys(stats.delegationTypes).length > 0) {
        this.cli.print(chalk.bold.white('Delegation Types:'));
        Object.entries(stats.delegationTypes).forEach(([type, count]) => {
          this.cli.print(`  ${chalk.cyan(type)}: ${chalk.yellow(count)}`);
        });
      }

    } catch (error) {
      spinner.stop();
      this.cli.printError(`Failed to fetch statistics: ${error.message}`);
    }
  }

  async exportSessions(options) {
    const format = options.export || 'json';
    const limit = parseInt(options.limit) || 1000;

    const spinner = this.cli.createSpinner(`Exporting sessions in ${format} format...`);
    spinner.start();

    try {
      const sessions = await this.fetchRecentSessions(limit);
      const relationships = await this.fetchAllRelationships();
      
      const exportData = {
        sessions: sessions || [],
        relationships: relationships || [],
        exported_at: new Date().toISOString(),
        total_sessions: (sessions || []).length,
        total_relationships: (relationships || []).length
      };

      spinner.stop();

      if (format === 'json') {
        this.cli.print(JSON.stringify(exportData, null, 2));
      } else if (format === 'csv') {
        this.cli.print(this.convertToCSV(exportData.sessions));
      } else {
        this.cli.printError(`Unsupported export format: ${format}`);
      }

    } catch (error) {
      spinner.stop();
      this.cli.printError(`Failed to export sessions: ${error.message}`);
    }
  }

  async interactiveExport() {
    const { format, includeRelationships } = await inquirer.prompt([
      {
        type: 'list',
        name: 'format',
        message: 'Export format:',
        choices: ['json', 'csv']
      },
      {
        type: 'confirm',
        name: 'includeRelationships',
        message: 'Include relationship data?',
        default: true
      }
    ]);

    await this.exportSessions({ export: format, includeRelationships });
  }

  // Helper methods
  async fetchRecentSessions(limit = 50) {
    try {
      const result = await this.cli.apiRequest('GET', `/events/recent?limit=${limit * 2}`);
      if (!result.success) return [];

      // Group events by session
      const sessionMap = new Map();
      
      result.data.forEach(event => {
        const sessionId = event.session_id;
        if (!sessionMap.has(sessionId)) {
          sessionMap.set(sessionId, {
            session_id: sessionId,
            source_app: event.source_app,
            first_timestamp: event.timestamp,
            last_timestamp: event.timestamp,
            event_count: 0,
            events: [],
            last_event_type: event.hook_event_type
          });
        }
        
        const session = sessionMap.get(sessionId);
        session.event_count++;
        session.events.push(event);
        session.last_timestamp = Math.max(session.last_timestamp, event.timestamp);
        session.first_timestamp = Math.min(session.first_timestamp, event.timestamp);
        session.duration_ms = session.last_timestamp - session.first_timestamp;
      });

      return Array.from(sessionMap.values())
        .sort((a, b) => b.last_timestamp - a.last_timestamp)
        .slice(0, limit);
        
    } catch (error) {
      throw new Error(`Failed to fetch sessions: ${error.message}`);
    }
  }

  async fetchAllRelationships() {
    try {
      const result = await this.cli.apiRequest('GET', '/api/relationships/stats');
      return result.success ? result.data.relationships : [];
    } catch (error) {
      return [];
    }
  }

  formatDuration(durationMs) {
    if (!durationMs || durationMs < 0) return 'N/A';
    
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  formatTimestamp(timestamp) {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  }

  convertToCSV(data) {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvRows.push(values.join(','));
    });

    return csvRows.join('\n');
  }
}