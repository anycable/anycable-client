export class Subscription {
  constructor(id) {
    this.id = id
    this.intent = 'unsubscribed'
    this.state = 'idle'
    this.channels = []
    this.disposed = false
    this._pendings = []
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
    // TODO: Should we get rid of restored state completely?
    this.state = state === 'restored' ? 'connected' : state

    if (args.length === 1) {
      this.channels.forEach(channel => channel[state](args[0]))
    } else {
      this.channels.forEach(channel => channel[state]())
    }
  }

  pending(intent) {
    this._checkIntent(intent)

    let nextPending = this._pendings[0]

    if (!nextPending || nextPending.intent !== intent) return Promise.resolve()

    return nextPending.promise
  }

  ensureResubscribed() {
    if (this.disposed) return

    this.intent = undefined

    this.ensureSubscribed()
  }

  ensureSubscribed() {
    if (this.intent === 'subscribed') return
    if (this.disposed) throw Error('Subscription is disposed')

    this.intent = 'subscribed'

    let merged = this._mergeWithPending('unsubscribed')
    if (merged) return

    this.subscriber(this)
  }

  maybeUnsubscribe() {
    if (this.disposed) return
    if (this.intent === 'unsubscribed') return

    if (this.channels.length > 0) return

    this.intent = 'unsubscribed'

    let merged = this._mergeWithPending('subscribed')
    if (merged) return

    this.unsubscriber(this)
  }

  async acquire(intent) {
    this._checkIntent(intent)

    let resolver
    let promise = new Promise(resolve => {
      resolver = resolve
    })

    let lock = {
      promise,
      intent,
      release: () => {
        this._pendings.splice(this._pendings.indexOf(lock), 1)
        resolver(lock)
      },
      canceled: false,
      acquired: false
    }

    let top = this._pendingTop

    this._pendings.push(lock)

    if (top) {
      await top.promise
    }

    if (this.gvl) {
      await this.gvl.acquire(lock, intent)
    }

    lock.acquired = true
    return lock
  }

  close(err) {
    this.disposed = true
    this.intent = undefined
    this.notify('closed', err)
  }

  _checkIntent(event) {
    if (event === 'unsubscribed' || event === 'subscribed') return

    throw Error(`Unknown subscription intent: ${event}`)
  }

  get _pendingTop() {
    return this._pendings.length
      ? this._pendings[this._pendings.length - 1]
      : undefined
  }

  _mergeWithPending(intent) {
    let top = this._pendingTop
    if (!top) return false
    if (top.acquired) return false
    if (top.intent !== intent) return false

    this._pendings.pop()
    top.canceled = true
    return true
  }
}

// Use to limit concurrent actions
class GlobalLock {
  constructor() {
    this.queue = []
  }

  async acquire(lock, intent) {
    // We currently only limit subscribe commands
    if (intent !== 'subscribed') return

    this.queue.push(
      lock.promise.then(() => {
        this.queue.splice(this.queue.indexOf(lock), 1)
      })
    )

    if (this.queue.length > 1) {
      await this.queue[this.queue.length - 2]
    }
  }
}

export class Subscriptions {
  constructor(opts) {
    if (opts.concurrentSubscribes === false) {
      this.glv = new GlobalLock()
    }
    this._subscriptions = {}
    this._localToRemote = {}
  }

  all() {
    return Object.values(this._subscriptions)
  }

  get(id) {
    return this._subscriptions[id]
  }

  create(id, { subscribe, unsubscribe }) {
    let sub = (this._subscriptions[id] = new Subscription(id))
    sub.remoteId = this._localToRemote[id]
    sub.subscriber = subscribe
    sub.unsubscriber = unsubscribe
    sub.gvl = this.glv

    return sub
  }

  remove(id) {
    delete this._subscriptions[id]
    delete this._localToRemote[id]
  }

  storeRemoteId(localId, remoteId) {
    this._localToRemote[localId] = remoteId

    let sub = this.get(localId)
    if (sub) sub.remoteId = remoteId
  }
}

export class Hub {
  constructor(opts = {}) {
    this.subscriptions = new Subscriptions(opts)
    this._pendingMessages = []
    this._remoteToLocal = {}
  }

  subscribe(localId, remoteId) {
    this._remoteToLocal[remoteId] = localId

    this.subscriptions.storeRemoteId(localId, remoteId)

    this.flush(remoteId)
  }

  unsubscribe(localId) {
    let sub = this.subscriptions.get(localId)
    if (!sub) return

    let remoteId = sub.remoteId
    if (remoteId) delete this._remoteToLocal[remoteId]

    this.subscriptions.remove(localId)
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

  notify(id, event, payload) {
    let localId = this._remoteToLocal[id]

    if (!localId) {
      return
    }

    let sub = this.subscriptions.get(localId)

    if (!sub) return

    sub.channels.forEach(channel => channel.emit(event, payload))
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
