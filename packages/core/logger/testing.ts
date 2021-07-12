import { BaseLogger } from './index.js'

type LogEntry = {
  level: string
  message: string
  details?: object
}

export class TestLogger extends BaseLogger {
  logs: LogEntry[]

  constructor() {
    super()
    this.logs = []
  }

  get errors() {
    return this.logs.filter(log => log.level == 'error')
  }

  get warings() {
    return this.logs.filter(log => log.level == 'warn')
  }

  writeLogEntry(level: string, message: string, details: object) {
    this.logs.push({ level, message, details })
  }
}
