import {
  SubscriptionRejectedError,
  DisconnectedError
} from '../protocol/index.js'
import { NoopLogger } from '../logger/index.js'

export class ActionCableProtocol {
  constructor(cable, opts = {}) {
    let { logger } = opts
    this.logger = logger || new NoopLogger()
    this.cable = cable
    this.pendingSubscriptions = {}
  }

  subscribe(channel, params) {
    if (!params) {
      params = {}
    }

    params.channel = channel

    return new Promise((resolve, reject) => {
      let identifier = JSON.stringify(params)

      this.pendingSubscriptions[identifier] = { resolve, reject }

      this.cable.send({
        command: 'subscribe',
        identifier
      })
    })
  }

  unsubscribe(identifier) {
    this.cable.send({
      command: 'unsubscribe',
      identifier
    })

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
      data: payload
    })

    return Promise.resolve()
  }

  receive(msg) {
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
      this.reset(new DisconnectedError(reason))

      if (reconnect === false) {
        this.cable.close(reason)
      } else {
        this.cable.disconnected(reason)
      }
      return
    }

    if (type === 'confirm_subscription') {
      let subscription = this.pendingSubscriptions[identifier]
      if (!subscription) {
        return this.logger.error('subscription not found', { identifier })
      }

      return subscription.resolve(identifier)
    }

    if (type === 'reject_subscription') {
      let subscription = this.pendingSubscriptions[identifier]
      if (!subscription) {
        return this.logger.error('subscription not found', { identifier })
      }

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
