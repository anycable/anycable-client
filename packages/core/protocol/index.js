export class SubscriptionRejectedError extends Error {
  constructor(reason) {
    super('Rejected')
    this.reason = reason
    this.name = 'SubscriptionRejectedError'
  }
}

export class DisconnectedError extends Error {
  constructor(reason) {
    super('Disconnected')
    this.reason = reason
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
