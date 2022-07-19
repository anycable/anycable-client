import { createNanoEvents } from 'nanoevents'

import { Hub } from '../hub/index.js'
import {
  ReasonError,
  DisconnectedError,
  SubscriptionRejectedError
} from '../protocol/index.js'
import { NoopLogger } from '../logger/index.js'
import { Channel } from '../channel/index.js'

export class NoConnectionError extends ReasonError {
  constructor() {
    super('No connection', 'closed')
    this.name = 'NoConnectionError'
  }
}

export class GhostChannel extends Channel {
  static identifier = '__ghost__'
  constructor(channelId, params) {
    super(params)
    this.channelId = channelId
  }

  set channelId(val) {
    this._channelId = val
  }

  get channelId() {
    return this._channelId
  }
}

const STATE = Symbol('state')

export class Cable {
  constructor({ transport, protocol, encoder, logger, lazy }) {
    this.emitter = createNanoEvents()
    this.transport = transport
    this.encoder = encoder
    this.logger = logger || new NoopLogger()
    this.protocol = protocol

    this.protocol.attached(this)

    this.hub = new Hub()

    this[STATE] = 'idle'

    this.handleClose = this.handleClose.bind(this)
    this.handleIncoming = this.handleIncoming.bind(this)

    this.transport.on('close', this.handleClose)
    this.transport.on('data', this.handleIncoming)

    this.initialConnect = true
    this.recovering = false

    if (lazy === false) {
      this.connect().catch(() => {})
    }
  }

  get state() {
    return this[STATE]
  }

  async connect() {
    if (this.state === 'connected') return Promise.resolve()
    if (this.state === 'connecting') {
      return this.pendingConnect()
    }

    this[STATE] = 'connecting'
    let promise = this.pendingConnect()

    this.logger.debug('connecting')

    try {
      await this.transport.open()
    } catch (err) {
      this.handleClose(err)
    }

    return promise
  }

  connected() {
    if (this.state === 'connected') return

    this.logger.info('connected')

    this[STATE] = 'connected'

    if (this.recovering) {
      // Make sure channels moved to disconnect state
      this.hub.channels.forEach(channel =>
        channel.disconnected('Failed to recover')
      )
    }

    // Re-subscribe channels
    this.hub.subscriptions.forEach(({ id, channel, params }) =>
      this._subscribe(id, channel, params)
    )

    let restored = false
    this.recovering = false

    if (this.initialConnect) {
      this.initialConnect = false
      this.emit('connect', { reconnect: false, restored })
    } else {
      this.emit('connect', { reconnect: true, restored })
    }
  }

  // TODO: Restored should accept the list of
  // identifiers of channels which were successfully restored
  // and which must re-subscribe
  restored() {
    if (!this.recovering) {
      this.connected()
      return
    }

    this.logger.info('connection recovered')

    this[STATE] = 'connected'

    // Transition active channels to 'connected' state
    this.hub.activeChannels.forEach(channel => channel.restored())
    // Try to subscribe pending channels
    this.hub.pendingSubscriptions.forEach(({ id, channel, params }) =>
      this._subscribe(id, channel, params)
    )

    let reconnect = !this.initialConnect
    let restored = true

    this.recovering = false
    this.initialConnect = false

    this.emit('connect', { reconnect, restored })
  }

  handleClose(err) {
    this.logger.debug('transport closed', { error: err })

    this.disconnected(new DisconnectedError(err, 'transport_closed'))
  }

  disconnected(err) {
    if (!(this.state === 'connected' || this.state === 'connecting')) {
      return
    }

    this.logger.info('disconnected', { reason: err })

    this[STATE] = 'disconnected'

    this.recovering = this.protocol.recoverableClosure(err)

    if (this.recovering) {
      this.hub.channels.forEach(channel => channel.connecting())
    } else {
      this.hub.channels.forEach(channel => channel.disconnected(err))
    }

    this.protocol.reset(err)
    this.hub.close()
    this.transport.close()

    this.emit('disconnect', err)
  }

  closed(reason) {
    if (this.state === 'closed' || this.state === 'idle') return

    let err

    if (reason) {
      err =
        reason instanceof DisconnectedError
          ? reason
          : new DisconnectedError(reason, undefined)
    }

    this.logger.info('closed', { reason: reason || 'user' })

    this[STATE] = 'closed'

    // Channels must transition to the disconnected phase,
    // since they got reconnected as soon as cable reconnects
    let channelErr = err || new DisconnectedError('cable_closed')
    this.hub.channels.forEach(channel => channel.disconnected(channelErr))

    this.hub.close()
    this.protocol.reset()
    this.transport.close()

    this.initialConnect = true

    this.emit('close', err)
  }

  disconnect() {
    this.closed()
  }

  handleIncoming(raw) {
    if (this.state === 'closed' || this.state === 'idle') {
      return
    }

    let data = this.encoder.decode(raw)

    if (data === undefined) {
      this.logger.error('failed to decode message', { message: raw })
      return
    }

    this.logger.debug('incoming data', data)

    let processed = this.protocol.receive(data)

    if (processed) {
      this.logger.debug('processed incoming message', processed)

      let { identifier, message, meta } = processed

      this.hub.transmit(identifier, message, meta)
    }
  }

  send(msg) {
    if (this.state === 'closed') {
      throw Error('Cable is closed')
    }

    let data = this.encoder.encode(msg)

    if (data === undefined) {
      this.logger.error('failed to encode message', { message: msg })
      return
    }

    this.logger.debug('outgoing message', msg)

    this.transport.send(data)
  }

  keepalive(msg) {
    this.emit('keepalive', msg)
  }

  subscribeTo(ChannelClass, params) {
    let channel
    let ghostName

    if (typeof ChannelClass === 'string') {
      ghostName = ChannelClass
      ChannelClass = GhostChannel
    }

    channel = ghostName
      ? new ChannelClass(ghostName, params)
      : new ChannelClass(params)

    return this.subscribe(channel)
  }

  subscribe(channel) {
    // Return if channel has been already attached to the cable
    if (!channel.attached(this)) return channel

    let identifier = channel.identifier

    channel.connecting()

    let subscription = this.hub.findSubscription(identifier)

    this.hub.add(identifier, channel)

    if (subscription) {
      if (subscription.channels[0].state === 'connected') {
        channel.connected()
      }
    } else {
      let subscribeRequest = this._subscribe(
        identifier,
        channel.channelId,
        channel.params
      )

      this.hub.subscribes.add(identifier, subscribeRequest)
    }

    return channel
  }

  async _subscribe(identifier, channelId, params) {
    if (this.state === 'idle') {
      // Trigger connection initialization if it is lazy
      this.connect().catch(() => {})
    }

    // We will call _subscribe again as soon as cable connected
    if (this.state !== 'connected') {
      return
    }

    // if there is an unsubscribe request pending, let's wait for it to complete
    let unsub = this.hub.unsubscribes.get(identifier)

    if (unsub) await unsub

    let channelMeta = {
      identifier: channelId,
      params
    }

    this.logger.debug('subscribing', channelMeta)

    try {
      let remoteId = await this.protocol.subscribe(channelId, params)

      // Remove pending subscribe right here to prevent race conditions with potential
      // _unsubscribe calls (sine cleanup in the PendingRequest is executed after subscribe resolves)
      this.hub.subscribes.remove(identifier)
      this.hub.channelsFor(identifier).forEach(channel => channel.connected())

      let subscription = this.hub.findSubscription(identifier)

      if (subscription) {
        this.hub.subscribe(identifier, remoteId)
        this.logger.debug('subscribed', { ...channelMeta, remoteId })
      } else {
        // That means we unsubscribed before receiving a confirmation
        this.logger.warn('subscription confirmed after unsubscribe', {
          ...channelMeta,
          remoteId
        })
      }
    } catch (err) {
      if (err) {
        if (err instanceof SubscriptionRejectedError) {
          this.logger.warn('rejected', channelMeta)

          this.hub
            .channelsFor(identifier)
            .forEach(channel => channel.closed(err))
          this.hub.remove(identifier)
        }

        if (err instanceof DisconnectedError) {
          this.logger.debug(
            'disconnected during subscription; will retry on connect',
            channelMeta
          )
          return
        }
      }

      this.logger.error('failed to subscribe', {
        error: err,
        ...channelMeta
      })
      this.hub.channelsFor(identifier).forEach(channel => channel.closed(err))
      this.hub.remove(identifier)
    }
  }

  unsubscribe(channel) {
    let identifier = channel.identifier
    let subscription = this.hub.findSubscription(identifier)

    if (!subscription) {
      throw Error(`Subscription not found: ${identifier}`)
    }

    this.hub.removeChannel(channel)
    channel.closed()

    let channels = this.hub.channelsFor(identifier)

    if (channels.length > 0) {
      return
    }

    let unsubscribeRequest = this._unsubscribe(
      identifier,
      subscription.remoteId
    )

    this.hub.unsubscribes.add(identifier, unsubscribeRequest)
  }

  async _unsubscribe(identifier, remoteId) {
    // If there is a subscribe request pending, let's wait for it to complete
    let sub = this.hub.subscribes.get(identifier)
    if (sub) {
      await sub

      // Subscription could fail, so we no need to proceed with unsubscribe
      let subscription = this.hub.findSubscription(identifier)
      if (!subscription) return

      // It could not be set
      remoteId = remoteId || subscription.remoteId
    }

    this.logger.debug('unsubscribing...', { id: identifier })

    if (this.state !== 'connected') {
      this.logger.debug('unsubscribe skipped (cable is not connected)', {
        id: identifier
      })
      return
    }

    try {
      await this.protocol.unsubscribe(remoteId)
      this.logger.debug('unsubscribed remotely', { id: identifier })
    } catch (err) {
      if (err) {
        // We assume that server unsubscribes subscriptions on disconnect,
        // So we can mark it as closed locally.
        if (err instanceof DisconnectedError) {
          this.logger.debug(
            'cable disconnected during the unsubscribe command execution',
            { id: identifier, error: err }
          )

          return
        }
      }

      this.logger.error('unsubscribe failed', {
        id: identifier,
        error: err
      })
    }
  }

  async perform(identifier, action, payload) {
    if (this.state === 'connecting') {
      await this.pendingConnect()
    }

    if (this.state === 'closed' || this.state === 'disconnected') {
      throw new NoConnectionError()
    }

    let sub = this.hub.subscribes.get(identifier)
    if (sub) await sub

    let subscription = this.hub.findSubscription(identifier)

    if (!subscription) {
      throw Error(`Subscription not found: ${identifier}`)
    }

    let remoteId = subscription.remoteId

    let performMeta = {
      id: remoteId,
      action,
      payload
    }

    this.logger.debug('perform', performMeta)

    try {
      let res = await this.protocol.perform(remoteId, action, payload)

      if (res) {
        this.logger.debug('perform result', {
          message: res,
          request: performMeta
        })
      }

      return res
    } catch (err) {
      this.logger.error('perform failed', {
        error: err,
        request: performMeta
      })

      throw err
    }
  }

  on(event, callback) {
    return this.emitter.on(event, callback)
  }

  once(event, callback) {
    let unbind = this.emitter.on(event, (...args) => {
      unbind()
      callback(...args)
    })
    return unbind
  }

  emit(event, ...args) {
    return this.emitter.emit(event, ...args)
  }

  pendingConnect() {
    if (this._pendingConnect) return this._pendingConnect

    this._pendingConnect = new Promise((resolve, reject) => {
      let unbind = [() => delete this._pendingConnect]

      unbind.push(
        this.on('connect', () => {
          unbind.forEach(clbk => clbk())
          resolve()
        })
      )
      unbind.push(
        this.on('close', err => {
          unbind.forEach(clbk => clbk())
          reject(err)
        })
      )
      unbind.push(
        this.on('disconnect', err => {
          unbind.forEach(clbk => clbk())
          reject(err)
        })
      )
    })

    return this._pendingConnect
  }
}
