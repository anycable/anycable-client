import { Cable } from '../cable/index.js'
import { ActionCableProtocol } from '../action_cable/index.js'
import { JSONEncoder } from '../encoder/index.js'
import { NoopLogger } from '../logger/index.js'
import { WebSocketTransport } from '../websocket/index.js'
import { Monitor, backoffWithJitter } from '../monitor/index.js'

export const DEFAULT_OPTIONS = {
  protocol: 'actioncable-v1-json',
  websocketFormat: 'text',
  pingInterval: 3000,
  maxReconnectAttempts: Infinity,
  maxMissingPings: 2,
  logLevel: 'warn',
  lazy: true
}

export function createCable(url, opts) {
  if (typeof url === 'object' && typeof opts === 'undefined') {
    opts = url
    url = undefined
  }

  opts = opts || {}

  if (!url && !opts.transport) throw Error('URL or transport must be specified')

  opts = Object.assign({}, DEFAULT_OPTIONS, opts)

  let {
    protocol,
    websocketImplementation,
    websocketFormat,
    logLevel,
    logger,
    transport,
    encoder,
    lazy,
    monitor,
    pingInterval,
    reconnectStrategy,
    maxMissingPings,
    maxReconnectAttempts,
    subprotocol
  } = opts

  if (typeof protocol === 'string') subprotocol = subprotocol || protocol

  if (protocol === 'actioncable-v1-json') {
    protocol = new ActionCableProtocol()
  } else if (typeof protocol === 'string') {
    throw Error(`Protocol is not supported yet: ${protocol}`)
  }

  if (!protocol) throw Error('Protocol must be specified')

  transport =
    transport ||
    new WebSocketTransport(url, {
      websocketImplementation,
      subprotocol,
      format: websocketFormat
    })

  encoder = encoder || new JSONEncoder()

  logger = logger || new NoopLogger(logLevel)

  reconnectStrategy = reconnectStrategy || backoffWithJitter(pingInterval)

  if (monitor !== false) {
    monitor =
      monitor ||
      new Monitor({
        pingInterval,
        reconnectStrategy,
        maxMissingPings,
        maxReconnectAttempts,
        logger
      })
  }

  let cable = new Cable({
    protocol,
    transport,
    encoder,
    logger,
    lazy
  })

  if (monitor) {
    monitor.watch(cable)
    cable.monitor = monitor
  }

  return cable
}
