const LEVEL_TO_NAME = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
}

export class BaseLogger {
  constructor(level) {
    this.level = level || 'warn'
  }

  log(level, msg, details) {
    if (LEVEL_TO_NAME[level] < LEVEL_TO_NAME[this.level]) return

    this.writeLogEntry(level, msg, details)
  }

  writeLogEntry() {
    throw Error('Not implemented')
  }

  debug(msg, details) {
    this.log('debug', msg, details)
  }

  info(msg, details) {
    this.log('info', msg, details)
  }

  warn(msg, details) {
    this.log('warn', msg, details)
  }

  error(msg, details) {
    this.log('error', msg, details)
  }
}

export class NoopLogger extends BaseLogger {
  writeLogEntry() {}
}
