import { Logger, LogLevel } from './types.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

export class ConsoleLogger implements Logger {
  private level: LogLevel;
  private logFilePath: string;
  private isLoggingDisabled: boolean;
  private fallbackAttempted: boolean = false;

  constructor(levelString: string = 'info') {
    this.level = this.parseLogLevel(levelString);
    this.isLoggingDisabled = process.env.DISABLE_LOGGING === 'true';
    this.logFilePath = this.getLogFilePath();

    if (!this.isLoggingDisabled) {
      this.ensureLogDirectory(this.logFilePath);
    }
  }

  private parseLogLevel(levelString: string): LogLevel {
    switch (levelString.toLowerCase()) {
      case 'error': return LogLevel.ERROR;
      case 'warn': return LogLevel.WARN;
      case 'info': return LogLevel.INFO;
      case 'debug': return LogLevel.DEBUG;
      default: return LogLevel.INFO;
    }
  }

  private getLogFilePath(): string {
    // 1. Prüfe ENV-Variable LOG_FILE
    if (process.env.LOG_FILE) {
      return process.env.LOG_FILE;
    }

    // 2. Standard: ~/.wordpress-mcp/server.log
    const homeDir = os.homedir();
    return path.join(homeDir, '.wordpress-mcp', 'server.log');
  }

  private ensureLogDirectory(logFilePath: string): void {
    try {
      const dirPath = path.dirname(logFilePath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    } catch (error) {
      // Silent fail - wird in writeToFile gefangen
    }
  }

  private writeToFile(message: string): void {
    if (this.isLoggingDisabled) {
      return;
    }

    try {
      fs.appendFileSync(this.logFilePath, message + '\n', 'utf8');
    } catch (error) {
      // Fallback nur beim ersten Fehler
      if (!this.fallbackAttempted) {
        this.fallbackAttempted = true;
        this.logFilePath = '/tmp/wordpress-mcp-server.log';

        try {
          fs.appendFileSync(this.logFilePath, message + '\n', 'utf8');
        } catch {
          // Silent fail - Logging ist nicht kritisch
        }
      }
    }
  }

  private formatMessage(level: string, message: string, ...args: unknown[]): string {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.length > 0 ? ` ${JSON.stringify(args)}` : '';
    return `[${timestamp}] ${level}: ${message}${formattedArgs}`;
  }

  error(message: string, ...args: unknown[]): void {
    if (this.level >= LogLevel.ERROR) {
      this.writeToFile(this.formatMessage('ERROR', message, ...args));
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.level >= LogLevel.WARN) {
      this.writeToFile(this.formatMessage('WARN', message, ...args));
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.level >= LogLevel.INFO) {
      this.writeToFile(this.formatMessage('INFO', message, ...args));
    }
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.level >= LogLevel.DEBUG) {
      this.writeToFile(this.formatMessage('DEBUG', message, ...args));
    }
  }
}
