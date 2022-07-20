import { createCable, Message, Channel, Cable, BaseLogger } from '../index.js'
import { TestTransport } from '../transport/testing'

class CableTransport extends TestTransport {
  pingTid?: any
  subscriptions: any

  constructor(url: string) {
    super(url)

    this.subscriptions = {}
  }

  open() {
    let promise = super.open()
    this.sendLater({ type: 'welcome' })
    this.pingTid = setInterval(() => {
      this.sendLater({ type: 'ping' })
    }, 500)
    return promise
  }

  send(data: string) {
    let msg = JSON.parse(data)

    this.sent.push(msg)

    let identifier = msg.identifier
    let command = msg.command

    if (command === 'subscribe') {
      if (!identifier) {
        this.sendLater({ type: 'reject_subscription', identifier })
        return
      }

      if (!this.subscriptions[identifier]) {
        this.subscriptions[identifier] = true
        this.sendLater({ type: 'confirm_subscription', identifier })
      }
    } else if (command === 'unsubscribe') {
      delete this.subscriptions[identifier]
    } else if (command === 'message') {
      if (this.subscriptions[identifier]) {
        let payload = JSON.parse(msg.data)

        if (payload.action === 'echo') {
          this.sendLater({ message: payload, identifier })
        }
      } else {
        this.sendLater({
          type: 'error',
          message: 'no subscription',
          identifier
        })
      }
    }
  }

  close() {
    let res = super.close()
    if (this.pingTid) clearInterval(this.pingTid)

    return res
  }

  sendLater(data: Message) {
    setTimeout(() => {
      this.receive(JSON.stringify(data))
    }, 100)
  }
}

class Logger extends BaseLogger {
  /* eslint-disable no-console */
  writeLogEntry(level: string, msg: string, details: any) {
    if (details) {
      console.log(`[${level}] ${msg}`, details)
    } else {
      console.log(`[${level}] ${msg}`)
    }
  }
}

let waitSec = (val?: number) => {
  return new Promise<void>(resolve => {
    setTimeout(resolve, val || 100)
  })
}

describe('Action Cable protocol communication', () => {
  let transport: TestTransport
  let cable: Cable

  beforeEach(() => {
    transport = new CableTransport('ws://anycable.test')

    cable = createCable('ws://example', {
      transport
    })
  })

  it('connects', async () => {
    await cable.connect()
    expect(cable.state).toEqual('connected')
  })

  it('subscribes and perform', async () => {
    await cable.connect()

    let channel = cable.subscribeTo('TestChannel', { id: '2' })

    await channel.ensureSubscribed()

    expect(channel.state).toEqual('connected')
  })

  it('receives pings', async () => {
    let keepalivePromise = new Promise<void>((resolve, reject) => {
      let tid = setTimeout(() => {
        reject(Error('Timed out to received pings'))
      }, 1000)

      cable.on('keepalive', () => {
        clearTimeout(tid)
        resolve()
      })
    })

    cable.connect()

    await keepalivePromise
  })

  describe('basic race conditions', () => {
    it('subscribed - unsubscribe + subscribe + usubscribe', async () => {
      cable.connect()

      let channel = cable.subscribeTo('TurboChannel', { stream_id: '1' })
      await channel.ensureSubscribed()

      await Promise.resolve()

      expect(transport.sent).toHaveLength(1)

      channel.disconnect()
      cable.subscribe(channel)
      channel.disconnect()

      // Wait for all promises to resolve
      await cable.hub.subscriptions
        .get(channel.identifier)!
        .pending('subscribed')
      await cable.hub.subscriptions
        .get(channel.identifier)!
        .pending('unsubscribed')

      expect(channel.state).toBe('closed')
      // origial subscribe + usubscribe
      expect(transport.sent).toHaveLength(2)
    })

    it('subscribe + unsubscribe', async () => {
      await cable.connect()

      let channel = cable.subscribeTo('TurboChannel', { stream_id: '1' })
      await Promise.resolve()

      channel.disconnect()

      // Wait for all promises to resolve
      await cable.hub.subscriptions
        .get(channel.identifier)!
        .pending('subscribed')
      await cable.hub.subscriptions
        .get(channel.identifier)!
        .pending('unsubscribed')

      expect(channel.state).toBe('closed')
      expect(cable.hub.size).toBe(0)
    })

    it('subscribe rejected + unsubscribe', async () => {
      await cable.connect()

      let channel = cable.subscribeTo('')
      await Promise.resolve()

      channel.disconnect()

      // Wait for all promises to resolve
      await cable.hub.subscriptions
        .get(channel.identifier)!
        .pending('subscribed')
      await cable.hub.subscriptions
        .get(channel.identifier)!
        .pending('unsubscribed')

      expect(channel.state).toBe('closed')
      expect(cable.hub.size).toBe(0)
    })
  })

  // See https://github.com/anycable/anycable-client/issues/18
  describe('hotwire madness', () => {
    it('handles subscribe/unsubscribe race conditions', async () => {
      await cable.connect()

      let channel!: Channel

      for (let i = 0; i < 5; i++) {
        let ichannel = cable.subscribeTo('TurboChannel', { stream_id: '1' })

        if (i < 4) {
          await Promise.resolve()
          ichannel.disconnect()
        }

        channel = ichannel

        await waitSec(Math.random() * 100)
      }

      await channel.ensureSubscribed()

      expect(channel.state).toEqual('connected')

      // Wait for all promises to resolve
      await cable.hub.subscriptions
        .get(channel.identifier)!
        .pending('subscribed')
      await cable.hub.subscriptions
        .get(channel.identifier)!
        .pending('unsubscribed')

      let messagePromise = new Promise<Message>((resolve, reject) => {
        let tid = setTimeout(() => {
          reject(Error('Timed out to receive messages'))
        }, 200)

        channel.on('message', msg => {
          clearTimeout(tid)
          resolve(msg)
        })
      })

      channel.perform('echo', { foo: 'bar' })

      let res = await messagePromise
      expect(res).toEqual({ foo: 'bar', action: 'echo' })
    })
  })
})
