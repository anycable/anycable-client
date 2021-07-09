const LEVEL_TO_NAME = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
}

export class BaseLogger {
  constructor(level) {
    this.level = level || 'info'
  }

  log(level, ...args) {
    if (LEVEL_TO_NAME[level] < LEVEL_TO_NAME[this.level]) return

    this.writeLogEntry(level, ...args)
  }

  writeLogEntry() {
    throw Error('Not implemented')
  }

  debug(...args) {
    this.log('debug', ...args)
  }

  info(...args) {
    this.log('info', ...args)
  }

  warn(...args) {
    this.log('warn', ...args)
  }

  error(...args) {
    this.log('error', ...args)
  }
}

export class NoopLogger extends BaseLogger {
  writeLogEntry() {}
}
