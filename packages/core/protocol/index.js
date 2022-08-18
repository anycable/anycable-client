/* eslint-disable unicorn/custom-error-definition */
export class ReasonError extends Error {
  constructor(msg, reason) {
    if (msg instanceof Error) {
      super(msg.message)
      this.cause = msg
    } else {
      super(msg)
    }

    this.reason = reason
    this.name = 'ReasonError'
  }
}

export class SubscriptionRejectedError extends ReasonError {
  constructor(reason) {
    super('Rejected', reason)
    this.name = 'SubscriptionRejectedError'
  }
}

export class SubscriptionTimeoutError extends ReasonError {
  constructor(msg) {
    super(msg || 'Timed out to receive subscription ack')
    this.name = 'SubscriptionTimeoutError'
  }
}

export class DisconnectedError extends ReasonError {
  constructor(error, reason) {
    if (reason) {
      super(error, reason)
    } else {
      super('Disconnected', error)
    }
    this.name = 'DisconnectedError'
  }
}

export class CommandError extends Error {
  constructor(msg) {
    super(msg)
    this.name = 'CommandError'
  }
}

export class StaleConnectionError extends DisconnectedError {
  constructor(msg) {
    super(msg, 'stale_connection')
    this.name = 'StaleConnectionError'
  }
}
