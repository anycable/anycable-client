import { StaleConnectionError } from '../protocol/index.js'

const defaults = {
  maxMissingPings: 2,
  maxReconnectAttempts: Infinity
  // TODO: strategy
}

const now = () => Date.now()

export class Monitor {
  constructor(target, { pingInterval, ...opts }) {
    this.target = target
    this.pingInterval = pingInterval

    if (!this.pingInterval) {
      throw Error(`Incorrect pingInterval is provided: ${pingInterval}`)
    }

    opts = Object.assign({}, defaults, opts)

    this.maxMissingPings = opts.maxMissingPings
    this.maxReconnectAttempts = opts.maxReconnectAttempts
    this.strategy = opts.reconnectStrategy

    this.state = 'pending_connect'
    this.attempts = 0
    this.disconnectedAt = now()

    this.initListeners()
  }

  reconnectNow() {
    if (this.state === 'disconnected' || this.state === 'pending_disconnect') {
      throw Error('Monitor has been disconnected')
    }
    if (this.state === 'connected' || this.state === 'pending_connect') return

    this.cancelReconnect()

    this.state = 'pending_connect'
    this.target.connect()
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
