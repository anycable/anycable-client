import { Consumer } from '../index.js'

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

  disconnected(reason?: string) {
    this.state = 'disconnected'
    if (reason) {
      this.mailbox.push({ type: 'disconnect', reason })
    }
  }

  send(msg: object) {
    this.mailbox.push(msg)
  }

  close(reason?: string) {
    this.state = 'closed'
    if (reason) {
      this.mailbox.push({ type: 'close', reason })
    }
  }

  keepalive(msg: number) {
    this.lastPingedAt = msg | 0
  }
}
