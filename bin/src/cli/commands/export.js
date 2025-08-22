/**
 * Export Command
 * Export system data in various formats (JSON, CSV, YAML)
 */

import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import yaml from 'yaml';
import { createObjectCsvWriter } from 'csv-writer';

export class ExportCommand {
  constructor(cli) {
    this.cli = cli;
  }

  async execute(options = {}) {
    const type = options.type || 'events';
    const format = options.format || 'json';
    const outputFile = options.output;
    const limit = parseInt(options.limit) || 1000;

    const spinner = this.cli.createSpinner(`Exporting ${type} data...`);
    spinner.start();

    try {
      const data = await this.fetchDataByType(type, options);
      const formattedData = await this.formatData(data, format, type);
      
      spinner.stop();

      if (outputFile) {
        await this.writeToFile(formattedData, outputFile, format);
        this.cli.printSuccess(`Data exported to ${outputFile}`);
      } else {
        this.cli.print(formattedData);
      }

    } catch (error) {
      spinner.stop();
      this.cli.printError(`Export failed: ${error.message}`);
    }
  }

  async fetchDataByType(type, options) {
    const limit = parseInt(options.limit) || 1000;
    const startTime = this.parseTimestamp(options.start);
    const endTime = this.parseTimestamp(options.end);

    switch (type) {
      case 'events':
        return await this.fetchEvents(limit, startTime, endTime);
      
      case 'agents':
        return await this.fetchAgents(limit, startTime, endTime);
      
      case 'sessions':
        return await this.fetchSessions(limit, startTime, endTime);
      
      case 'themes':
        return await this.fetchThemes(limit);
      
      case 'system':
        return await this.fetchSystemData();
      
      default:
        throw new Error(`Unknown data type: ${type}`);
    }
  }

  async fetchEvents(limit, startTime, endTime) {
    const result = await this.cli.apiRequest('GET', `/events/recent?limit=${limit}`);
    
    if (!result.success) {
      throw new Error(`Failed to fetch events: ${result.error}`);
    }

    let events = result.data || [];

    // Apply time filters if provided
    if (startTime || endTime) {
      events = events.filter(event => {
        const eventTime = event.timestamp || 0;
        if (startTime && eventTime < startTime) return false;
        if (endTime && eventTime > endTime) return false;
        return true;
      });
    }

    return {
      type: 'events',
      count: events.length,
      data: events,
      exported_at: new Date().toISOString(),
      filters: {
        limit,
        start_time: startTime ? new Date(startTime).toISOString() : null,
        end_time: endTime ? new Date(endTime).toISOString() : null
      }
    };
  }

  async fetchAgents(limit, startTime, endTime) {
    const [terminalStatus, metrics, distribution, timeline] = await Promise.all([
      this.cli.apiRequest('GET', '/api/terminal/status'),
      this.cli.apiRequest('GET', '/api/agents/metrics/current'),
      this.cli.apiRequest('GET', '/api/agents/types/distribution'),
      this.cli.apiRequest('GET', '/api/agents/metrics/timeline?hours=24')
    ]);

    return {
      type: 'agents',
      active_agents: terminalStatus.success ? terminalStatus.data?.active_agents || [] : [],
      metrics: metrics.success ? metrics.data : {},
      distribution: distribution.success ? distribution.data : {},
      timeline: timeline.success ? timeline.data : {},
      exported_at: new Date().toISOString()
    };
  }

  async fetchSessions(limit, startTime, endTime) {
    const [events, relationshipStats] = await Promise.all([
      this.cli.apiRequest('GET', `/events/recent?limit=${limit * 2}`),
      this.cli.apiRequest('GET', '/api/relationships/stats')
    ]);

    let sessions = [];
    
    if (events.success) {
      // Group events by session to create session objects
      const sessionMap = new Map();
      
      (events.data || []).forEach(event => {
        const sessionId = event.session_id;
        if (!sessionMap.has(sessionId)) {
          sessionMap.set(sessionId, {
            session_id: sessionId,
            source_app: event.source_app,
            first_event: event.timestamp,
            last_event: event.timestamp,
            event_count: 0,
            events: []
          });
        }
        
        const session = sessionMap.get(sessionId);
        session.event_count++;
        session.events.push(event);
        session.last_event = Math.max(session.last_event, event.timestamp);
        session.first_event = Math.min(session.first_event, event.timestamp);
        session.duration_ms = session.last_event - session.first_event;
      });

      sessions = Array.from(sessionMap.values())
        .sort((a, b) => b.last_event - a.first_event)
        .slice(0, limit);
    }

    return {
      type: 'sessions',
      count: sessions.length,
      sessions: sessions,
      relationship_stats: relationshipStats.success ? relationshipStats.data : {},
      exported_at: new Date().toISOString()
    };
  }

  async fetchThemes(limit) {
    const result = await this.cli.apiRequest('GET', `/api/themes?limit=${limit}`);
    
    if (!result.success) {
      throw new Error(`Failed to fetch themes: ${result.error}`);
    }

    return {
      type: 'themes',
      count: result.data?.themes?.length || 0,
      themes: result.data?.themes || [],
      stats: result.data?.stats || {},
      exported_at: new Date().toISOString()
    };
  }

  async fetchSystemData() {
    const [health, hookCoverage, fallbackStatus] = await Promise.all([
      this.cli.apiRequest('GET', '/api/fallback/health'),
      this.cli.apiRequest('GET', '/api/hooks/coverage'),
      this.cli.apiRequest('GET', '/api/fallback/status')
    ]);

    return {
      type: 'system',
      health: health.success ? health.data : {},
      hook_coverage: hookCoverage.success ? hookCoverage.data : {},
      fallback_status: fallbackStatus.success ? fallbackStatus.data : {},
      system_info: {
        platform: process.platform,
        node_version: process.version,
        architecture: process.arch
      },
      exported_at: new Date().toISOString()
    };
  }

  async formatData(data, format, type) {
    switch (format.toLowerCase()) {
      case 'json':
        return JSON.stringify(data, null, 2);
      
      case 'yaml':
      case 'yml':
        return yaml.stringify(data);
      
      case 'csv':
        return await this.convertToCSV(data, type);
      
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  async convertToCSV(data, type) {
    switch (type) {
      case 'events':
        return this.eventsToCSV(data.data || []);
      
      case 'agents':
        return this.agentsToCSV(data.active_agents || []);
      
      case 'sessions':
        return this.sessionsToCSV(data.sessions || []);
      
      case 'themes':
        return this.themesToCSV(data.themes || []);
      
      default:
        // For complex objects, flatten to key-value pairs
        return this.objectToCSV(data);
    }
  }

  eventsToCSV(events) {
    if (!events || events.length === 0) {
      return 'No events to export';
    }

    const headers = [
      'id', 'source_app', 'session_id', 'hook_event_type', 
      'timestamp', 'parent_session_id', 'session_depth'
    ];

    const csvData = events.map(event => ({
      id: event.id || '',
      source_app: event.source_app || '',
      session_id: event.session_id || '',
      hook_event_type: event.hook_event_type || '',
      timestamp: event.timestamp ? new Date(event.timestamp).toISOString() : '',
      parent_session_id: event.parent_session_id || '',
      session_depth: event.session_depth || ''
    }));

    return this.arrayToCSV(csvData, headers);
  }

  agentsToCSV(agents) {
    if (!agents || agents.length === 0) {
      return 'No agents to export';
    }

    const headers = [
      'agent_id', 'agent_name', 'agent_type', 'status', 
      'start_time', 'duration_ms', 'session_id', 'source_app'
    ];

    const csvData = agents.map(agent => ({
      agent_id: agent.agent_id || '',
      agent_name: agent.agent_name || '',
      agent_type: agent.agent_type || '',
      status: agent.status || '',
      start_time: agent.start_time ? new Date(agent.start_time).toISOString() : '',
      duration_ms: agent.duration_ms || '',
      session_id: agent.session_id || '',
      source_app: agent.source_app || ''
    }));

    return this.arrayToCSV(csvData, headers);
  }

  sessionsToCSV(sessions) {
    if (!sessions || sessions.length === 0) {
      return 'No sessions to export';
    }

    const headers = [
      'session_id', 'source_app', 'event_count', 'duration_ms',
      'first_event', 'last_event'
    ];

    const csvData = sessions.map(session => ({
      session_id: session.session_id || '',
      source_app: session.source_app || '',
      event_count: session.event_count || 0,
      duration_ms: session.duration_ms || 0,
      first_event: session.first_event ? new Date(session.first_event).toISOString() : '',
      last_event: session.last_event ? new Date(session.last_event).toISOString() : ''
    }));

    return this.arrayToCSV(csvData, headers);
  }

  themesToCSV(themes) {
    if (!themes || themes.length === 0) {
      return 'No themes to export';
    }

    const headers = [
      'id', 'name', 'displayName', 'description', 'isPublic',
      'authorId', 'authorName', 'createdAt', 'updatedAt'
    ];

    const csvData = themes.map(theme => ({
      id: theme.id || '',
      name: theme.name || '',
      displayName: theme.displayName || '',
      description: theme.description || '',
      isPublic: theme.isPublic || false,
      authorId: theme.authorId || '',
      authorName: theme.authorName || '',
      createdAt: theme.createdAt ? new Date(theme.createdAt).toISOString() : '',
      updatedAt: theme.updatedAt ? new Date(theme.updatedAt).toISOString() : ''
    }));

    return this.arrayToCSV(csvData, headers);
  }

  objectToCSV(obj) {
    const flatten = (obj, prefix = '') => {
      const flattened = {};
      
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const value = obj[key];
          const newKey = prefix ? `${prefix}.${key}` : key;
          
          if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            Object.assign(flattened, flatten(value, newKey));
          } else {
            flattened[newKey] = value;
          }
        }
      }
      
      return flattened;
    };

    const flattened = flatten(obj);
    const headers = ['key', 'value'];
    const csvData = Object.entries(flattened).map(([key, value]) => ({
      key,
      value: typeof value === 'object' ? JSON.stringify(value) : String(value)
    }));

    return this.arrayToCSV(csvData, headers);
  }

  arrayToCSV(data, headers) {
    if (!data || data.length === 0) {
      return headers.join(',') + '\n';
    }

    const csvRows = [headers.join(',')];

    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        
        // Handle null/undefined values
        if (value === null || value === undefined) {
          return '';
        }
        
        // Convert to string and escape quotes/commas
        let stringValue = String(value);
        
        // If the value contains comma, quote, or newline, wrap in quotes and escape quotes
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          stringValue = '"' + stringValue.replace(/"/g, '""') + '"';
        }
        
        return stringValue;
      });
      
      csvRows.push(values.join(','));
    });

    return csvRows.join('\n');
  }

  async writeToFile(data, outputFile, format) {
    try {
      // Ensure directory exists
      const dir = path.dirname(outputFile);
      await fs.mkdir(dir, { recursive: true });
      
      // Write file
      await fs.writeFile(outputFile, data, 'utf8');
      
    } catch (error) {
      throw new Error(`Failed to write file: ${error.message}`);
    }
  }

  parseTimestamp(timestamp) {
    if (!timestamp) return null;
    
    // If it's already a number (Unix timestamp)
    if (/^\d+$/.test(timestamp)) {
      const num = parseInt(timestamp);
      // If it looks like Unix timestamp in seconds, convert to milliseconds
      return num < 1e12 ? num * 1000 : num;
    }
    
    // Try to parse as ISO string
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid timestamp format: ${timestamp}`);
    }
    
    return date.getTime();
  }
}