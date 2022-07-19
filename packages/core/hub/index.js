export class PendingRequests {
  constructor() {
    this._store = {}
  }

  add(id, promise) {
    this._store[id] = promise
      .then(() => {
        delete this._store[id]
      })
      .catch(err => {
        if (this._store[id]) {
          delete this._store[id]
          throw err || Error('unknown unsubscribe error')
        }
      })
  }

  get(id) {
    return this._store[id]
  }

  remove(id) {
    delete this._store[id]
  }
}

export class Hub {
  constructor() {
    this._subscriptions = {}
    this._channelsToSubs = new WeakMap()
    this._remoteToLocal = {}
    this._pendingMessages = []
    this.unsubscribes = new PendingRequests()
    this.subscribes = new PendingRequests()
  }

  add(id, channel) {
    this._channelsToSubs.set(channel, id)

    if (this._subscriptions[id]) {
      this._subscriptions[id].channels.push(channel)
    } else {
      this._subscriptions[id] = {
        id,
        channel: channel.channelId,
        params: channel.params,
        channels: [channel]
      }
    }
  }

  findSubscription(id) {
    return this._subscriptions[id]
  }

  channelsFor(id) {
    let sub = this._subscriptions[id]

    if (!sub) return []

    return this._subscriptions[id].channels
  }

  subscribe(id, remoteId) {
    let sub = this._subscriptions[id]

    if (!sub) return

    sub.remoteId = remoteId

    this._remoteToLocal[remoteId] = id

    this.flush(remoteId)
  }

  remove(id) {
    let sub = this._subscriptions[id]
    if (!sub) return

    delete this._subscriptions[id]
    delete this.unsubscribes.remove(id)

    if (sub.remoteId) {
      delete this._remoteToLocal[sub.remoteId]
    }

    sub.channels.forEach(channel => this._channelsToSubs.delete(channel))
  }

  removeChannel(channel) {
    let id = this._channelsToSubs.get(channel)

    if (!id) return

    let sub = this._subscriptions[id]

    // Remove channel from the subscription channels
    sub.channels.splice(sub.channels.indexOf(channel), 1)
    this._channelsToSubs.delete(channel)

    if (sub.channels.length === 0) this.remove(id)
  }

  transmit(id, msg, meta) {
    let localId = this._remoteToLocal[id]

    if (!localId) {
      this._pendingMessages.push([id, msg, meta])
      return
    }

    let sub = this._subscriptions[localId]

    sub.channels.forEach(channel => {
      channel.receive(msg, meta)
    })
  }

  close() {
    this._pendingMessages.length = 0
    this._unsubscribeRequests = {}
  }

  get size() {
    return this.channels.length
  }

  get subscriptions() {
    return Object.values(this._subscriptions)
  }

  get activeSubscriptions() {
    return this.subscriptions.filter(sub => !!sub.remoteId)
  }

  get pendingSubscriptions() {
    return this.subscriptions.filter(sub => !sub.remoteId)
  }

  get channels() {
    return this.subscriptions.flatMap(sub => sub.channels)
  }

  get pendingChannels() {
    return this.pendingSubscriptions.flatMap(sub => sub.channels)
  }

  get activeChannels() {
    return this.activeSubscriptions.flatMap(sub => sub.channels)
  }

  flush(id) {
    let left = []

    for (let item of this._pendingMessages) {
      if (item[0] === id) this.transmit(item[0], item[1], item[2])
      else left.push(item)
    }

    this._pendingMessages = left
  }
}
