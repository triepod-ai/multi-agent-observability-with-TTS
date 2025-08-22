/**
 * Formatter utility for CLI output
 * Handles tables, JSON, CSV, and other output formats
 */

import chalk from 'chalk';
import { table } from 'table';
import moment from 'moment';

export class Formatter {
  constructor() {
    this.config = {
      useColor: true,
      jsonOutput: false
    };
  }

  configure(config) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Format data based on type and configuration
   */
  format(data, format = 'table') {
    if (this.config.jsonOutput) {
      return JSON.stringify(data, null, 2);
    }

    switch (format) {
      case 'table':
        return this.formatTable(data);
      case 'list':
        return this.formatList(data);
      case 'tree':
        return this.formatTree(data);
      case 'status':
        return this.formatStatus(data);
      case 'metrics':
        return this.formatMetrics(data);
      default:
        return JSON.stringify(data, null, 2);
    }
  }

  /**
   * Format data as a table
   */
  formatTable(data) {
    if (!Array.isArray(data) || data.length === 0) {
      return this.colorize('No data available', 'gray');
    }

    const headers = Object.keys(data[0]);
    const rows = [headers];

    data.forEach(item => {
      const row = headers.map(header => {
        const value = item[header];
        return this.formatValue(value);
      });
      rows.push(row);
    });

    const config = {
      border: {
        topBody: this.config.useColor ? chalk.gray('─') : '-',
        topJoin: this.config.useColor ? chalk.gray('┬') : '+',
        topLeft: this.config.useColor ? chalk.gray('┌') : '+',
        topRight: this.config.useColor ? chalk.gray('┐') : '+',
        bottomBody: this.config.useColor ? chalk.gray('─') : '-',
        bottomJoin: this.config.useColor ? chalk.gray('┴') : '+',
        bottomLeft: this.config.useColor ? chalk.gray('└') : '+',
        bottomRight: this.config.useColor ? chalk.gray('┘') : '+',
        bodyLeft: this.config.useColor ? chalk.gray('│') : '|',
        bodyRight: this.config.useColor ? chalk.gray('│') : '|',
        bodyJoin: this.config.useColor ? chalk.gray('│') : '|',
        joinBody: this.config.useColor ? chalk.gray('─') : '-',
        joinLeft: this.config.useColor ? chalk.gray('├') : '+',
        joinRight: this.config.useColor ? chalk.gray('┤') : '+',
        joinJoin: this.config.useColor ? chalk.gray('┼') : '+',
      },
      drawHorizontalLine: (index, size) => {
        return index === 0 || index === 1 || index === size;
      }
    };

    // Color headers
    if (this.config.useColor) {
      rows[0] = rows[0].map(header => chalk.bold.cyan(header));
    }

    return table(rows, config);
  }

  /**
   * Format data as a list
   */
  formatList(data) {
    if (!Array.isArray(data)) {
      data = [data];
    }

    return data.map((item, index) => {
      const lines = [`${this.colorize(`[${index + 1}]`, 'cyan')} ${this.colorize(item.name || item.id || 'Item', 'white')}`];
      
      Object.entries(item).forEach(([key, value]) => {
        if (key !== 'name' && key !== 'id') {
          lines.push(`  ${this.colorize(key + ':', 'gray')} ${this.formatValue(value)}`);
        }
      });
      
      return lines.join('\n');
    }).join('\n\n');
  }

  /**
   * Format data as a tree structure
   */
  formatTree(data, level = 0, isLast = true) {
    const indent = '  '.repeat(level);
    const prefix = level === 0 ? '' : (isLast ? '└── ' : '├── ');
    const name = data.session_id || data.name || data.id || 'Node';
    
    let result = `${indent}${prefix}${this.colorize(name, 'cyan')}`;
    
    // Add additional info
    if (data.status) {
      const statusColor = this.getStatusColor(data.status);
      result += ` ${this.colorize(`[${data.status}]`, statusColor)}`;
    }
    
    if (data.agent_count) {
      result += ` ${this.colorize(`(${data.agent_count} agents)`, 'gray')}`;
    }
    
    if (data.duration_ms) {
      result += ` ${this.colorize(`${data.duration_ms}ms`, 'yellow')}`;
    }
    
    result += '\n';
    
    // Process children
    if (data.children && Array.isArray(data.children)) {
      data.children.forEach((child, index) => {
        const isLastChild = index === data.children.length - 1;
        result += this.formatTree(child, level + 1, isLastChild);
      });
    }
    
    return result;
  }

  /**
   * Format status information
   */
  formatStatus(data) {
    const sections = [];
    
    // System Status
    if (data.system) {
      sections.push(this.formatStatusSection('System Status', data.system));
    }
    
    // Active Agents
    if (data.agents) {
      sections.push(this.formatStatusSection('Active Agents', data.agents));
    }
    
    // Recent Events
    if (data.events) {
      sections.push(this.formatStatusSection('Recent Events', data.events));
    }
    
    return sections.join('\n\n');
  }

  /**
   * Format metrics data
   */
  formatMetrics(data) {
    const sections = [];
    
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        sections.push(this.formatMetricsSection(key, value));
      }
    });
    
    return sections.join('\n\n');
  }

  /**
   * Format a status section
   */
  formatStatusSection(title, data) {
    const lines = [this.colorize(`═══ ${title} ═══`, 'cyan')];
    
    if (Array.isArray(data)) {
      data.forEach(item => {
        lines.push(`• ${this.formatValue(item)}`);
      });
    } else if (typeof data === 'object') {
      Object.entries(data).forEach(([key, value]) => {
        lines.push(`${this.colorize(key + ':', 'gray')} ${this.formatValue(value)}`);
      });
    } else {
      lines.push(this.formatValue(data));
    }
    
    return lines.join('\n');
  }

  /**
   * Format a metrics section
   */
  formatMetricsSection(title, data) {
    const lines = [this.colorize(`── ${title.toUpperCase()} ──`, 'yellow')];
    
    Object.entries(data).forEach(([key, value]) => {
      lines.push(`${this.colorize(key + ':', 'gray')} ${this.formatValue(value)}`);
    });
    
    return lines.join('\n');
  }

  /**
   * Format individual values based on type
   */
  formatValue(value) {
    if (value === null || value === undefined) {
      return this.colorize('null', 'gray');
    }
    
    if (typeof value === 'boolean') {
      return this.colorize(value.toString(), value ? 'green' : 'red');
    }
    
    if (typeof value === 'number') {
      if (value > 1000000) {
        return this.colorize(`${(value / 1000000).toFixed(1)}M`, 'yellow');
      } else if (value > 1000) {
        return this.colorize(`${(value / 1000).toFixed(1)}K`, 'yellow');
      }
      return this.colorize(value.toString(), 'yellow');
    }
    
    if (typeof value === 'string') {
      // Check if it's a timestamp
      if (/^\d{10,13}$/.test(value)) {
        const timestamp = parseInt(value);
        return this.colorize(moment(timestamp).format('YYYY-MM-DD HH:mm:ss'), 'cyan');
      }
      
      // Check if it's a status
      if (['active', 'inactive', 'success', 'failed', 'complete', 'pending'].includes(value.toLowerCase())) {
        const color = this.getStatusColor(value);
        return this.colorize(value, color);
      }
      
      return value;
    }
    
    if (Array.isArray(value)) {
      return `[${value.length} items]`;
    }
    
    if (typeof value === 'object') {
      return '[object]';
    }
    
    return value.toString();
  }

  /**
   * Get color for status values
   */
  getStatusColor(status) {
    const statusLower = status.toLowerCase();
    
    if (['active', 'success', 'complete', 'online', 'connected'].includes(statusLower)) {
      return 'green';
    }
    
    if (['inactive', 'failed', 'error', 'offline', 'disconnected'].includes(statusLower)) {
      return 'red';
    }
    
    if (['pending', 'loading', 'connecting'].includes(statusLower)) {
      return 'yellow';
    }
    
    return 'white';
  }

  /**
   * Apply color if enabled
   */
  colorize(text, color) {
    if (!this.config.useColor) {
      return text;
    }
    
    if (typeof chalk[color] === 'function') {
      return chalk[color](text);
    }
    
    return text;
  }

  /**
   * Create a progress bar
   */
  progressBar(current, total, width = 20, char = '█') {
    const percentage = Math.min(current / total, 1);
    const filled = Math.floor(percentage * width);
    const empty = width - filled;
    
    const bar = char.repeat(filled) + ' '.repeat(empty);
    const percent = Math.floor(percentage * 100);
    
    if (this.config.useColor) {
      return `${chalk.gray('[')}${chalk.green(bar)}${chalk.gray(']')} ${chalk.yellow(percent + '%')}`;
    }
    
    return `[${bar}] ${percent}%`;
  }

  /**
   * Create a horizontal divider
   */
  divider(char = '─', length = 50) {
    return this.colorize(char.repeat(length), 'gray');
  }
}