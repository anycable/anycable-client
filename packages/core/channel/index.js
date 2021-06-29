export class Channel {
  // Unique channel identifier
  static identifier = ''

  constructor(params = {}) {
    this.params = Object.freeze(params)
  }

  get identifier() {
    return this.sid
  }

  async connect(connector) {
    if (this.connector) throw 'Already connected'

    this.connector = connector

    this.pendingSubscription = this.connector
      .subscribe({
        channel: this.constructor.identifier,
        params: this.params
      })
      .then(sid => {
        this.sid = sid
        delete this.pendingSubscription

        return true
      })

    return this.pendingSubscription
  }

  async disconnect() {
    await this.ensureConnected()

    return this.connector.unsubscribe(this.identifier).then(() => {
      delete this.connector
      delete this.sid

      return true
    })
  }

  async perform(action, payload) {
    await this.ensureConnected()

    return this.connector.perform(this.identifier, action, payload)
  }

  async ensureConnected() {
    if (this.identifier) return Promise.resolve()

    if (this.pendingSubscription) return this.pendingSubscription

    return Promise.reject('Must be connected')
  }
}
