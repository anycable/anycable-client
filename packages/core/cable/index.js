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
      this.hub.subscriptions
        .all()
        .forEach(subscription =>
          subscription.notify(
            'disconnected',
            new DisconnectedError('recovery_failed')
          )
        )
    }

    // Re-subscribe channels
    this.hub.subscriptions
      .all()
      .forEach(subscription => this._resubscribe(subscription))

    let restored = false
    this.recovering = false

    if (this.initialConnect) {
      this.initialConnect = false
      this.emit('connect', { reconnect: false, restored })
    } else {
      this.emit('connect', { reconnect: true, restored })
    }
  }

  restored(remoteIds) {
    if (!this.recovering) {
      this.connected()
      return
    }

    this.logger.info('connection recovered', { remoteIds })

    this[STATE] = 'connected'

    this.hub.subscriptions.all().forEach(subscription => {
      if (
        remoteIds &&
        subscription.remoteId &&
        remoteIds.includes(subscription.remoteId)
      ) {
        subscription.notify('restored')
      } else {
        subscription.notify(
          'disconnected',
          new DisconnectedError('recovery_failed')
        )
        this._resubscribe(subscription)
      }
    })

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
      this.hub.subscriptions
        .all()
        .forEach(subscription => subscription.notify('connecting'))
    } else {
      this.hub.subscriptions.all().forEach(subscription => {
        subscription.notify('disconnected', err)
      })
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
    this.hub.subscriptions
      .all()
      .forEach(subscription => subscription.notify('disconnected', channelErr))

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

    let subscription =
      this.hub.subscriptions.get(identifier) ||
      this.hub.subscriptions.create(identifier, {
        subscribe: sub => {
          return this._subscribe(sub, channel.channelId, channel.params)
        },
        unsubscribe: sub => this._unsubscribe(sub)
      })

    subscription.add(channel)

    if (
      subscription.intent === 'subscribed' &&
      subscription.state === 'connected'
    ) {
      channel.connected()
    }

    subscription.ensureSubscribed()

    return channel
  }

  async _resubscribe(subscription) {
    if (subscription.intent !== 'subscribed') return

    let channel = subscription.channels[0]

    if (!channel) return

    subscription.notify('connecting')
    subscription.ensureResubscribed()
  }

  async _subscribe(subscription, channelId, params) {
    let identifier = subscription.id

    if (this.state === 'idle') {
      // Trigger connection initialization if it is lazy
      this.connect().catch(() => {})
    }

    // We will call _subscribe again as soon as cable connected
    if (this.state !== 'connected') {
      this.logger.debug('cancel subscribe, no connection', { identifier })
      return
    }

    this.logger.debug('acquiring subscribe lock', { identifier })

    let lock = await subscription.acquire('subscribed')
    if (lock.canceled) {
      this.logger.debug('subscribe lock has been canceled', { identifier })
      lock.release()
      return
    }

    this.logger.debug('subscribe lock has been acquired', { identifier })

    if (subscription.intent !== 'subscribed') {
      this.logger.debug('cancel subscribe request, already unsubscribed')
      lock.release()
      return
    }

    // We need to check one more time after a lock has been acquired
    if (this.state !== 'connected') {
      this.logger.debug('cancel subscribe, no connection', { identifier })
      lock.release()
      return
    }

    // Finally, check whether we already connected — then we can skip the action
    if (subscription.state === 'connected') {
      this.logger.debug('already connected, skip subscribe command', {
        identifier
      })
      subscription.notify('connected')
      lock.release()
      return
    }

    let channelMeta = {
      identifier: channelId,
      params
    }

    this.logger.debug('subscribing', channelMeta)

    try {
      let remoteId = await this.protocol.subscribe(channelId, params)

      this.hub.subscribe(identifier, remoteId)

      this.logger.debug('subscribed', { ...channelMeta, remoteId })
      subscription.notify('connected')
    } catch (err) {
      if (err) {
        if (err instanceof SubscriptionRejectedError) {
          this.logger.warn('rejected', channelMeta)
        }

        if (err instanceof DisconnectedError) {
          this.logger.debug(
            'disconnected during subscription; will retry on connect',
            channelMeta
          )
          lock.release()
          return
        }

        this.logger.error('failed to subscribe', {
          error: err,
          ...channelMeta
        })
      }

      subscription.close(err)
      this.hub.unsubscribe(identifier)
    }

    lock.release()
  }

  unsubscribe(channel) {
    let identifier = channel.identifier

    let subscription = this.hub.subscriptions.get(identifier)

    if (!subscription) {
      throw Error(`Subscription not found: ${identifier}`)
    }

    subscription.remove(channel)
    channel.closed()

    subscription.maybeUnsubscribe()
  }

  async _unsubscribe(subscription) {
    let identifier = subscription.id

    this.logger.debug('acquiring unsubscribe lock', { identifier })

    let lock = await subscription.acquire('unsubscribed')
    if (lock.canceled) {
      this.logger.debug('unsubscribe lock has been canceled', { identifier })
      lock.release()
      return
    }

    this.logger.debug('unsubscribe lock has been acquired', { identifier })

    // Check if we still want to unsubscribe
    if (subscription.intent !== 'unsubscribed') {
      this.logger.debug('cancel unsubscribe, no longer needed', {
        identifier,
        intent: subscription.intent
      })
      lock.release()
      return
    }

    // Finally, check whether we already disconnected — then we can skip the action
    if (
      subscription.state === 'disconnected' ||
      subscription.state === 'closed'
    ) {
      this.logger.debug(
        `already ${subscription.state} connected, skip unsubscribe command`,
        { identifier }
      )
      lock.release()
      return
    }

    let remoteId = subscription.remoteId

    this.logger.debug('unsubscribing...', { remoteId })

    if (this.state !== 'connected') {
      this.logger.debug('unsubscribe skipped (cable is not connected)', {
        id: identifier
      })
      subscription.close()
      this.hub.unsubscribe(identifier)
      lock.release()
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
        } else {
          this.logger.error('unsubscribe failed', {
            id: identifier,
            error: err
          })
        }
      }
    }

    if (subscription.intent === 'unsubscribed') {
      subscription.close()
      this.hub.unsubscribe(identifier)
    } else {
      // We rely on state when performing commands,
      // make sure it's set to closed here (it shouldn't stay connected)
      subscription.state = 'closed'
    }

    lock.release()
  }

  async perform(identifier, action, payload) {
    if (this.state === 'connecting') {
      await this.pendingConnect()
    }

    if (this.state === 'closed' || this.state === 'disconnected') {
      throw new NoConnectionError()
    }

    let subscription = this.hub.subscriptions.get(identifier)

    if (!subscription) {
      throw Error(`Subscription not found: ${identifier}`)
    }

    await subscription.pending('subscribed')

    if (subscription.intent !== 'subscribed') {
      throw Error(`Subscription is closed: ${identifier}`)
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
