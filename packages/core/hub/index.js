export class Hub {
  constructor() {
    this.registry = {}
    this.pending = []
  }

  add(id, channel) {
    this.registry[id] = channel

    this.flush(id)
  }

  remove(id) {
    let channel = this.registry[id]

    if (channel) {
      delete this.registry[id]
      return channel
    }

    return undefined
  }

  get(id) {
    return this.registry[id]
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
    this.pending.length = 0
  }

  get size() {
    return Object.keys(this.registry).length
  }

  get channels() {
    return Object.values(this.registry)
  }

  flush(id) {
    let left = []

    for (let item of this.pending) {
      if (item[0] === id) this.transmit(item[0], item[1], item[2])
      else left.push(item)
    }

    this.pending = left
  }
}
