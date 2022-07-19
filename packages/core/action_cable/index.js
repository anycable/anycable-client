import {
  SubscriptionRejectedError,
  SubscriptionTimeoutError,
  DisconnectedError
} from '../protocol/index.js'
import { stringifyParams } from '../stringify-params/index.js'
import { NoopLogger } from '../logger/index.js'

export class ActionCableProtocol {
  constructor(opts = {}) {
    let { logger } = opts
    this.logger = logger || new NoopLogger()
    this.pendingSubscriptions = {}
    this.pendingUnsubscriptions = {}
    // For how long to wait before sending `subscribe` command
    // in case `unsubscribe` was sent for the same identifier
    this.subscribeCooldownInterval = opts.subscribeCooldownInterval || 500
    // For how long to wait for subscription acknoledgement before trying again
    // (just once).
    this.subscribeRetryInterval = opts.subscribeRetryInterval || 5000
  }

  attached(cable) {
    this.cable = cable
  }

  subscribe(channel, params) {
    let subscriptionPayload = { channel }
    if (params) {
      Object.assign(subscriptionPayload, params)
    }

    let identifier = stringifyParams(subscriptionPayload)

    if (this.pendingUnsubscriptions[identifier]) {
      let cooldown = this.subscribeCooldownInterval * 1.5
      this.logger.debug(
        `unsubscribed recently, cooldown for ${cooldown}`,
        identifier
      )
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(this.subscribe(channel, params))
        }, cooldown)
      })
    }

    if (this.pendingSubscriptions[identifier]) {
      this.logger.warn('subscription is already pending, skipping', identifier)
      return Promise.reject(Error('Already subscribing'))
    }

    let retryInterval = this.subscribeRetryInterval

    return new Promise((resolve, reject) => {
      this.pendingSubscriptions[identifier] = { resolve, reject }

      this.cable.send({
        command: 'subscribe',
        identifier
      })

      setTimeout(() => {
        // Subscription is still pending
        if (this.pendingSubscriptions[identifier]) {
          this.logger.warn(
            `no subscription ack received in ${retryInterval}ms`,
            identifier
          )
          delete this.pendingSubscriptions[identifier]
          reject(
            new SubscriptionTimeoutError(
              `Haven't received subscription ack in ${retryInterval}ms for ${identifier}`
            )
          )
        }
      }, retryInterval)
    })
  }

  unsubscribe(identifier) {
    this.cable.send({
      command: 'unsubscribe',
      identifier
    })

    this.pendingUnsubscriptions[identifier] = true

    setTimeout(() => {
      delete this.pendingUnsubscriptions[identifier]
    }, this.subscribeCooldownInterval)

    return Promise.resolve()
  }

  perform(identifier, action, payload) {
    if (!payload) {
      payload = {}
    }

    payload.action = action

    this.cable.send({
      command: 'message',
      identifier,
      data: JSON.stringify(payload)
    })

    return Promise.resolve()
  }

  receive(msg) {
    /* eslint-disable consistent-return */
    if (typeof msg !== 'object') {
      this.logger.error('unsupported message format', { message: msg })
      return
    }

    let { type, identifier, message, reason, reconnect } = msg

    if (type === 'ping') return this.cable.keepalive(msg.message)

    if (type === 'welcome') {
      return this.cable.connected()
    }

    if (type === 'disconnect') {
      let err = new DisconnectedError(reason)
      this.reset(err)

      if (reconnect === false) {
        this.cable.closed(err)
      } else {
        this.cable.disconnected(err)
      }
      return
    }

    if (type === 'confirm_subscription') {
      let subscription = this.pendingSubscriptions[identifier]
      if (!subscription) {
        return this.logger.error('subscription not found', { type, identifier })
      }

      delete this.pendingSubscriptions[identifier]

      return subscription.resolve(identifier)
    }

    if (type === 'reject_subscription') {
      let subscription = this.pendingSubscriptions[identifier]
      if (!subscription) {
        return this.logger.error('subscription not found', { type, identifier })
      }

      delete this.pendingSubscriptions[identifier]

      return subscription.reject(new SubscriptionRejectedError())
    }

    if (message) {
      return { identifier, message }
    }

    this.logger.warn(`unknown message type: ${type}`, { message: msg })
  }

  reset(err) {
    // Reject pending subscriptions
    for (let identifier in this.pendingSubscriptions) {
      this.pendingSubscriptions[identifier].reject(err)
    }

    this.pendingSubscriptions = {}
  }

  recoverableClosure() {
    return false
  }
}
