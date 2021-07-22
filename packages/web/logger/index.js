import { BaseLogger } from '@anycable/core'

/* eslint-disable no-console */
export class Logger extends BaseLogger {
  writeLogEntry(level, msg, details) {
    if (details) {
      console.log(`[${level}] ${msg}`, details)
    } else {
      console.log(`[${level}] ${msg}`)
    }
  }
}
