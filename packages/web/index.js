import {
  createCable as coreCreateCable,
  backoffWithJitter,
  DEFAULT_OPTIONS as DEFAULTS,
  ActionCableConsumer
} from '@anycable/core'

import { Logger } from './logger/index.js'
import { Monitor } from './monitor/index.js'

export { Channel } from '@anycable/core'

const metaPrefixes = ['cable', 'action-cable']

const defaultUrl = '/cable'

/* eslint-disable consistent-return */
const generateUrlFromDOM = key => {
  if (typeof document !== 'undefined' && document.head) {
    for (let prefix of metaPrefixes) {
      let element = document.head.querySelector(`meta[name='${prefix}-${key}']`)

      if (element) {
        return element.getAttribute('content')
      }
    }
  }

  if (typeof window !== 'undefined') {
    let proto = window.location.protocol.replace('http', 'ws')

    return `${proto}//${window.location.host}${defaultUrl}`
  }
}

export function createCable(url, opts) {
  if (typeof url === 'object' && typeof opts === 'undefined') {
    opts = url
    url = undefined
  }

  url = url || generateUrlFromDOM('url')
  opts = opts || {}

  opts = Object.assign({}, DEFAULTS, opts)

  let {
    logLevel,
    logger,
    pingInterval,
    reconnectStrategy,
    maxMissingPings,
    maxReconnectAttempts
  } = opts

  logger = opts.logger = opts.logger || new Logger(logLevel)
  reconnectStrategy = opts.reconnectStrategy =
    opts.reconnectStrategy || backoffWithJitter(pingInterval)

  if (opts.monitor !== false) {
    opts.monitor =
      opts.monitor ||
      new Monitor({
        pingInterval,
        reconnectStrategy,
        maxMissingPings,
        maxReconnectAttempts,
        logger
      })
  }

  return coreCreateCable(url, opts)
}

export function createConsumer(url, opts) {
  let cable = createCable(url, opts)

  return new ActionCableConsumer(cable)
}
