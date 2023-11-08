import { CableOptions, GhostChannel } from '../cable/index.js'
import {
  createCable,
  Message,
  Channel,
  Cable,
  BaseLogger,
  DisconnectedError,
  ActionCableProtocol,
  ActionCableExtendedProtocol,
  CreateOptions
} from '../index.js'
import { TestTransport } from '../transport/testing'
import { ProtocolID } from './index.js'

class CableTransport extends TestTransport {
  pingTid?: any
  subscriptions: any
  pongsCount: number = 0
  nextSid: string = ''
  nextRestoredIds: string[] | null = null

  constructor(url: string) {
    super(url)

    this.subscriptions = {}
  }

  open() {
    let promise = super.open()
    this.subscriptions = {}
    if (this.nextSid) {
      let sid = this.nextSid
      this.nextSid = ''
      if (this.nextRestoredIds) {
        this.sendLater({
          type: 'welcome',
          sid,
          restored: true,
          restored_ids: this.nextRestoredIds
        })
        this.nextRestoredIds = null
      } else {
        this.sendLater({ type: 'welcome', sid })
      }
    } else {
      this.sendLater({ type: 'welcome' })
    }
    this.pingTid = setInterval(() => {
      this.sendLater({ type: 'ping', message: Date.now() })
    }, 500)
    return promise
  }

  send(data: string) {
    let msg = JSON.parse(data)

    this.sent.push(data)

    let identifier = msg.identifier
    let command = msg.command

    if (command === 'pong') {
      this.pongsCount++
    } else if (command === 'subscribe') {
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

class TestChannel extends Channel {
  static identifier = 'TestChannel'
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
  let transport: CableTransport
  let cable: Cable
  let opts: Partial<CreateOptions<ProtocolID>>

  beforeEach(() => {
    transport = new CableTransport('ws://anycable.test')

    opts = {
      transport
    }

    if (process.env.DEBUG === '1') {
      opts.logger = new Logger('debug')
    }

    cable = createCable('ws://example', opts)

    let acprotocol = cable.protocol as ActionCableProtocol
    acprotocol.subscribeRetryInterval = 2000
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

      cable.on('keepalive', msg => {
        if (!msg) return
        clearTimeout(tid)
        resolve()
      })
    })

    cable.connect()

    await keepalivePromise
  })

  it('responds with pongs when enabled', async () => {
    let extOpts: Partial<CreateOptions<'actioncable-v1-ext-json'>> = {
      protocol: 'actioncable-v1-ext-json',
      protocolOptions: { pongs: true },
      transport: opts.transport,
      logger: opts.logger
    }

    cable = createCable('ws://example', extOpts)

    let keepalivePromise = new Promise<void>((resolve, reject) => {
      let tid = setTimeout(() => {
        reject(Error('Timed out to received pings'))
      }, 1000)

      cable.on('keepalive', async msg => {
        if (!msg) return

        clearTimeout(tid)

        await waitSec(0)
        resolve()
      })
    })

    cable.connect()

    await keepalivePromise

    expect(transport.pongsCount).toBeGreaterThan(0)
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

    it('subscribed - unsubscribe + disconnect + subscribe + connected + (resubscribe)', async () => {
      cable.connect()

      let channel = cable.subscribeTo('TurboChannel', { stream_id: '1' })
      await channel.ensureSubscribed()

      await Promise.resolve()

      expect(transport.sent).toHaveLength(1)

      channel.disconnect()
      transport.close()

      await Promise.resolve()
      cable.subscribe(channel)

      await Promise.resolve()
      cable.connect()

      await channel.ensureSubscribed()

      expect(channel.state).toBe('connected')

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

    it('subscribed - unsubscribe + subscribe + unsubscribe + confirmed + subscribe', async () => {
      cable.connect()

      let channel = cable.subscribeTo('TurboChannel', { stream_id: '1' })
      await channel.ensureSubscribed()

      await Promise.resolve()

      expect(cable.hub.size).toEqual(1)

      channel.disconnect()
      let channel2 = cable.subscribeTo('TurboChannel', { stream_id: '1' })

      channel2.disconnect()

      let channel3 = cable.subscribeTo('TurboChannel', { stream_id: '1' })
      await channel3.ensureSubscribed()

      expect(channel.state).toBe('closed')
      expect(channel2.state).toBe('closed')
      expect(channel3.state).toBe('connected')

      let messagePromise = new Promise<Message>((resolve, reject) => {
        let tid = setTimeout(() => {
          reject(Error('Timed out to receive messages'))
        }, 200)

        channel3.on('message', msg => {
          clearTimeout(tid)
          resolve(msg)
        })
      })

      channel3.perform('echo', { foo: 'bar' })

      let res = await messagePromise
      expect(res).toEqual({ foo: 'bar', action: 'echo' })
    })

    it('subscribe + unsubscribe + confirmed + subscribe', async () => {
      await cable.connect()

      let channel = new TestChannel()

      let origSubscribe = cable.protocol.subscribe.bind(cable.protocol)

      let subPromise!: Promise<any>

      cable.protocol.subscribe = (...args) => {
        channel.disconnect()
        subPromise = origSubscribe(...args)
        return subPromise
      }

      let unsubResolver!: () => void
      let unsubPromise = new Promise<void>(resolve => {
        unsubResolver = resolve
      })
      let origUnsubscribe = cable.protocol.unsubscribe.bind(cable.protocol)
      cable.protocol.unsubscribe = (...args) => {
        unsubResolver()
        return origUnsubscribe(...args)
      }

      cable.subscribe(channel)

      await subPromise

      cable.protocol.subscribe = origSubscribe

      expect(cable.hub.size).toEqual(0)

      await unsubPromise

      cable.subscribe(channel)
      await channel.ensureSubscribed()

      expect(channel.state).toBe('connected')
      expect(transport.sent).toHaveLength(3)

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

  describe('extended protocol', () => {
    beforeEach(() => {
      transport = new CableTransport('ws://anycable.test')

      opts = {
        protocol: 'actioncable-v1-ext-json',
        transport
      }

      if (process.env.DEBUG === '1') {
        opts.logger = new Logger('debug')
      }

      cable = createCable('ws://example', opts)

      let acprotocol = cable.protocol as ActionCableExtendedProtocol
      acprotocol.subscribeRetryInterval = 2000
    })

    // Ref https://github.com/anycable/anycable-client/issues/30
    it('subscribed - disconnected - recovered - unsubscribe + subscribe', async () => {
      // Make sure we send SID
      transport.nextSid = '42'

      await cable.connect()

      let channel = cable.subscribeTo('TurboChannel', { stream_id: '1' })
      await channel.ensureSubscribed()

      expect(channel.state).toBe('connected')
      expect(cable.hub.size).toBe(1)

      cable.disconnected(new DisconnectedError('whateva'))

      transport.nextSid = '43'
      transport.nextRestoredIds = [channel.identifier]

      await cable.connect()

      channel.disconnect()
      let newChannel = cable.subscribeTo('TurboChannel', { stream_id: '1' })

      // Wait for all promises to resolve
      await cable.hub.subscriptions
        .get(channel.identifier)!
        .pending('subscribed')
      await cable.hub.subscriptions
        .get(channel.identifier)!
        .pending('unsubscribed')

      await Promise.resolve()

      expect(newChannel.state).toBe('connected')
      expect(cable.hub.size).toBe(1)

      let subscribeCommands = transport.sent.filter(
        (msg: string | Uint8Array) => {
          return (msg as string).match(/command":"subscribe/)
        }
      )
      let historyCommands = transport.sent.filter(
        (msg: string | Uint8Array) => {
          return (msg as string).match(/command":"history/)
        }
      )

      expect(historyCommands).toHaveLength(1)
      expect(subscribeCommands).toHaveLength(1)
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
