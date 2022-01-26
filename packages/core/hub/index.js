export class Entry {
  constructor() {
    this.refs = 0
    this.pendingSubscription = undefined
  }

  mark() {
    this.refs++
  }

  unmark() {
    this.refs--
  }

  isFree() {
    return this.refs === 0
  }

  isPending() {
    return !!this.pendingSubscription
  }

  pending(promise) {
    if (this.pendingSubscription) return this.pendingSubscription

    return (this.pendingSubscription = promise.finally(() => {
      delete this.pendingSubscription
    }))
  }
}

export class Hub {
  constructor() {
    this.registry = {}
    this.entries = new WeakMap()
    this.pendingMessages = []
  }

  entryFor(channel) {
    let entry = this.entries.get(channel)

    if (!entry) {
      this.entries.set(channel, new Entry())
    }

    return this.entries.get(channel)
  }

  add(id, channel) {
    this.registry[id] = channel

    this.flush(id)
  }

  remove(id) {
    let channel = this.registry[id]

    if (channel) {
      delete this.registry[id]
      this.entries.delete(channel)
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
      this.pendingMessages.push([id, msg, meta])
    }
  }

  close() {
    this.pendingMessages.length = 0
  }

  get size() {
    return Object.keys(this.registry).length
  }

  get channels() {
    return Object.values(this.registry)
  }

  flush(id) {
    let left = []

    for (let item of this.pendingMessages) {
      if (item[0] === id) this.transmit(item[0], item[1], item[2])
      else left.push(item)
    }

    this.pendingMessages = left
  }
}
