import { BaseLogger, LogLevel } from '@anycable/core'

export class Logger extends BaseLogger {
  writeLogEntry(level: LogLevel, message: string, details?: object): void
}
