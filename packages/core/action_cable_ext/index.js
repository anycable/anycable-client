import { ActionCableProtocol } from '../action_cable/index.js'

const now = () => (Date.now() / 1000) | 0

export class ActionCableExtendedProtocol extends ActionCableProtocol {
  constructor(opts = {}) {
    super(opts)

    this.streamsPositions = {}
    this.subscriptionStreams = {}
    this.pendingHistory = {}
    this.pendingPresence = {}
    this.presenceInfo = {}
    this.restoreSince = opts.historyTimestamp
    if (this.restoreSince === undefined) this.restoreSince = now()
    this.sessionId = undefined
    this.sendPongs = opts.pongs
  }

  reset(err) {
    // Reject pending presence
    for (let identifier in this.pendingPresence) {
      this.pendingPresence[identifier].reject(err)
    }

    this.pendingPresence = {}

    return super.reset()
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
      this.cable.notify('history_received', identifier)
      return
    }

    if (type === 'reject_history') {
      this.logger.warn('failed to retrieve history', msg)
      this.cable.notify('history_not_found', identifier)
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

          if (this.presenceInfo[restoredId]) {
            this.cable.send({
              identifier: restoredId,
              command: 'join',
              presence: this.presenceInfo[restoredId]
            })
          }
        }

        return this.cable.restored(restoredIds)
      }

      return this.cable.connected(this.sessionId)
    }

    if (type === 'presence') {
      let pending = this.pendingPresence[identifier]

      if (!pending) {
        this.logger.warn('unexpected presence response', msg)
        return
      }

      delete this.pendingPresence[identifier]

      pending.resolve(message)

      return {
        type: 'presence',
        identifier,
        message
      }
    }

    if (type === 'presence_error') {
      let pending = this.pendingPresence[identifier]

      if (!pending) {
        this.logger.warn('unexpected presence response', msg)
        return
      }

      delete this.pendingPresence[identifier]

      pending.reject(new Error('failed to retrieve presence'))

      return
    }

    if (type === 'join' || type === 'leave') {
      return {
        type,
        identifier,
        message
      }
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

  perform(identifier, action, payload) {
    // Handle presence actions
    switch (action) {
      case '$presence:join':
        return this.join(identifier, payload)
      case '$presence:leave':
        return this.leave(identifier, payload)
      case '$presence:info':
        return this.presence(identifier, payload)
    }

    return super.perform(identifier, action, payload)
  }

  unsubscribe(identifier) {
    delete this.presenceInfo[identifier]

    return super.unsubscribe(identifier)
  }

  buildSubscribeRequest(identifier) {
    let req = super.buildSubscribeRequest(identifier)

    let historyReq = this.historyRequestFor(identifier)

    if (historyReq) {
      req.history = historyReq

      this.pendingHistory[identifier] = true
    }

    let presence = this.presenceInfo[identifier]

    if (presence) {
      req.presence = presence
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
    // Only send pong if the connection is still open
    if (this.cable.state === 'connected') {
      this.cable.send({ command: 'pong' })
    }
  }

  async join(identifier, presence) {
    this.presenceInfo[identifier] = presence

    this.cable.send({
      command: 'join',
      identifier,
      presence
    })

    return Promise.resolve()
  }

  async leave(identifier, presence) {
    delete this.presenceInfo[identifier]

    this.cable.send({
      command: 'leave',
      identifier,
      presence
    })

    return Promise.resolve()
  }

  presence(identifier, data) {
    if (this.pendingPresence[identifier]) {
      this.logger.warn('presence is already pending, skipping', identifier)
      return Promise.reject(Error('Already requesting presence'))
    }

    return new Promise((resolve, reject) => {
      this.pendingPresence[identifier] = {
        resolve,
        reject
      }

      this.cable.send({
        command: 'presence',
        identifier,
        data
      })
    })
  }
}
