/**
 * Logger utility for CLI
 * Handles different log levels and output formatting
 */

import chalk from 'chalk';

export class Logger {
  constructor() {
    this.config = {
      verbose: false,
      useColor: true
    };
  }

  configure(config) {
    this.config = { ...this.config, ...config };
  }

  debug(message) {
    if (this.config.verbose) {
      const timestamp = new Date().toISOString();
      const prefix = this.config.useColor ? chalk.gray(`[${timestamp}] DEBUG:`) : `[${timestamp}] DEBUG:`;
      console.error(`${prefix} ${message}`);
    }
  }

  info(message) {
    const timestamp = new Date().toISOString();
    const prefix = this.config.useColor ? chalk.blue(`[${timestamp}] INFO:`) : `[${timestamp}] INFO:`;
    console.log(`${prefix} ${message}`);
  }

  warn(message) {
    const timestamp = new Date().toISOString();
    const prefix = this.config.useColor ? chalk.yellow(`[${timestamp}] WARN:`) : `[${timestamp}] WARN:`;
    console.warn(`${prefix} ${message}`);
  }

  error(message) {
    const timestamp = new Date().toISOString();
    const prefix = this.config.useColor ? chalk.red(`[${timestamp}] ERROR:`) : `[${timestamp}] ERROR:`;
    console.error(`${prefix} ${message}`);
  }

  success(message) {
    const timestamp = new Date().toISOString();
    const prefix = this.config.useColor ? chalk.green(`[${timestamp}] SUCCESS:`) : `[${timestamp}] SUCCESS:`;
    console.log(`${prefix} ${message}`);
  }
}