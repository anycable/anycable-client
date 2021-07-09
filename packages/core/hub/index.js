export class Hub {
  constructor() {
    this.registry = {}
    this.pending = []
  }

  add(id, channel) {
    this.registry[id] = channel
  }

  remove(id) {
    let channel = this.registry[id]

    if (channel) {
      delete this.registry[id]
      return channel
    }

    return undefined
  }

  transmit(id, msg, meta) {
    let channel = this.registry[id]

    if (channel) {
      channel.receive(msg, meta)
    } else {
      this.pending.push([id, msg, meta])
    }
  }

  close() {
    this.registry = {}
    this.pending.length = 0
  }

  get size() {
    return Object.keys(this.registry).length
  }

  get channels() {
    return Object.values(this.registry)
  }
}
