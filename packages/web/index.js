import {
  createCable as coreCreateCable,
  backoffWithJitter,
  DEFAULT_OPTIONS as DEFAULTS,
  ActionCableConsumer
} from '@anycable/core'

import { Logger } from './logger/index.js'
import { Monitor } from './monitor/index.js'

export { Channel } from '@anycable/core'

export { TestCable } from '@anycable/core/testing'

const metaPrefixes = ['cable', 'action-cable']

const defaultUrl = '/cable'

/* eslint-disable consistent-return */
const fetchMeta = (doc, key) => {
  for (let prefix of metaPrefixes) {
    let element = doc.head.querySelector(`meta[name='${prefix}-${key}']`)

    if (element) {
      return element.getAttribute('content')
    }
  }
}

const absoluteWSUrl = path => {
  if (path.match(/wss?:\/\//)) return path

  if (typeof window !== 'undefined') {
    let proto = window.location.protocol.replace('http', 'ws')

    return `${proto}//${window.location.host}${path}`
  }

  return path
}

/* eslint-disable consistent-return */
const generateUrlFromDOM = () => {
  if (typeof document !== 'undefined' && document.head) {
    let url = fetchMeta(document, 'url')
    if (url) {
      return absoluteWSUrl(url)
    }
  }

  return absoluteWSUrl(defaultUrl)
}

const historyTimestampFromMeta = () => {
  if (typeof document !== 'undefined' && document.head) {
    let value = fetchMeta(document, 'history-timestamp')

    if (value) {
      return value | 0
    }
  }
}

export function createCable(url, opts) {
  if (typeof url === 'object' && typeof opts === 'undefined') {
    opts = url
    url = undefined
  }

  url = url || generateUrlFromDOM()
  opts = opts || {}

  opts.historyTimestamp ||= historyTimestampFromMeta()

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

export function fetchTokenFromHTML(opts) {
  let url = opts ? opts.url : undefined

  if (!url) {
    if (typeof window !== 'undefined') {
      url = window.location.href
    } else {
      throw Error('An URL to fetch the HTML with a token MUST be specified')
    }
  }

  return async transport => {
    let response = await fetch(url, {
      credentials: 'same-origin',
      cache: 'no-cache',
      headers: {
        'Accept': 'text/html, application/xhtml+xml',
        'X-ANYCABLE-OPERATION': 'token-refresh'
      }
    })

    if (!response.ok) {
      throw Error(
        'Failed to fetch a page to refresh a token: ' + response.status
      )
    }

    let html = await response.text()

    let doc = new DOMParser().parseFromString(html, 'text/html')

    let newURL = fetchMeta(doc, 'url')

    if (newURL) {
      transport.setURL(newURL)
    } else {
      throw Error("Couldn't find a token on the page")
    }
  }
}
