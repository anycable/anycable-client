export class TestCable {
  constructor() {
    this.outgoing = []
    this.channels = {}
  }

  async subscribe(channel) {
    channel.attached(this)
    channel.connecting()

    this.channels[channel.identifier] = channel
    channel.connected()

    return Promise.resolve(channel.identifier)
  }

  async perform(channel, action, payload = {}) {
    let identifier = channel.identifier

    if (!this.channels[identifier]) {
      throw Error(`Channel not found: ${identifier}`)
    }

    this.outgoing.push({ action, payload })

    return Promise.resolve()
  }

  async unsubscribe(channel) {
    let identifier = channel.identifier

    if (!this.channels[identifier]) {
      throw Error(`Channel not found: ${identifier}`)
    }

    channel.closed()

    delete this.channels[identifier]

    return Promise.resolve()
  }
}
