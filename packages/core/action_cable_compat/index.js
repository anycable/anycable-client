import { GhostChannel } from '../cable/index.js'
import { SubscriptionRejectedError } from '../protocol/index.js'

// Wrapper over ActionCableChannel that acts like an Action Cable subscription object
export class ActionCableSubscription {
  constructor(channel) {
    this.channel = channel
  }

  notify(callback, ...args) {
    if (typeof this[callback] !== 'function') return

    this[callback](...args)
  }

  perform(action, data = {}) {
    this.channel.perform(action, data)
  }

  send(data) {
    this.channel.send(data)
  }

  whisper(data) {
    return this.channel.whisper(data)
  }

  get identifier() {
    return this.channel.identifier
  }

  unsubscribe() {
    return this.channel.disconnect()
  }
}

class ActionCableChannel extends GhostChannel {
  constructor(channelName, params, mixin) {
    super(channelName, params)

    this.subscription = new ActionCableSubscription(this)
    Object.assign(this.subscription, mixin)

    this.on('connect', ({ reconnect }) =>
      this.subscription.notify('connected', { reconnected: reconnect })
    )
    this.on('disconnect', () =>
      this.subscription.notify('disconnected', { allowReconnect: true })
    )
    this.on('message', val => this.subscription.notify('received', val))
    this.on('close', err => {
      if (err && err instanceof SubscriptionRejectedError) {
        this.subscription.notify('rejected')
      } else {
        this.subscription.notify('disconnected', { allowReconnect: false })
      }
    })
  }
}

export class ActionCableSubscriptions {
  constructor(cable) {
    this.cable = cable
  }

  create(channel, mixin) {
    let channelName
    let params

    if (typeof channel === 'object') {
      channelName = channel.channel
      delete channel.channel
      params = channel
    } else {
      channelName = channel
      params = {}
    }

    let cableChannel = new ActionCableChannel(channelName, params, mixin)
    cableChannel.subscription.notify('initialized')

    this.cable.subscribe(cableChannel)

    return cableChannel.subscription
  }

  findAll(identifier) {
    return this.cable.hub.channels
      .filter(channel => channel.identifier === identifier)
      .map(channel => channel.subscription)
  }
}

export class ActionCableConsumer {
  constructor(cable) {
    this.cable = cable
    this.subscriptions = new ActionCableSubscriptions(cable)
  }

  send(data) {
    return this.cable.send(data)
  }

  connect() {
    return this.cable.connect()
  }

  disconnect() {
    return this.cable.disconnect()
  }

  ensureActiveConnection() {
    return this.cable.connect()
  }
}
