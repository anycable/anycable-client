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
        params
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

    return this.connector.unsubscribe(this.sid).then(() => {
      delete this.connector
      delete this.sid

      return true
    })
  }

  async perform(action, payload) {
    await this.ensureConnected()

    if (payload !== void 0)
      return this.client.perform(this.sub_id, { action, payload })
    else return this.client.perform(this.sub_id, { action })
  }

  async ensureConnected() {
    if (this.sid) return Promise.resolve()

    if (this.pendingSubscription) return this.pendingSubscription

    return Promise.reject('Must be connected')
  }
}
