import { ActionCableProtocol } from '../action_cable/index.js'

const now = () => (Date.now() / 1000) | 0

export class ActionCableExtendedProtocol extends ActionCableProtocol {
  constructor(opts = {}) {
    super(opts)

    this.streamsPositions = {}
    this.subscriptionStreams = {}
    this.restoreSince = opts.historyTimestamp || now()
    this.sessionId = undefined
  }

  receive(msg) {
    /* eslint-disable consistent-return */
    if (typeof msg !== 'object') {
      this.logger.error('unsupported message format', { message: msg })
      return
    }

    let { type, identifier, message } = msg

    // These message types do not require special handling
    if (
      type === 'disconnect' ||
      type === 'confirm_subscription' ||
      type === 'reject_subscription'
    ) {
      return super.receive(msg)
    }

    if (type === 'ping') {
      this.restoreSince = now()
      return this.cable.keepalive(msg.message)
    }

    if (type === 'welcome') {
      this.sessionId = msg.sid

      if (this.sessionId) {
        this.addSessionIdToUrl()
      }

      if (msg.restored) {
        this.cable.restored()

        for (let streamIdentifier in this.subscriptionStreams) {
          this.cable.send({
            identifier: streamIdentifier,
            command: "history",
            history: this.historyRequestFor(identifier)
          })
        }
      }

      return this.cable.connected()
    }

    if (message) {
      this.trackStreamPosition(identifier, msg.stream_id, msg.epoch, msg.offset)
      return { identifier, message }
    }

    this.logger.warn(`unknown message type: ${type}`, { message: msg })
  }

  buildSubscribeRequest(identifier) {
    return {
      command: 'subscribe',
      identifier,
      history: this.historyRequestFor(identifier)
    }
  }

  // TODO: Which error can be non-recoverable?
  recoverableClosure() {
    return !!this.sessionId
  }

  historyRequestFor(identifier) {
    let streams = {}

    if (this.subscriptionStreams[identifier]) {
      for (let stream of this.subscriptionStreams[identifier]) {
        let record = this.streamsPositions[stream]
        if (record) {
          streams[stream] = record
        }
      }
    }

    return { since: this.restoreSince, streams }
  }

  trackStreamPosition(identifier, stream, epoch, offset) {
    if (!stream || !epoch) return

    if (!this.subscriptionStreams[identifier]) {
      this.subscriptionStreams[identifier] = new Set()
    }

    this.subscriptionStreams[identifier].add(stream)
    this.streamsPositions[stream] = {epoch, offset}
  }

  addSessionIdToUrl() {
    let transport = this.cable.transport;

    // TODO: replace with transport.setParam('sid', this.sessionId)
    let url = new URL(transport.url);
    url.searchParams.set("sid", this.sessionId);
    let newURL = `${url.protocol}//${url.host}${url.pathname}?${url.searchParams}`;
    transport.setURL(newURL);
  }
}
