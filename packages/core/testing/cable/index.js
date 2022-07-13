export class TestCable {
  constructor() {
    this.outgoing = []
    this.channels = {}
  }

  async subscribe(channel) {
    channel.connecting(this)

    this.channels[channel.identifier] = channel
    channel.connected(channel.identifier)

    return Promise.resolve(channel.identifier)
  }

  async perform(identifier, action, payload = {}) {
    let channel = this.channels[identifier]

    if (!channel) throw Error(`Channel not found: ${identifier}`)

    this.outgoing.push({ action, payload })

    return Promise.resolve()
  }

  async unsubscribe(identifier) {
    let channel = this.channels[identifier]

    if (!channel) throw Error(`Channel not found: ${identifier}`)

    this.channels[identifier].closed()

    delete this.channels[identifier]

    return Promise.resolve()
  }
}
