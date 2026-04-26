/* eslint-disable no-console */
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

function getCurrentLevel(): LogLevel {
  if (typeof process === 'undefined' || typeof process.env === 'undefined') {
    return 'info';
  }
  const env = process.env.LOG_LEVEL?.toLowerCase();
  if (env && env in LOG_LEVELS) return env as LogLevel;
  return process.env.NODE_ENV === 'production' ? 'warn' : 'debug';
}

function formatMessage(level: LogLevel, label: string, args: unknown[]): unknown[] {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  if (label) {
    return [prefix, `[${label}]`, ...args];
  }
  return [prefix, ...args];
}

class Logger {
  private level: LogLevel;
  private label: string;

  constructor(label = '') {
    this.level = getCurrentLevel();
    this.label = label;
  }

  withLabel(label: string): Logger {
    return new Logger(label);
  }

  debug(...args: unknown[]): void {
    if (LOG_LEVELS[this.level] <= LOG_LEVELS.debug) {
      console.debug(...formatMessage('debug', this.label, args));
    }
  }

  info(...args: unknown[]): void {
    if (LOG_LEVELS[this.level] <= LOG_LEVELS.info) {
      console.info(...formatMessage('info', this.label, args));
    }
  }

  warn(...args: unknown[]): void {
    if (LOG_LEVELS[this.level] <= LOG_LEVELS.warn) {
      console.warn(...formatMessage('warn', this.label, args));
    }
  }

  error(...args: unknown[]): void {
    if (LOG_LEVELS[this.level] <= LOG_LEVELS.error) {
      console.error(...formatMessage('error', this.label, args));
    }
  }
}

const logger = new Logger();

export { Logger,logger };
export type { LogLevel };
