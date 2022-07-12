import { createNanoEvents } from 'nanoevents'

import { DisconnectedError } from '../protocol/index.js'

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
    return this.constructor.identifier
  }

  get state() {
    return this[STATE]
  }

  connecting(receiver) {
    if (this.state === 'connected' && this.receiver !== receiver) {
      throw Error('Already connected')
    }

    if (this.state === 'connecting') return

    this.receiver = receiver
    this[STATE] = 'connecting'
  }

  connected(id) {
    if (this.state === 'connected') throw Error('Already connected')
    if (this.state === 'closed') return

    this.id = id
    this[STATE] = 'connected'

    let restored = false
    let reconnect = !this.initialConnect
    this.initialConnect = false

    this.emit('connect', { reconnect, restored })
  }

  restored() {
    if (this.state === 'connected') throw Error('Already connected')
    if (this.state !== 'connecting') throw Error('Must be connecting')

    this[STATE] = 'connected'

    let restored = true
    let reconnect = !this.initialConnect
    this.initialConnect = false

    this.emit('connect', { reconnect, restored })
  }

  disconnected(err) {
    if (this.state === 'disconnected' || this.state === 'closed') return

    this[STATE] = 'disconnected'

    this.emit('disconnect', err)
  }

  close(err) {
    if (this.state === 'closed') return

    this[STATE] = 'closed'
    delete this.receiver

    this.initialConnect = true

    this.emit('close', err)
  }

  async disconnect() {
    if (this.state === 'idle' || this.state === 'closed') {
      return Promise.resolve(true)
    }

    return this.receiver.unsubscribe(this.id)
  }

  async perform(action, payload) {
    if (this.state === 'connecting') {
      await this.pendingSubscribe()
    }

    if (
      this.state === 'closed' ||
      this.state === 'idle' ||
      this.state === 'disconnected'
    ) {
      throw Error('No connection')
    }

    return this.receiver.perform(this.id, action, payload)
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
          resolve(this.id)
        })
      )
      unbind.push(
        this.on('close', err => {
          unbind.forEach(clbk => clbk())
          reject(err || new DisconnectedError('closed'))
        })
      )
    })

    return this._pendingSubscribe
  }
}
