/*eslint n/no-unsupported-features/es-syntax: ["error", {version: "14.0"}] */
import { createNanoEvents } from 'nanoevents'

import { ReasonError } from '../protocol/index.js'
import { stringifyParams } from '../stringify-params/index.js'

const STATE = Symbol('state')

export class Channel {
  // Unique channel identifier
  // static identifier = ''

  constructor(params = {}) {
    this.emitter = createNanoEvents()
    this.params = Object.freeze(params)

    this.initialConnect = true

    this[STATE] = 'idle'
  }

  get identifier() {
    if (this._identifier) return this._identifier

    // Use Action Cable identifiers as internal identifiers for channels
    this._identifier = stringifyParams({
      channel: this.channelId,
      ...this.params
    })

    return this._identifier
  }

  get channelId() {
    return this.constructor.identifier
  }

  get state() {
    return this[STATE]
  }

  attached(receiver) {
    if (this.receiver) {
      if (this.receiver !== receiver) {
        throw Error('Already connected to a different receiver')
      }

      return false
    }

    this.receiver = receiver
    return true
  }

  connecting() {
    this[STATE] = 'connecting'
  }

  connected() {
    if (this.state === 'connected') return
    if (this.state === 'closed') return

    this[STATE] = 'connected'

    let restored = false

    if (this.initialConnect) {
      this.initialConnect = false
      this.emit('connect', { reconnect: false, restored })
    } else {
      this.emit('connect', { reconnect: true, restored })
    }
  }

  restored() {
    if (this.state === 'connected') throw Error('Already connected')
    if (this.state !== 'connecting') throw Error('Must be connecting')

    this[STATE] = 'connected'

    let restored = true
    let reconnect = true

    this.initialConnect = false

    this.emit('connect', { reconnect, restored })
  }

  disconnected(err) {
    if (this.state === 'disconnected' || this.state === 'closed') return

    this[STATE] = 'disconnected'

    this.emit('disconnect', err)
  }

  closed(err) {
    if (this.state === 'closed') return

    this[STATE] = 'closed'
    delete this.receiver

    this.initialConnect = true

    this.emit('close', err)
  }

  disconnect() {
    if (this.state === 'idle' || this.state === 'closed') {
      return
    }

    this.receiver.unsubscribe(this)
  }

  async perform(action, payload) {
    if (this.state === 'idle' || this.state === 'closed') {
      throw Error('Channel is not subscribed')
    }

    return this.receiver.perform(this.identifier, action, payload)
  }

  async send(payload) {
    return this.perform(undefined, payload)
  }

  receive(msg, meta) {
    this.emit('message', msg, meta)
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

  ensureSubscribed() {
    if (this.state === 'connected') return Promise.resolve()

    if (this.state === 'closed') {
      return Promise.reject(Error('Channel is unsubscribed'))
    }

    return this.pendingSubscribe()
  }

  // This promise resolves when subscription is confirmed
  // and rejects when rejected or closed.
  // It ignores disconnect events.
  pendingSubscribe() {
    if (this._pendingSubscribe) return this._pendingSubscribe

    this._pendingSubscribe = new Promise((resolve, reject) => {
      let unbind = [() => delete this._pendingSubscribe]

      unbind.push(
        this.on('connect', () => {
          unbind.forEach(clbk => clbk())
          resolve()
        })
      )
      unbind.push(
        this.on('close', err => {
          unbind.forEach(clbk => clbk())
          reject(
            err ||
              new ReasonError(
                'Channel was disconnected before subscribing',
                'canceled'
              )
          )
        })
      )
    })

    return this._pendingSubscribe
  }
}
