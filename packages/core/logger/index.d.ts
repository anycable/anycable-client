type LogLevel = 'info' | 'warn' | 'error' | 'debug'

export interface Logger {
  set level(level: LogLevel): void
  get level(): LogLevel

  log(level: LogLevel, ...args: object): void

  info(...args: object): void
  warn(...args: object): void
  error(...args: object): void
  debug(...args: object): void
}

export class BaseLogger implements Logger {
  level: LogLevel

  log(level: LogLevel, ...args: object): void

  info(...args: object): void
  warn(...args: object): void
  error(...args: object): void
  debug(...args: object): void

  protected writeLogEntry(level: LogLevel, ...args: object): void
}

export class NoopLogger extends BaseLogger {}
