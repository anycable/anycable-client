import { createNanoEvents } from 'nanoevents'

export class Channel {
  // Unique channel identifier
  static identifier = ''

  constructor(connector, params = {}) {
    this.emitter = createNanoEvents()
    this.params = Object.freeze(params)
    this.connector = connector
    this.connected = false
    this.handleIncoming = this.handleIncoming.bind(this)
  }

  async connect() {
    if (this.connected) throw 'Already connected'

    this.pendingSubscription = this.connector
      .subscribe(
        {
          channel: this.constructor.identifier,
          params: this.params
        },
        this.handleIncoming
      )
      .then(pipe => {
        this.pipe = pipe
        delete this.pendingSubscription

        this.connected = true
        this.emit('start')
      })

    return this.pendingSubscription
  }

  async disconnect() {
    await this.ensureConnected()

    return this.pipe.close().then(() => {
      this.connected = false
      delete this.pipe

      this.emit('stop')
    })
  }

  async perform(action, payload) {
    await this.ensureConnected()

    return this.pipe.send({ action, payload })
  }

  handleIncoming(msg, meta) {
    this.emit('data', msg, meta)
  }

  on(event, callback) {
    return this.emitter.on(event, callback)
  }

  once(event, callback) {
    const unbind = this.emitter.on(event, (...args) => {
      unbind()
      callback(...args)
    })
    return unbind
  }

  emit(event, ...args) {
    return this.emitter.emit(event, ...args)
  }

  async ensureConnected() {
    if (this.connected) return Promise.resolve()

    if (this.pendingSubscription) return this.pendingSubscription

    return Promise.reject('Must be connected')
  }
}
