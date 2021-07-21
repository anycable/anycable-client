import { BaseLogger } from '@anycable/core'

/* eslint-disable no-console */
export class Logger extends BaseLogger {
  writeLogEntry(level, msg, ...args) {
    console.log(`[${level}] ${msg}`, ...args)
  }
}
