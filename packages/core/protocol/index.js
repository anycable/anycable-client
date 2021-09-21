export class ReasonError extends Error {
  constructor(msg, reason) {
    super(msg)
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

export class DisconnectedError extends ReasonError {
  constructor(reason) {
    super('Disconnected', reason)
    this.name = 'DisconnectedError'
  }
}

export class CommandError extends Error {
  constructor(msg) {
    super(msg)
    this.name = 'CommandError'
  }
}

export class StaleConnectionError extends Error {
  constructor(msg) {
    super(msg)
    this.name = 'StaleConnectionError'
  }
}
