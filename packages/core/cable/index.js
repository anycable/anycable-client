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
  constructor(identifier, params) {
    super(params)
    this.identifier = identifier
  }

  set identifier(val) {
    this._identifier = val
  }

  get identifier() {
    return this._identifier
  }
}

const STATE = Symbol('state')

export class Cable {
  constructor({ transport, protocol, encoder, logger, lazy, channelsCache }) {
    this.emitter = createNanoEvents()
    this.transport = transport
    this.encoder = encoder
    this.logger = logger || new NoopLogger()
    this.protocol = protocol
    this.cache = channelsCache

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
    this.logger.info('connected')

    this[STATE] = 'connected'

    if (this.recovering) {
      // Make sure channels moved to disconnect state
      this.hub.activeChannels.forEach(channel =>
        channel.disconnected('Failed to recover')
      )
    }

    // Re-subscribe channels
    this.hub.channels.forEach(channel => this._subscribe(channel))

    let reconnect = !this.initialConnect
    let restored = false

    this.recovering = false
    this.initialConnect = false

    this.emit('connect', { reconnect, restored })
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
    this.hub.pendingChannels.forEach(channel => this._subscribe(channel))

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
    if (
      this.state === 'disconnected' ||
      this.state === 'closed' ||
      this.state === 'idle'
    ) {
      return
    }

    this.logger.info('disconnected', { reason: err })

    this[STATE] = 'disconnected'

    this.recovering = this.protocol.recoverableClosure(err)

    if (this.recovering) {
      // Transition channels to 'connecting' state (so actions are pending the connection)
      this.hub.activeChannels.forEach(channel => channel.connecting(this))
    } else {
      // Notify all active (once connected) channels
      this.hub.activeChannels.forEach(channel => channel.disconnected(err))
    }

    this.protocol.reset(err)
    this.hub.close()
    this.transport.close()

    this.emit('disconnect', err)
  }

  close(reason) {
    if (this.state === 'closed' || this.state === 'idle') return

    this.logger.info('closed', { reason })

    this[STATE] = 'closed'

    let err =
      reason instanceof DisconnectedError
        ? reason
        : new DisconnectedError(reason, undefined)

    this.hub.channels.forEach(channel => channel.close(err))
    this.hub.close()
    this.protocol.reset()
    this.transport.close()

    this.initialConnect = true

    this.emit('close', err)
  }

  disconnect() {
    this.close(new DisconnectedError('manual'))
  }

  handleIncoming(raw) {
    if (
      this.state === 'disconnected' ||
      this.state === 'closed' ||
      this.state === 'idle'
    ) {
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
    let identifier

    if (typeof ChannelClass === 'string') {
      ghostName = ChannelClass
      identifier = ChannelClass
      ChannelClass = GhostChannel
    } else {
      identifier = ChannelClass.identifier
    }

    if (this.cache) {
      channel = this.cache.read(identifier, params)
    }

    if (!channel) {
      channel = ghostName
        ? new ChannelClass(ghostName, params)
        : new ChannelClass(params)

      if (this.cache) {
        this.cache.write(channel, identifier, params)
      }
    }

    return this.subscribe(channel).then(() => channel)
  }

  async subscribe(channel) {
    if (channel.state === 'connected') {
      if (channel.receiver !== this) {
        throw Error('Already connected to another cable')
      }

      this.hub.entryFor(channel).mark()

      return channel.id
    }

    let entry = this.hub.entryFor(channel)
    entry.mark()

    if (entry.isPending()) {
      return entry.pending()
    }

    // Set temporary ID which could be used to unsubscribe
    // before subscribe command was sent
    if (!channel.id) {
      channel.id = entry.id
      this.hub.add(channel.id, channel)
    }

    let subscribePromise = channel.pendingSubscribe()

    // Subscribe is only called for side-effects here
    this._subscribe(channel)

    return entry.pending(subscribePromise)
  }

  _subscribe(channel) {
    channel.connecting(this)

    if (this.state === 'idle') {
      // Trigger connection initialization if it is lazy
      this.connect().catch(() => {})
    }

    if (this.state === 'closed') {
      channel.close(new NoConnectionError())
      return Promise.resolve()
    }

    if (this.state !== 'connected') {
      return Promise.resolve()
    }

    let channelMeta = {
      identifier: channel.identifier,
      params: channel.params
    }

    this.logger.debug('subscribing', channelMeta)

    return this.protocol
      .subscribe(channel.identifier, channel.params)
      .then(identifier => {
        this.hub.add(identifier, channel)
        channel.connected(identifier)

        this.logger.debug('subscribed', { id: identifier, ...channelMeta })
      })
      .catch(err => {
        if (err) {
          if (err instanceof SubscriptionRejectedError) {
            this.logger.warn('rejected', channelMeta)
            this.hub.remove(channel.id)
            channel.close(err)
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
        this.hub.remove(channel.id)
        channel.close(err)
      })
  }

  async unsubscribe(identifier) {
    let channel = this.hub.get(identifier)

    if (!channel) throw Error(`Channel not found: ${identifier}`)

    let entry = this.hub.entryFor(channel)

    // In case we try to unsubscribe already unsubscribed channel
    // (that shouldn't really happen)
    if (entry.isFree()) return true

    entry.unmark()

    // Someone is still using this channel
    if (!entry.isFree()) return false

    return this._unsubscribe(identifier).catch(err => {
      // Restore mark state in case of failed unsubscription
      entry.mark()
      throw err
    })
  }

  async _unsubscribe(identifier) {
    this.logger.debug('unsubscribing...', { id: identifier })

    if (this.state !== 'connected') {
      let instance = this.hub.remove(identifier)
      instance.close()

      this.logger.debug('unsubscribed locally (cable is not connected)', {
        id: identifier
      })
      return Promise.resolve(true)
    }

    return this.protocol
      .unsubscribe(identifier)
      .then(() => {
        let instance = this.hub.remove(identifier)
        instance.close()

        this.logger.debug('unsubscribed remotely', { id: identifier })
        return true
      })
      .catch(err => {
        if (err) {
          // We assume that server unsubscribes subscriptions on disconnect,
          // So we can mark it as closed locally.
          if (err instanceof DisconnectedError) {
            let instance = this.hub.remove(identifier)
            instance.close(err)

            this.logger.debug(
              'unsubscribed locally or remotely (cable disconnected during the command execution)',
              { id: identifier, error: err }
            )
            return true
          }
        }

        this.logger.error('unsubscribe failed', {
          id: identifier,
          error: err
        })

        throw err || Error('Unsubscribe failed')
      })
  }

  async perform(identifier, action, payload) {
    let channel = this.hub.get(identifier)

    if (!channel) throw Error(`Channel not found: ${identifier}`)

    if (this.state === 'connecting') {
      await this.pendingConnect()

      if (channel.state === 'connecting') {
        await channel.pendingSubscribe()
      }
    }

    if (this.state === 'closed' || this.state === 'disconnected') {
      throw new NoConnectionError()
    }

    let performMeta = {
      id: identifier,
      action,
      payload
    }

    this.logger.debug('perform', performMeta)

    return this.protocol
      .perform(identifier, action, payload)
      .then(res => {
        if (res) {
          this.logger.debug('perform result', {
            message: res,
            request: performMeta
          })
        }

        return res
      })
      .catch(err => {
        this.logger.error('perform failed', {
          error: err,
          request: performMeta
        })

        throw err
      })
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
