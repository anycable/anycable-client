import { BaseLogger, LogLevel } from '../index.js'

type LogEntry = {
  level: string
  message: string
  details?: object
}

export class TestLogger extends BaseLogger {
  logs: LogEntry[]

  constructor(level?: LogLevel) {
    super(level)
    this.logs = []
  }

  get infos() {
    return this.logs.filter(log => log.level === 'info')
  }

  get errors() {
    return this.logs.filter(log => log.level === 'error')
  }

  get warnings() {
    return this.logs.filter(log => log.level === 'warn')
  }

  writeLogEntry(level: string, message: string, details: object) {
    this.logs.push({ level, message, details })
  }
}
