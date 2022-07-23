import { BaseLogger } from '@anycable/core'

/* eslint-disable no-console */
export class Logger extends BaseLogger {
  writeLogEntry(level, msg, details) {
    if (details) {
      console[level](msg, details)
    } else {
      console[level](msg)
    }
  }
}
