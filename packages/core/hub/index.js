export class Subscription {
  constructor(id) {
    this.id = id
    this.intent = 'unsubscribed'
    this.state = 'idle'
    this.channels = []
    this._pendings = {}
  }

  add(channel) {
    if (this.channels.includes(channel)) return

    this.channels.push(channel)
  }

  remove(channel) {
    let ind = this.channels.indexOf(channel)

    if (ind > -1) this.channels.splice(ind, 1)
  }

  notify(state, ...args) {
    this.state = state

    if (args.length === 1) {
      this.channels.forEach(channel => channel[state](args[0]))
    } else {
      this.channels.forEach(channel => channel[state]())
    }
  }

  /* eslint-disable consistent-return */
  pending(event, promise) {
    if (!promise) return this._pendings[event] || Promise.resolve()

    if (this._pendings[event]) throw Error(`Already pending ${event}`)

    this._pendings[event] = promise
      .then(() => {
        delete this._pendings[event]
      })
      .catch(() => {
        delete this._pendings[event]
      })
  }

  hasPending(event) {
    return !!this._pendings[event]
  }
}

export class Subscriptions {
  constructor() {
    this._subscriptions = {}
    this._localToRemote = {}
  }

  all() {
    return Object.values(this._subscriptions)
  }

  get(id) {
    return this._subscriptions[id]
  }

  fetch(id) {
    let sub = this._subscriptions[id]

    if (sub) return sub

    sub = this._subscriptions[id] = new Subscription(id)
    sub.remoteId = this._localToRemote[id]

    return sub
  }

  remove(id) {
    delete this._subscriptions[id]
  }

  storeRemoteId(localId, remoteId) {
    this._localToRemote[localId] = remoteId

    let sub = this.get(localId)
    if (sub) sub.remoteId = remoteId
  }
}

export class Hub {
  constructor() {
    this.subscriptions = new Subscriptions()
    this._pendingMessages = []
    this._remoteToLocal = {}
  }

  subscribe(localId, remoteId) {
    this._remoteToLocal[remoteId] = localId

    this.subscriptions.storeRemoteId(localId, remoteId)

    this.flush(remoteId)
  }

  transmit(id, msg, meta) {
    let localId = this._remoteToLocal[id]

    if (!localId) {
      this._pendingMessages.push([id, msg, meta])
      return
    }

    let sub = this.subscriptions.get(localId)

    if (!sub) return

    sub.channels.forEach(channel => {
      channel.receive(msg, meta)
    })
  }

  close() {
    this._pendingMessages.length = 0
  }

  get size() {
    return this.channels.length
  }

  get channels() {
    return this.subscriptions.all().flatMap(sub => sub.channels)
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
