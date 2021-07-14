import { createNanoEvents } from 'nanoevents'
import { Hub } from '../hub/index.js'
import {
  DisconnectedError,
  SubscriptionRejectedError
} from '../protocol/index.js'
import { NoopLogger } from '../logger/index.js'

export class NoConnectionError extends Error {
  constructor() {
    super('No connection')
  }
}

const STATE = Symbol('state')

export class Cable {
  constructor({ transport, protocol, encoder, logger, lazy }) {
    this.emitter = createNanoEvents()
    this.transport = transport
    this.encoder = encoder
    this.logger = logger || new NoopLogger()
    this.protocol = new protocol(this)

    this.hub = new Hub()

    this[STATE] = 'disconnected'

    this.handleClose = this.handleClose.bind(this)
    this.handleIncoming = this.handleIncoming.bind(this)

    this.transport.on('close', this.handleClose)
    this.transport.on('data', this.handleIncoming)

    if (lazy === false) this.connect()
  }

  get state() {
    return this[STATE]
  }

  async connect() {
    if (this.state === 'connected') return Promise.resolve()
    if (this.state === 'connecting') return this.pendingConnect()

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
      this.hub.channels.forEach(channel =>
        channel.disconnected('Failed to recover')
      )
    }

    // Re-subscribe channels
    this.hub.channels.forEach(channel => this.subscribe(channel))

    this.recovering = false

    this.emit('connect')
  }

  restored() {
    if (!this.recovering) return this.connected()

    this.logger.info('connection recovered')

    this[STATE] = 'connected'

    // Transition channels to 'connected' state
    this.hub.channels.forEach(channel => channel.restored())

    this.recovering = false

    this.emit('connect')
  }

  disconnected(reason) {
    this.logger.debug('server terminated connection', { reason })

    let err =
      typeof reason === 'string' ? new DisconnectedError(reason) : reason

    this.handleClose(err)
  }

  handleClose(err) {
    if (this.state === 'disconnected') return

    this.logger.info('disconnected', { reason: err })

    this[STATE] = 'disconnected'

    this.recovering = this.protocol.recoverableClosure(err)

    if (this.recovering) {
      // Transition channels to 'connecting' state (so actions are pending the connection)
      this.hub.channels.forEach(channel => channel.connecting(this))
    } else {
      // Notify all channels
      this.hub.channels.forEach(channel => channel.disconnected(err))
    }

    this.protocol.reset(err)
    this.hub.close()
    this.transport.close()

    this.emit('disconnect', err)
  }

  close(reason) {
    if (this.state === 'disconnected') return

    this.logger.info('closed', { reason })

    this[STATE] = 'disconnected'

    this.hub.channels.forEach(channel => channel.close(reason))
    this.hub.close()
    this.protocol.reset(new DisconnectedError(reason))
    this.transport.close()

    this.emit('close', { reason })
  }

  handleIncoming(raw) {
    if (this.state === 'disconnected') return

    let data = this.encoder.decode(raw)

    if (data === void 0) {
      this.logger.error('failed to decode message', { message: raw })
      return
    }

    let processed = this.protocol.receive(data)

    if (processed) {
      this.logger.debug('incoming message', processed)

      let { identifier, message, meta } = processed

      this.hub.transmit(identifier, message, meta)
    }
  }

  send(msg) {
    let data = this.encoder.encode(msg)

    if (data === void 0) {
      this.logger.error('failed to encode message', { message: msg })
      return
    }

    this.logger.debug('outgoing message', msg)

    this.transport.send(data)
  }

  keepalive(msg) {
    // TODO: Implement keepalive monitor
  }

  async subscribe(channel) {
    channel.connecting(this)

    if (this.state === 'connecting') {
      await this.pendingConnect()
    }
    if (this.state === 'disconnected') throw new NoConnectionError()

    let channelMeta = {
      identifier: channel.identifier,
      params: channel.params
    }

    this.logger.debug('subscribing...', channelMeta)

    return this.protocol
      .subscribe(channel.identifier, channel.params)
      .then(identifier => {
        this.hub.add(identifier, channel)
        channel.connected(identifier)

        this.logger.debug('subscribed', { id: identifier, ...channelMeta })
        return identifier
      })
      .catch(err => {
        if (err && err instanceof SubscriptionRejectedError) {
          this.logger.warn('rejected', channelMeta)
          channel.close('Rejected')
        } else {
          this.logger.error('failed to subscribe', {
            error: err,
            ...channelMeta
          })
          channel.close(err)
        }

        throw err
      })
  }

  async unsubscribe(identifier) {
    let channel = this.hub.get(identifier)

    if (!channel) throw Error(`Channel not found: ${identifier}`)

    if (this.state === 'connecting') {
      await this.pendingConnect()

      if (channel.state === 'connecting') {
        await channel.pendingConnect()
      }
    }

    this.logger.debug('unsubscribing...', { id: identifier })

    if (this.state === 'disconnected') {
      let channel = this.hub.remove(identifier)
      channel.close()

      this.logger.debug('unsubscribed', { id: identifier })
      return
    }

    return this.protocol
      .unsubscribe(identifier)
      .then(() => {
        let channel = this.hub.remove(identifier)
        channel.close()

        this.logger.debug('unsubscribed', { id: identifier })
      })
      .catch(err => {
        this.logger.error('unsubscribe failed', { id: identifier })

        throw err
      })
  }

  async perform(identifier, action, payload) {
    let channel = this.hub.get(identifier)

    if (!channel) throw Error(`Channel not found: ${identifier}`)

    if (this.state === 'connecting') {
      await this.pendingConnect()

      if (channel.state === 'connecting') {
        await channel.pendingConnect()
      }
    }

    if (this.state === 'disconnected') throw new NoConnectionError()

    let performMeta = {
      id: identifier,
      action: action,
      payload: payload
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
