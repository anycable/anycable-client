import { StaleConnectionError } from '../protocol/index.js'
import { NoopLogger } from '../logger/index.js'

const defaults = {
  maxMissingPings: 2,
  maxReconnectAttempts: Infinity
}

const now = () => Date.now()

export const backoffWithJitter = (interval, opts) => {
  opts = opts || {}
  let { backoffRate, jitterRatio, maxInterval } = opts
  backoffRate = backoffRate || 2
  if (jitterRatio === undefined) jitterRatio = 0.5

  return attempts => {
    let left = interval * backoffRate ** attempts
    let right = left * backoffRate

    let delay = left + (right - left) * Math.random()

    let deviation = 2 * (Math.random() - 0.5) * jitterRatio

    delay = delay * (1 + deviation)

    if (maxInterval && maxInterval < delay) delay = maxInterval

    return delay
  }
}

export class Monitor {
  constructor({ pingInterval, ...opts }) {
    this.pingInterval = pingInterval

    if (!this.pingInterval) {
      throw Error(`Incorrect pingInterval is provided: ${pingInterval}`)
    }

    opts = Object.assign({}, defaults, opts)

    this.strategy = opts.reconnectStrategy
    if (!this.strategy) {
      throw Error('Reconnect strategy must be provided')
    }

    this.maxMissingPings = opts.maxMissingPings
    this.maxReconnectAttempts = opts.maxReconnectAttempts
    this.logger = opts.logger || new NoopLogger()

    this.state = 'pending_connect'
    this.attempts = 0
    this.disconnectedAt = now()
  }

  watch(target) {
    this.target = target
    this.initListeners()
  }

  reconnectNow() {
    if (this.state === 'connected' || this.state === 'pending_connect') {
      return false
    }

    this.cancelReconnect()

    this.state = 'pending_connect'
    this.target.connect()

    return true
  }

  initListeners() {
    this.unbind = []

    this.unbind.push(
      this.target.on('connect', () => {
        this.attempts = 0
        this.pingedAt = now()
        this.state = 'connected'

        this.cancelReconnect()
        this.startPolling()
      })
    )

    this.unbind.push(
      this.target.on('disconnect', () => {
        this.disconnectedAt = now()
        this.state = 'disconnected'

        this.stopPolling()
        this.scheduleReconnect()
      })
    )

    this.unbind.push(
      this.target.on('close', () => {
        this.disconnectedAt = now()
        this.state = 'disconnected'

        this.cancelReconnect()
        this.stopPolling()
      })
    )

    this.unbind.push(
      this.target.on('keepalive', () => {
        this.pingedAt = now()
      })
    )

    this.unbind.push(() => {
      this.cancelReconnect()
      this.stopPolling()
    })
  }

  dispose() {
    delete this.target
    if (this.unbind) {
      this.unbind.forEach(clbk => clbk())
    }
    delete this.unbind
  }

  startPolling() {
    if (this.pollId) {
      clearTimeout(this.pollId)
    }

    let pollDelay =
      this.pingInterval + (Math.random() - 0.5) * this.pingInterval * 0.5

    this.pollId = setTimeout(() => {
      this.checkStale()
      if (this.state === 'connected') this.startPolling()
    }, pollDelay)
  }

  stopPolling() {
    if (this.pollId) {
      clearTimeout(this.pollId)
    }
  }

  checkStale() {
    let diff = now() - this.pingedAt

    if (diff > this.maxMissingPings * this.pingInterval) {
      this.logger.warn(`Stale connection: ${diff}ms without pings`)
      this.state = 'pending_disconnect'
      this.target.disconnected(new StaleConnectionError())
    }
  }

  scheduleReconnect() {
    if (this.attempts >= this.maxReconnectAttempts) {
      this.target.close()
      return
    }

    let delay = this.strategy(this.attempts)

    this.attempts++

    this.logger.info(`Reconnecting in ${delay}ms (${this.attempts} attempt)`)

    this.state = 'pending_reconnect'

    this.reconnnectId = setTimeout(() => this.reconnectNow(), delay)
  }

  cancelReconnect() {
    if (this.reconnnectId) {
      clearTimeout(this.reconnnectId)
      delete this.reconnnectId
    }
  }
}
