import { Consumer, ReasonError } from '../index.js'

type State = 'idle' | 'connected' | 'restored' | 'disconnected' | 'closed'

export class TestConsumer implements Consumer {
  state: State
  mailbox: object[]
  lastPingedAt!: number

  constructor() {
    this.state = 'idle'
    this.mailbox = []
  }

  connected() {
    this.state = 'connected'
  }

  restored() {
    this.state = 'restored'
  }

  disconnected(err?: ReasonError) {
    this.state = 'disconnected'
    if (err?.reason) {
      this.mailbox.push({ type: 'disconnect', reason: err.reason })
    }
  }

  send(msg: object) {
    this.mailbox.push(msg)
  }

  closed(err?: string | ReasonError) {
    this.state = 'closed'
    if (!err) return

    let reason = typeof err === 'string' ? err : err.reason

    if (reason) {
      this.mailbox.push({ type: 'close', reason })
    }
  }

  keepalive(msg: number) {
    this.lastPingedAt = msg | 0
  }
}
