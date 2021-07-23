import {
  createCable as coreCreateCable,
  backoffWithJitter
} from '@anycable/core'
import { DEFAULTS } from '@anycable/core/create-cable/index.js'

import { Logger } from './logger/index.js'
import { Monitor } from './monitor/index.js'

export { Channel } from '@anycable/core'

const metaPrefixes = ['cable-', 'action-cable-']

const defaultUrl = '/cable'

/* eslint-disable consistent-return */
const fromMeta = key => {
  if (typeof document !== 'undefined' && document.head) {
    metaPrefixes.forEach(prefix => {
      let element = document.head.querySelector(`meta[name='${prefix}-${key}']`)

      if (element) {
        return element.getAttribute('content')
      }
    })
  }
}

export function createCable(url, opts) {
  if (typeof url === 'object' && typeof opts === 'undefined') {
    opts = url
    url = undefined
  }

  url ||= fromMeta('url') || defaultUrl
  opts ||= {}

  opts = Object.assign({}, DEFAULTS, opts)

  let {
    logLevel,
    logger,
    pingInterval,
    reconnectStrategy,
    maxMissingPings,
    maxReconnectAttempts
  } = opts

  logger = opts.logger ||= new Logger(logLevel)
  reconnectStrategy = opts.reconnectStrategy ||= backoffWithJitter(pingInterval)

  opts.monitor = new Monitor({
    pingInterval,
    reconnectStrategy,
    maxMissingPings,
    maxReconnectAttempts,
    logger
  })

  return coreCreateCable(url, opts)
}
