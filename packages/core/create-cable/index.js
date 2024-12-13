import { Cable, GhostChannel } from '../cable/index.js'
import { ActionCableProtocol } from '../action_cable/index.js'
import { ActionCableExtendedProtocol } from '../action_cable_ext/index.js'
import { JSONEncoder } from '../encoder/index.js'
import { NoopLogger } from '../logger/index.js'
import { WebSocketTransport } from '../websocket/index.js'
import { Monitor, backoffWithJitter } from '../monitor/index.js'
import { SubscriptionRejectedError } from '../protocol/index.js'
import { FallbackTransport } from '../transport/index.js'

export const DEFAULT_OPTIONS = {
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

  opts = opts || {}

  if (!url && !opts.transport) throw Error('URL or transport must be specified')

  opts = Object.assign({}, DEFAULT_OPTIONS, opts)

  let {
    protocol,
    websocketImplementation,
    websocketFormat,
    websocketOptions,
    fallbacks,
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
    subprotocol,
    tokenRefresher,
    historyTimestamp,
    protocolOptions,
    concurrentSubscribes
  } = opts

  logger = logger || new NoopLogger(logLevel)

  if (typeof protocol === 'string') {
    subprotocol = subprotocol || protocol

    // split protocol into two parts by last '-' symbol
    // e.g. actioncable-v1-json -> actioncable-v1, json
    let protocolName = protocol.substring(0, protocol.lastIndexOf('-'))
    let protocolEncoderName = protocol.substring(protocol.lastIndexOf('-') + 1)

    protocolOptions = protocolOptions || {}

    if (protocolName === 'actioncable-v1') {
      protocol = new ActionCableProtocol({ logger, ...protocolOptions })
    } else if (protocolName === 'actioncable-v1-ext') {
      protocol = new ActionCableExtendedProtocol({
        logger,
        historyTimestamp,
        ...protocolOptions
      })
    } else {
      throw Error(`Protocol is not supported yet: ${protocol}`)
    }

    if (protocolEncoderName === 'json') {
      encoder = encoder || new JSONEncoder()
      websocketFormat = websocketFormat || 'text'
    } else if (protocolEncoderName === 'msgpack') {
      websocketFormat = 'binary'
      if (!encoder) {
        throw Error(
          'Msgpack encoder must be specified explicitly. Use `@anycable/msgpack-encoder` package or build your own'
        )
      }
    } else if (protocolEncoderName === 'protobuf') {
      websocketFormat = websocketFormat || 'binary'
      if (!encoder) {
        throw Error(
          'Protobuf encoder must be specified explicitly. Use `@anycable/protobuf-encoder` package or build your own'
        )
      }
    } else {
      throw Error(`Protocol is not supported yet: ${protocol}`)
    }
  }

  if (!protocol) throw Error('Protocol must be specified')

  transport =
    transport ||
    new WebSocketTransport(url, {
      websocketImplementation,
      websocketOptions,
      subprotocol,
      format: websocketFormat
    })

  if (fallbacks) {
    transport = new FallbackTransport([transport, ...fallbacks], { logger })
  }

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

  let hubOptions = { concurrentSubscribes }

  let cable = new Cable({
    protocol,
    transport,
    encoder,
    logger,
    lazy,
    hubOptions
  })

  if (monitor) {
    monitor.watch(cable)
    cable.monitor = monitor
  }

  if (tokenRefresher) {
    watchForExpiredToken(cable, async () => {
      try {
        await tokenRefresher(transport)
      } catch (err) {
        logger.error('Failed to refresh authentication token: ' + err)
        return false
      }

      // Initiate cable connection.
      // No need to wait for it to complete, it could
      // fail due to network errors (which is not our responsibility)
      cable.connect().catch(() => {})

      return true
    })
  }

  return cable
}

function watchForExpiredToken(cable, callback) {
  let attempted = false

  cable.on('connect', () => (attempted = false))

  cable.on('close', async ev => {
    if (!ev) return

    // If we closed by server two times in a row
    if (attempted) {
      cable.logger.warn('Token auto-refresh is disabled', ev)
      return
    }

    if (ev.reason === 'token_expired') {
      attempted = true

      await callback()
    }
  })
}

// Wrapper over ActionCableChannel that acts like an Action Cable subscription object
class ActionCableSubscription {
  constructor(channel) {
    this.channel = channel
  }

  notify(callback, ...args) {
    if (typeof this[callback] !== 'function') return

    this[callback](...args)
  }

  perform(action, data = {}) {
    return this.channel.perform(action, data)
  }

  send(data) {
    this.channel.send(data)
  }

  get identifier() {
    return this.channel.identifier
  }

  unsubscribe() {
    return this.channel.disconnect()
  }
}

class ActionCableChannel extends GhostChannel {
  constructor(channelName, params, mixin) {
    super(channelName, params)

    this.subscription = new ActionCableSubscription(this)
    Object.assign(this.subscription, mixin)

    this.on('connect', () => this.subscription.notify('connected'))
    this.on('disconnect', () =>
      this.subscription.notify('disconnected', { allowReconnect: true })
    )
    this.on('message', val => this.subscription.notify('received', val))
    this.on('close', err => {
      if (err && err instanceof SubscriptionRejectedError) {
        this.subscription.notify('rejected')
      } else {
        this.subscription.notify('disconnected', { allowReconnect: false })
      }
    })
  }
}

export class ActionCableSubscriptions {
  constructor(cable) {
    this.cable = cable
  }

  create(channel, mixin) {
    let channelName
    let params

    if (typeof channel === 'object') {
      channelName = channel.channel
      delete channel.channel
      params = channel
    } else {
      channelName = channel
      params = {}
    }

    let cableChannel = new ActionCableChannel(channelName, params, mixin)
    cableChannel.subscription.notify('initialized')

    this.cable.subscribe(cableChannel)

    return cableChannel.subscription
  }

  findAll(identifier) {
    return this.cable.hub.channels
      .filter(channel => channel.identifier === identifier)
      .map(channel => channel.subscription)
  }
}

export class ActionCableConsumer {
  constructor(cable) {
    this.cable = cable
    this.subscriptions = new ActionCableSubscriptions(cable)
  }
}

export function createConsumer(url, opts) {
  let cable = createCable(url, opts)

  return new ActionCableConsumer(cable)
}
