import { ActionCableProtocol } from '../action_cable/index.js'

const now = () => (Date.now() / 1000) | 0

export class ActionCableExtendedProtocol extends ActionCableProtocol {
  constructor(opts = {}) {
    super(opts)

    this.streamsPositions = {}
    this.subscriptionStreams = {}
    this.pendingHistory = {}
    this.restoreSince = opts.historyTimestamp
    if (this.restoreSince === undefined) this.restoreSince = now()
    this.sessionId = undefined
    this.sendPongs = opts.pongs
  }

  receive(msg) {
    /* eslint-disable consistent-return */
    if (typeof msg !== 'object') {
      this.logger.error('unsupported message format', { message: msg })
      return
    }

    let { type, identifier, message } = msg

    // These message types do not require special handling
    if (type === 'disconnect' || type === 'reject_subscription') {
      return super.receive(msg)
    }

    if (type === 'confirm_subscription') {
      if (!this.subscriptionStreams[identifier]) {
        this.subscriptionStreams[identifier] = new Set()
      }

      return super.receive(msg)
    }

    if (type === 'ping') {
      if (!this.restoreSince === false) {
        this.restoreSince = now()
      }

      if (this.sendPongs) {
        this.sendPong()
      }

      return this.cable.keepalive(msg.message)
    } else {
      // Any incoming message may be considered as a heartbeat
      this.cable.keepalive()
    }

    if (type === 'confirm_history') {
      this.logger.debug('history result received', msg)
      return
    }

    if (type === 'reject_history') {
      this.logger.warn('failed to retrieve history', msg)
      return
    }

    if (type === 'welcome') {
      this.sessionId = msg.sid

      if (this.sessionId) this.cable.setSessionId(this.sessionId)

      if (msg.restored) {
        let restoredIds =
          msg.restored_ids || Object.keys(this.subscriptionStreams)
        for (let restoredId of restoredIds) {
          this.cable.send({
            identifier: restoredId,
            command: 'history',
            history: this.historyRequestFor(restoredId)
          })
        }

        return this.cable.restored(restoredIds)
      }

      return this.cable.connected(this.sessionId)
    }

    if (message) {
      let meta = this.trackStreamPosition(
        identifier,
        msg.stream_id,
        msg.epoch,
        msg.offset
      )
      return { identifier, message, meta }
    }

    this.logger.warn(`unknown message type: ${type}`, { message: msg })
  }

  buildSubscribeRequest(identifier) {
    let req = super.buildSubscribeRequest(identifier)

    let historyReq = this.historyRequestFor(identifier)

    if (historyReq) {
      req.history = historyReq

      this.pendingHistory[identifier] = true
    }

    return req
  }

  // TODO: Which error can be non-recoverable?
  recoverableClosure() {
    return !!this.sessionId
  }

  historyRequestFor(identifier) {
    let streams = {}
    let hasStreams = false

    if (this.subscriptionStreams[identifier]) {
      for (let stream of this.subscriptionStreams[identifier]) {
        let record = this.streamsPositions[stream]
        if (record) {
          hasStreams = true
          streams[stream] = record
        }
      }
    }

    if (!hasStreams && !this.restoreSince) return

    return { since: this.restoreSince, streams }
  }

  trackStreamPosition(identifier, stream, epoch, offset) {
    if (!stream || !epoch) return

    if (!this.subscriptionStreams[identifier]) {
      this.subscriptionStreams[identifier] = new Set()
    }

    this.subscriptionStreams[identifier].add(stream)

    this.streamsPositions[stream] = { epoch, offset }

    return { stream, epoch, offset }
  }

  // Send pongs asynchrounously—no need to block the main thread
  async sendPong() {
    await new Promise(resolve => setTimeout(resolve, 0))
    this.cable.send({ command: 'pong' })
  }
}
