type LogLevel = 'info' | 'warn' | 'error' | 'debug'

export interface Logger {
  set level(level: LogLevel)
  get level(): LogLevel

  log(level: LogLevel, message: string, details?: object): void

  info(message: string, details?: object): void
  warn(message: string, details?: object): void
  error(message: string, details?: object): void
  debug(message: string, details?: object): void
}

export class BaseLogger implements Logger {
  level: LogLevel

  constructor(level?: LogLevel)

  log(level: LogLevel, message: string, details?: object): void

  info(message: string, details?: object): void
  warn(message: string, details?: object): void
  error(message: string, details?: object): void
  debug(message: string, details?: object): void

  protected writeLogEntry(
    level: LogLevel,
    message: string,
    details?: object
  ): void
}

export class NoopLogger extends BaseLogger {}
