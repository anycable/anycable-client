import { Cable } from '../cable/index.js'
import { ActionCableProtocol } from '../action_cable/index.js'
import { JSONEncoder } from '../encoder/index.js'
import { NoopLogger } from '../logger/index.js'
import { WebSocketTransport } from '../websocket/index.js'
import { Monitor, backoffWithJitter } from '../monitor/index.js'

export const DEFAULTS = {
  protocol: 'actioncable-v1-json',
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

  opts ||= {}

  if (!url && !opts.transport) throw Error('URL or transport must be specified')

  opts = Object.assign({}, DEFAULTS, opts)

  let {
    protocol,
    websocketImplementation,
    logLevel,
    logger,
    transport,
    encoder,
    lazy,
    monitor,
    pingInterval,
    reconnectStrategy,
    maxMissingPings,
    maxReconnectAttempts
  } = opts

  let subprotocol = protocol

  if (protocol === 'actioncable-v1-json') {
    protocol = new ActionCableProtocol()
  } else {
    throw Error(`Protocol is not supported yet: ${protocol}`)
  }

  transport ||= new WebSocketTransport(url, {
    websocketImplementation,
    subprotocol
  })

  encoder ||= new JSONEncoder()

  logger ||= new NoopLogger(logLevel)

  reconnectStrategy ||= backoffWithJitter(pingInterval)

  monitor ||= new Monitor({
    pingInterval,
    reconnectStrategy,
    maxMissingPings,
    maxReconnectAttempts,
    logger
  })

  let cable = new Cable({
    protocol,
    transport,
    encoder,
    logger,
    lazy
  })

  monitor.watch(cable)

  return cable
}
