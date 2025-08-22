/**
 * Core CLI Framework
 * Handles configuration, API communication, and command orchestration
 */

import chalk from 'chalk';
import axios from 'axios';
import WebSocket from 'ws';
import ora from 'ora';
import { StatusCommand } from './commands/status.js';
import { SessionsCommand } from './commands/sessions.js';
import { AgentsCommand } from './commands/agents.js';
import { ExportCommand } from './commands/export.js';
import { ConfigCommand } from './commands/config.js';
import { MonitorCommand } from './commands/monitor.js';
import { EventsCommand } from './commands/events.js';
import { ThemesCommand } from './commands/themes.js';
import { HandoffsCommand } from './commands/handoffs.js';
import { HelpCommand } from './commands/help.js';
import { Logger } from '../utils/logger.js';
import { Formatter } from '../utils/formatter.js';

export class CLI {
  constructor() {
    this.config = {
      serverUrl: 'http://localhost:4000',
      verbose: false,
      useColor: true,
      jsonOutput: false
    };
    
    this.logger = new Logger();
    this.formatter = new Formatter();
    this.ws = null;
    this.wsConnected = false;
    
    // Initialize commands
    this.commands = {
      status: new StatusCommand(this),
      sessions: new SessionsCommand(this),
      agents: new AgentsCommand(this),
      export: new ExportCommand(this),
      config: new ConfigCommand(this),
      monitor: new MonitorCommand(this),
      events: new EventsCommand(this),
      themes: new ThemesCommand(this),
      handoffs: new HandoffsCommand(this),
      helpInteractive: new HelpCommand(this)
    };
  }

  /**
   * Configure CLI with options
   */
  configure(options) {
    this.config = { ...this.config, ...options };
    this.logger.configure(this.config);
    this.formatter.configure(this.config);
    
    // Configure chalk
    if (!this.config.useColor) {
      chalk.level = 0;
    }
  }

  /**
   * Get API client configured with current settings
   */
  getApiClient() {
    return axios.create({
      baseURL: this.config.serverUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Make API request with error handling
   */
  async apiRequest(method, endpoint, data = null, options = {}) {
    try {
      const client = this.getApiClient();
      const config = {
        method,
        url: endpoint,
        ...options
      };
      
      if (data) {
        config.data = data;
      }
      
      this.logger.debug(`API Request: ${method.toUpperCase()} ${endpoint}`);
      const response = await client(config);
      
      return {
        success: true,
        data: response.data,
        status: response.status
      };
    } catch (error) {
      this.logger.debug(`API Error: ${error.message}`);
      
      if (error.response) {
        return {
          success: false,
          error: error.response.data?.error || error.message,
          status: error.response.status,
          data: error.response.data
        };
      } else if (error.request) {
        return {
          success: false,
          error: 'Server not reachable. Check if server is running.',
          status: 0
        };
      } else {
        return {
          success: false,
          error: error.message,
          status: 0
        };
      }
    }
  }

  /**
   * Connect to WebSocket for real-time updates
   */
  async connectWebSocket() {
    if (this.ws && this.wsConnected) {
      return this.ws;
    }

    try {
      const wsUrl = this.config.serverUrl.replace(/^http/, 'ws') + '/stream';
      this.logger.debug(`Connecting to WebSocket: ${wsUrl}`);
      
      this.ws = new WebSocket(wsUrl);
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'));
        }, 5000);

        this.ws.on('open', () => {
          clearTimeout(timeout);
          this.wsConnected = true;
          this.logger.debug('WebSocket connected');
          resolve(this.ws);
        });

        this.ws.on('error', (error) => {
          clearTimeout(timeout);
          this.logger.debug(`WebSocket error: ${error.message}`);
          reject(error);
        });

        this.ws.on('close', () => {
          this.wsConnected = false;
          this.logger.debug('WebSocket disconnected');
        });
      });
    } catch (error) {
      this.logger.debug(`WebSocket connection failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnectWebSocket() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.wsConnected = false;
    }
  }

  /**
   * Test server connectivity
   */
  async testConnectivity() {
    const result = await this.apiRequest('GET', '/api/fallback/health');
    return result;
  }

  /**
   * Format output based on configuration
   */
  formatOutput(data, format = 'table') {
    if (this.config.jsonOutput) {
      return JSON.stringify(data, null, 2);
    }
    
    return this.formatter.format(data, format);
  }

  /**
   * Print output with optional color
   */
  print(message, color = null) {
    if (color && this.config.useColor) {
      console.log(chalk[color](message));
    } else {
      console.log(message);
    }
  }

  /**
   * Print error message
   */
  printError(message) {
    if (this.config.useColor) {
      console.error(chalk.red('✗ ' + message));
    } else {
      console.error('ERROR: ' + message);
    }
  }

  /**
   * Print success message
   */
  printSuccess(message) {
    if (this.config.useColor) {
      console.log(chalk.green('✓ ' + message));
    } else {
      console.log('SUCCESS: ' + message);
    }
  }

  /**
   * Print warning message
   */
  printWarning(message) {
    if (this.config.useColor) {
      console.log(chalk.yellow('⚠ ' + message));
    } else {
      console.log('WARNING: ' + message);
    }
  }

  /**
   * Print info message
   */
  printInfo(message) {
    if (this.config.useColor) {
      console.log(chalk.blue('ℹ ' + message));
    } else {
      console.log('INFO: ' + message);
    }
  }

  /**
   * Create loading spinner
   */
  createSpinner(text, color = 'cyan') {
    return ora({
      text,
      color: this.config.useColor ? color : undefined,
      spinner: 'dots'
    });
  }

  /**
   * Handle graceful shutdown
   */
  async shutdown() {
    this.logger.debug('Shutting down CLI...');
    this.disconnectWebSocket();
  }
}