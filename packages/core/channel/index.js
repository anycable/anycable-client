import { createNanoEvents } from 'nanoevents'

export class Channel {
  // Unique channel identifier
  static identifier = ''

  constructor(params = {}) {
    this.emitter = createNanoEvents()
    this.params = Object.freeze(params)
    this.connected = false
    this.receive = this.receive.bind(this)
  }

  async connect(receiver) {
    if (this.connected) throw 'Already connected'

    this.receiver = receiver

    this.pendingSubscription = this.receiver
      .subscribe(this.constructor.identifier, this.params)
      .then(line => {
        this.line = line
        this.line.receive(this.receive)
        delete this.pendingSubscription

        this.connected = true
        this.emit('start')
      })

    return this.pendingSubscription
  }

  async disconnect() {
    await this.ensureConnected()

    return this.line.close().then(() => {
      this.connected = false
      delete this.line

      this.emit('stop')
    })
  }

  async perform(action, payload) {
    await this.ensureConnected()

    return this.line.send({ action, payload })
  }

  receive(msg, meta) {
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
