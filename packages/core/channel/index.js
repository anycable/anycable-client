import { createNanoEvents } from 'nanoevents'

const STATE = Symbol('state')

export class Channel {
  // Unique channel identifier
  // static identifier = ''

  constructor(params = {}) {
    this.emitter = createNanoEvents()
    this.params = Object.freeze(params)
    this[STATE] = 'disconnected'
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

    this.id = id
    this[STATE] = 'connected'

    this.emit('connect')
  }

  restored() {
    if (this.state === 'connected') return
    if (this.state !== 'connecting') throw Error('Must be connecting')

    this[STATE] = 'connected'
    this.emit('restore')
  }

  disconnected(reason) {
    if (this.state === 'disconnected') return

    this[STATE] = 'disconnected'

    this.emit('disconnect', { reason })
  }

  close(reason) {
    if (this.state === 'disconnected') return

    this[STATE] = 'disconnected'
    delete this.receiver

    this.emit('close', { reason })
  }

  async disconnect() {
    if (this.state === 'connecting') {
      await this.pendingConnect()
    }

    if (this.state === 'disconnected') return Promise.resolve()

    return this.receiver.unsubscribe(this.id)
  }

  async perform(action, payload) {
    if (this.state === 'connecting') {
      await this.pendingConnect()
    }

    if (this.state === 'disconnected') throw Error('No connection')

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
        this.on('restore', () => {
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
