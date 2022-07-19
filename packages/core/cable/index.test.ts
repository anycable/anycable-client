import { jest } from '@jest/globals'

import {
  Cable,
  JSONEncoder,
  ProcessedMessage,
  DisconnectedError,
  Protocol,
  NoopLogger,
  Channel,
  Encoder,
  SubscriptionRejectedError,
  NoConnectionError,
  ReasonError,
  Message
} from '../index.js'
import { TestTransport } from '../transport/testing'
import { TestLogger } from '../logger/testing'

class TestProtocol implements Protocol {
  cable!: Cable
  counter: number

  constructor() {
    this.counter = 0
  }

  attached(cable: Cable) {
    this.cable = cable
  }

  subscribe(identifier: string, params?: object) {
    return new Promise<string>((resolve, reject) => {
      return setTimeout(() => {
        resolve(`test_${(params as any).id}`)
      }, 0)
    })
  }

  unsubscribe(identifier: string) {
    return Promise.resolve()
  }

  perform(
    identifier: string,
    action: string,
    payload?: object
  ): Promise<Message | void> {
    this.cable.send({ identifier, action, payload })
    return Promise.resolve()
  }

  /* eslint-disable consistent-return */
  receive(msg: Message): ProcessedMessage | void {
    this.counter++

    if (msg === 'disconnect') {
      this.cable.disconnected(new DisconnectedError())
      return
    }

    if (msg === 'close') {
      this.cable.closed(new DisconnectedError('closed'))
      return
    }

    if (typeof msg === 'object') {
      let data = msg as { identifier: string; payload: object }

      let { identifier, payload } = data

      return {
        identifier,
        message: payload,
        meta: { id: this.counter.toString() }
      }
    }
  }

  recoverableClosure(err?: Error): boolean {
    if (!err) return false

    return err.message === 'recover_me'
  }

  /* eslint-disable node/handle-callback-err */
  reset(err: Error): void {
    this.counter = 0
  }
}

class TestChannel extends Channel<{ id: string }> {
  static identifier = 'TestChannel'
}

let protocol: TestProtocol
let transport: TestTransport
let logger: TestLogger
let cable: Cable
let encoder: Encoder

beforeEach(() => {
  logger = new TestLogger()
  transport = new TestTransport('ws:///')
  encoder = new JSONEncoder()
  protocol = new TestProtocol()
  cable = new Cable({
    protocol,
    encoder,
    logger,
    transport
  })
})

describe('initialize', () => {
  it('is idle', () => {
    expect(cable.state).toEqual('idle')
  })

  it('uses passed logger', () => {
    expect(cable.logger).toStrictEqual(logger)
  })

  it('uses no-op logger if not defined', () => {
    let c = new Cable({
      transport,
      encoder,
      protocol
    })

    expect(c.logger).toBeInstanceOf(NoopLogger)
  })

  it('connects if lazy is set to false', () => {
    let c = new Cable({
      transport,
      encoder,
      protocol,
      lazy: false
    })

    expect(c.state).toEqual('connecting')
    expect(transport.opened).toBe(true)
  })
})

/* eslint-disable jest/no-done-callback */
describe('connect/disconnect', () => {
  it('connect', () => {
    cable.connect()

    expect(cable.state).toEqual('connecting')
    expect(transport.opened).toBe(true)
  })

  it('connected', done => {
    cable.on('connect', event => {
      expect(event.reconnect).toBe(false)
      expect(event.restored).toBe(false)

      done()
    })

    cable.connected()
    expect(cable.state).toEqual('connected')
  })

  it('double connect', async () => {
    expect(cable.state).toEqual('idle')

    let p1 = cable.connect()
    let p2 = cable.connect()

    cable.connected()

    await p1
    await p2

    expect(cable.state).toEqual('connected')
    expect(transport.opened).toBe(true)
  })

  it('connect when connected', async () => {
    cable.connected()
    expect(cable.state).toEqual('connected')

    await cable.connect()

    expect(cable.state).toEqual('connected')
  })

  it('connect error', () => {
    jest.spyOn(transport, 'open').mockImplementation(() => {
      throw Error('Connection failed')
    })

    return expect(cable.connect()).rejects.toEqual(
      new DisconnectedError(Error('Connection failed'), 'transport_closed')
    )
  })

  it('connect closed before connected', () => {
    let res = cable.connect()

    cable.closed('Connection closed')

    return expect(res).rejects.toEqual(
      new DisconnectedError('Connection closed')
    )
  })

  it('close', done => {
    cable.once('close', event => {
      expect(event).toBeDefined()
      expect((event as ReasonError).reason).toEqual('test')
      done()
    })

    cable.connected()
    cable.closed('test')

    expect(cable.state).toEqual('closed')
    expect(transport.opened).toBe(false)

    cable.closed('test2')
  })

  it('disconnect', done => {
    cable.once('close', event => {
      expect(event).toBeUndefined()
      done()
    })

    cable.connected()
    cable.disconnect()

    expect(cable.state).toEqual('closed')
    expect(transport.opened).toBe(false)
  })

  it('disconnected with reason', done => {
    cable.on('disconnect', ev => {
      expect(ev.reason).toEqual('test')
      done()
    })

    cable.connected()
    cable.disconnected(new DisconnectedError('test'))
    cable.disconnected(new DisconnectedError('test2'))

    expect(cable.state).toEqual('disconnected')
    expect(transport.opened).toBe(false)
  })

  it('handles transport close', done => {
    cable.on('disconnect', event => {
      expect(event.reason).toEqual('transport_closed')
      done()
    })

    cable.connected()

    transport.closed('network failure')

    expect(cable.state).toEqual('disconnected')
  })

  it('handles server initiated disconnect', done => {
    cable.on('disconnect', () => done())

    cable.connected()

    transport.receive(JSON.stringify('disconnect'))

    expect(cable.state).toEqual('disconnected')
    expect(transport.opened).toBe(false)
  })

  it('handles server initiated close', done => {
    cable.on('close', () => done())

    cable.connected()

    transport.receive(JSON.stringify('close'))

    expect(cable.state).toEqual('closed')
    expect(transport.opened).toBe(false)
  })

  it('receive is no-op when idle', () => {
    expect(cable.state).toEqual('idle')

    let spy = jest.spyOn(protocol, 'receive')

    transport.receive('{}')

    expect(spy).toHaveBeenCalledTimes(0)
  })
})

describe('channels', () => {
  let channel: Channel

  beforeEach(() => {
    channel = new TestChannel({ id: '26' })
    cable.connect()
    cable.connected()
  })

  it('subscribe when connected', async () => {
    cable.subscribe(channel)

    await channel.subscribed().then(() => {
      expect(cable.hub.size).toEqual(1)
      expect(channel.state).toEqual('connected')
    })

    let message = { foo: 'bar' }

    let promise = new Promise<void>((resolve, reject) => {
      let tid = setTimeout(() => {
        reject(Error('Timed out to receive message'))
      }, 500)

      channel.on('message', msg => {
        clearTimeout(tid)
        expect(msg).toEqual(message)
        resolve()
      })
    })

    transport.receive(
      JSON.stringify({
        identifier: 'test_26',
        payload: message
      })
    )

    await promise
  })

  it('subscribe when idle', () => {
    cable = new Cable({
      protocol,
      encoder,
      logger,
      transport
    })

    expect(cable.state).toEqual('idle')

    cable.subscribe(channel)

    let res = channel.subscribed().then(() => {
      expect(channel.state).toEqual('connected')
      expect(cable.state).toEqual('connected')
    })

    cable.connected()

    return res
  })

  it('subscribe when disconnected', async () => {
    cable.disconnected()

    cable.subscribe(channel)

    let subscribePromise = channel.subscribed().then(() => {
      expect(channel.state).toEqual('connected')
      expect(cable.state).toEqual('connected')
    })

    cable.connect()
    cable.connected()

    await subscribePromise

    // Make sure that we do not double-mark the channels
    // and still can disconnect
    expect(channel.state).toEqual('connected')

    await channel.disconnect()
    expect(channel.state).toEqual('closed')
  })

  it('subscribe when closed', async () => {
    cable.closed()

    cable.subscribe(channel)

    let subscribePromise = channel.subscribed().then(() => {
      expect(cable.hub.size).toEqual(1)
      expect(channel.state).toEqual('connected')
    })

    cable.connect()
    cable.connected()

    await subscribePromise
  })

  it('disconnect waits for subscribe to complete', async () => {
    cable.disconnected()
    cable.connect()

    cable.subscribe(channel)

    let subscribePromise = channel.subscribed()

    let unsubPromise = channel.disconnect()
    cable.connected()

    await subscribePromise
    await unsubPromise

    expect(channel.state).toEqual('closed')
    expect(cable.hub.size).toEqual(0)
  })

  it('multiple subscribes and unsubscribes from different channels', async () => {
    let another = new TestChannel({ id: '26' })

    cable.disconnected()
    cable.connect()

    cable.subscribe(channel)
    let subscribeFirst = channel.subscribed()

    let unsubPromise = channel.disconnect()
    cable.connected()

    cable.subscribe(another)
    let subscribeSecond = another.subscribed()

    await Promise.all([subscribeFirst, unsubPromise, subscribeSecond])

    expect(another.state).toEqual('connected')
    expect(channel.state).toEqual('closed')
    expect(cable.hub.size).toEqual(1)
  })

  it('subscribe + disconnect + subscribe another channel', async () => {
    let another = new TestChannel({ id: '26' })

    cable.subscribe(channel)
    await channel.subscribed()

    cable.disconnected(new DisconnectedError('first'))

    await cable.subscribe(another)

    // It shouldn't be connected
    expect(another.state).toEqual('connecting')

    let subscribePromise = another.subscribed()
    cable.connected()

    await subscribePromise

    expect(another.state).toEqual('connected')
    expect(channel.state).toEqual('connected')
    expect(cable.hub.size).toEqual(2)
  })

  it('subscribe while connecting', async () => {
    cable.disconnected()
    cable.connect()

    cable.subscribe(channel)

    let promise = channel.subscribed().then(() => {
      expect(cable.hub.size).toEqual(1)
      expect(channel.state).toEqual('connected')
    })

    cable.connected()

    await promise

    let message = { foo: 'bar' }

    let messagePromise = new Promise<void>((resolve, reject) => {
      let tid = setTimeout(() => {
        reject(Error('Timed out to receive message'))
      }, 500)

      channel.on('message', msg => {
        clearTimeout(tid)
        expect(msg).toEqual(message)
        resolve()
      })
    })

    transport.receive(
      JSON.stringify({
        identifier: 'test_26',
        payload: message
      })
    )

    await messagePromise
  })

  it('cable connecting + subscribe + cable disconnected + cable connected', async () => {
    cable.disconnected(new DisconnectedError('before'))
    let connectPromise = cable.connect()

    cable.subscribe(channel)

    let promise = channel.subscribed().then(() => {
      expect(cable.hub.size).toEqual(1)
      expect(channel.state).toEqual('connected')
    })

    cable.disconnected(new DisconnectedError('middle'))

    // disconnected result in rejection which we need to handle
    try {
      await connectPromise
    } catch (err) {}

    cable.connect()
    cable.connected()

    await promise

    let message = { foo: 'bar' }

    let messagePromise = new Promise<void>((resolve, reject) => {
      let tid = setTimeout(() => {
        reject(Error('Timed out to receive message'))
      }, 500)

      channel.on('message', msg => {
        clearTimeout(tid)
        expect(msg).toEqual(message)
        resolve()
      })
    })

    transport.receive(
      JSON.stringify({
        identifier: 'test_26',
        payload: message
      })
    )

    await messagePromise
  })

  it('cable idle + subscribe + cable close + cable connected', async () => {
    // We need a fresh, IDLE, instance
    cable = new Cable({
      protocol,
      encoder,
      logger,
      transport
    })

    cable.subscribe(channel)

    let promise = channel.subscribed().then(() => {
      expect(cable.hub.size).toEqual(1)
      expect(channel.state).toEqual('connected')
    })

    expect(cable.state).toEqual('connecting')
    cable.disconnect()

    cable.connect()
    cable.connected()

    await promise
  })

  it('subscribing + cable disconnected + subscribed failed with disconnected error + cable connected', async () => {
    let message = { foo: 'bar' }
    let first = true

    jest
      .spyOn(protocol, 'subscribe')
      .mockImplementation(async (identifier, params) => {
        if (first) {
          first = false
          throw new DisconnectedError('protocol')
        } else {
          return new Promise<string>(resolve => {
            return setTimeout(() => {
              resolve('test_custom')
            }, 0)
          })
        }
      })

    let disconnectEvent: DisconnectedError

    channel.on('disconnect', ev => {
      disconnectEvent = ev
    })

    cable.subscribe(channel)

    let promise = channel.subscribed().then(() => {
      expect(cable.hub.size).toEqual(1)
      expect(channel.state).toEqual('connected')

      expect(disconnectEvent).toBeDefined()

      return new Promise<Message>((resolve, reject) => {
        let tid = setTimeout(() => {
          reject(Error('Timed out to receive message'))
        }, 500)

        channel.on('message', msg => {
          clearTimeout(tid)
          resolve(msg)
        })

        transport.receive(
          JSON.stringify({
            identifier: 'test_custom',
            payload: message
          })
        )
      })
    })

    cable.disconnected(new DisconnectedError('test'))

    cable.connect()
    cable.connected()

    return expect(promise).resolves.toEqual(message)
  })

  it('subscribe rejected', () => {
    jest.spyOn(protocol, 'subscribe').mockImplementation(async () => {
      throw new SubscriptionRejectedError()
    })

    cable.subscribe(channel)

    expect(
      channel.subscribed().finally(() => {
        expect(channel.state).toEqual('closed')
        expect(cable.hub.size).toEqual(0)
        expect(logger.warnings).toHaveLength(1)
      })
    ).rejects.toBeInstanceOf(SubscriptionRejectedError)
  })

  it('subscribe unknown failure', () => {
    jest.spyOn(protocol, 'subscribe').mockImplementation(async () => {
      throw Error('failed')
    })

    cable.subscribe(channel)

    return expect(
      channel.subscribed().finally(() => {
        expect(channel.state).toEqual('closed')
        expect(cable.hub.size).toEqual(0)
        expect(logger.errors).toHaveLength(1)
      })
    ).rejects.toEqual(new ReasonError(Error('failed')))
  })

  it('unsubscribe when connected', async () => {
    await cable.subscribe(channel)
    await channel.subscribed()
    expect(cable.hub.size).toEqual(1)

    await cable.unsubscribe(channel)
    expect(cable.hub.size).toEqual(0)
    expect(channel.state).toEqual('closed')
  })

  it('unsubscribe followed by subscribe', async () => {
    await cable.subscribe(channel)
    await channel.subscribed()

    expect(cable.hub.size).toEqual(1)

    let unsubPromise = cable.unsubscribe(channel)
    cable.subscribe(channel)

    let subPromise = channel.subscribed()

    await unsubPromise
    await subPromise

    expect(channel.state).toEqual('connected')
    expect(cable.hub.size).toEqual(1)
  })

  it('subscribe followed by disconnect', async () => {
    cable.subscribe(channel)

    let subPromise = channel.subscribed()
    let unsubPromise = channel.disconnect()

    await subPromise
    await unsubPromise

    expect(channel.state).toEqual('closed')
    expect(cable.hub.size).toEqual(0)
  })

  it('subscribe followed by unsubscribe', async () => {
    cable.subscribe(channel)

    let subPromise = channel.subscribed()
    let unsubPromise = cable.unsubscribe(channel)

    await expect(subPromise).rejects.toEqual(
      new ReasonError('Channel was disconnected before subscribing', 'cancel')
    )
    await unsubPromise

    expect(channel.state).toEqual('closed')
    expect(cable.hub.size).toEqual(0)
  })

  it('unsubscribe while connecting', () => {
    cable.subscribe(channel)

    return channel.subscribed().then(() => {
      cable.disconnected(new DisconnectedError('before'))
      cable.connect()

      let res = channel.disconnect().then(val => {
        expect(cable.hub.size).toEqual(0)
        expect(channel.state).toEqual('closed')
        return val
      })

      cable.connected()

      return res.then(val => {
        expect(val).toEqual(true)
        // Make sure there is no race conditions between unsubscribe and subscribe during reconnect
        return new Promise<void>((resolve, reject) => {
          channel.once('connect', () => {
            reject(Error('Channel reconnected'))
          })
          setTimeout(resolve, 200)
        })
      })
    })
  })

  it('unsubscribe when disconnected', async () => {
    cable.subscribe(channel)
    expect(cable.hub.size).toEqual(1)

    await channel.subscribed()

    cable.disconnected()

    let res = await cable.unsubscribe(channel)
    expect(res).toEqual(true)
    expect(cable.hub.size).toEqual(0)
    expect(channel.state).toEqual('closed')
  })

  it('unsubscribe with unknown identifier', async () => {
    return expect(
      cable.unsubscribe(new TestChannel({ id: '123' }))
    ).rejects.toEqual(
      Error('Subscription not found: {"channel":"TestChannel","id":"123"}')
    )
  })

  it('unsubscribe failure', async () => {
    await cable.subscribe(channel)
    expect(cable.hub.size).toEqual(1)

    await channel.subscribed()

    jest.spyOn(protocol, 'unsubscribe').mockImplementation(async () => {
      throw Error('failed')
    })

    let res = await cable.unsubscribe(channel)
    expect(res).toEqual(true)

    await cable.hub.unsubscribes.get(channel.identifier)

    expect(logger.errors).toHaveLength(1)
  })

  it('unsubscribe failed due to disconnect', async () => {
    await cable.subscribe(channel)
    expect(cable.hub.size).toEqual(1)

    await channel.subscribed()

    jest.spyOn(protocol, 'unsubscribe').mockImplementation(async () => {
      throw new DisconnectedError('failed')
    })

    let res = await cable.unsubscribe(channel)
    expect(res).toEqual(true)
    expect(cable.hub.size).toEqual(0)
    expect(channel.state).toEqual('closed')

    await cable.hub.unsubscribes.get(channel.identifier)
  })

  it('perform when connected', async () => {
    cable.subscribe(channel)
    await channel.subscribed()

    await cable.perform(channel, 'do', { foo: 'bar' })

    expect(transport.sent).toEqual([
      JSON.stringify({
        identifier: 'test_26',
        action: 'do',
        payload: { foo: 'bar' }
      })
    ])
  })

  it('perform when closed', async () => {
    cable.subscribe(channel)
    await channel.subscribed()

    cable.closed()

    return expect(cable.perform(channel, 'do', { foo: 'bar' })).rejects.toEqual(
      Error('No connection')
    )
  })

  it('send when closed', () => {
    cable.disconnect()
    expect(() => {
      cable.send({ action: 'ping' })
    }).toThrow(Error('Cable is closed'))
  })

  it('perform when disconnected', async () => {
    cable.subscribe(channel)
    await channel.subscribed()
    cable.disconnected()

    return expect(cable.perform(channel, 'do', { foo: 'bar' })).rejects.toEqual(
      Error('No connection')
    )
  })

  it('perform while connecting', async () => {
    cable.subscribe(channel)
    await channel.subscribed()

    cable.disconnected()
    cable.connect()

    let res = cable.perform(channel, 'do', { foo: 'bar' }).then(() => {
      expect(transport.sent).toEqual([
        JSON.stringify({
          identifier: 'test_26',
          action: 'do',
          payload: { foo: 'bar' }
        })
      ])
    })

    cable.connected()

    return res
  })

  it('perform with unknown identifier', async () => {
    return expect(cable.perform(channel, 'do', { foo: 'bar' })).rejects.toEqual(
      Error('Subscription not found: {"channel":"TestChannel","id":"26"}')
    )
  })

  it('perform with response', async () => {
    await cable.subscribe(channel)
    expect(cable.hub.size).toEqual(1)

    await channel.subscribed()

    jest
      .spyOn(protocol, 'perform')
      .mockImplementation(async (id, action, payload) => {
        expect(id).toEqual('test_26')
        expect(action).toEqual('ping')
        expect(payload).toBeUndefined()

        return Promise.resolve('pong')
      })

    let response = await cable.perform(channel, 'ping')
    expect(response).toEqual('pong')
  })

  it('perform failure', async () => {
    await cable.subscribe(channel)
    expect(cable.hub.size).toEqual(1)

    await channel.subscribed()

    jest.spyOn(protocol, 'perform').mockImplementation(async () => {
      throw Error('failed')
    })

    expect(
      cable.perform(channel, 'bla').finally(() => {
        expect(logger.errors).toHaveLength(1)
      })
    ).rejects.toEqual(Error('failed'))
  })

  describe('closure and recovery with channels', () => {
    let channel2: TestChannel

    beforeEach(() => {
      channel2 = new TestChannel({ id: '27' })
      let attempt = 0

      jest
        .spyOn(protocol, 'subscribe')
        .mockImplementation(async (identifier, params) => {
          if ((params as any).id === '27') {
            attempt++

            if (attempt === 1) {
              throw new DisconnectedError('protocol')
            }

            return `attempt:${attempt}`
          }

          return new Promise<string>(resolve => {
            return setTimeout(() => {
              resolve(`test_${(params as any).id}`)
            }, 0)
          })
        })
    })

    it('handles closure', async () => {
      await cable.subscribe(channel)
      await channel.subscribed()

      cable.subscribe(channel2)

      expect(cable.hub.size).toEqual(2)
      expect(channel.state).toEqual('connected')
      expect(channel2.state).toEqual('connecting')

      transport.close()
      expect(channel.state).toEqual('disconnected')
      expect(channel2.state).toEqual('disconnected')
    })

    it('closed by user', async () => {
      await cable.subscribe(channel)
      expect(cable.hub.size).toEqual(1)

      await channel.subscribed()

      let eventPromise = new Promise<void>(resolve => {
        channel.on('disconnect', ev => {
          expect(ev.reason).toEqual('cable_closed')
          resolve()
        })
      })

      cable.disconnect()

      expect(cable.hub.size).toEqual(1)
      expect(channel.state).toEqual('disconnected')

      return eventPromise
    })

    it('handles recoverable closure', async () => {
      await cable.subscribe(channel)
      await channel.subscribed()

      cable.subscribe(channel2)

      expect(cable.hub.size).toEqual(2)
      expect(channel.state).toEqual('connected')
      expect(channel2.state).toEqual('connecting')

      transport.closed('recover_me')
      expect(channel.state).toEqual('connecting')
      expect(channel2.state).toEqual('connecting')
    })

    it('connected after disconnect should resubscribe channels', () => {
      cable.subscribe(channel)

      return channel.subscribed().then(() => {
        expect(cable.hub.size).toEqual(1)

        cable.closed()

        return new Promise<void>(resolve => {
          channel.on('connect', () => {
            expect(channel.state).toEqual('connected')
            resolve()
          })

          cable.connected()
        })
      })
    })

    it('restored after recoverable disconnect should mark channels as connected', async () => {
      cable.subscribe(channel)
      await channel.subscribed()

      cable.subscribe(channel2)

      let subscribePromise = channel2.subscribed().then(() => {
        expect(channel2.state).toEqual('connected')
      })

      expect(cable.hub.size).toEqual(2)

      transport.closed('recover_me')

      expect(channel.state).toEqual('connecting')
      expect(channel2.state).toEqual('connecting')

      cable.restored()

      expect(channel.state).toEqual('connected')
      expect(channel2.state).toEqual('connecting')
    })

    it('restored after non-recoverable disconnect should resubscribe channels', () => {
      cable.subscribe(channel)

      return channel.subscribed().then(() => {
        expect(cable.hub.size).toEqual(1)

        cable.closed()

        return new Promise<void>(resolve => {
          channel.on('connect', () => {
            expect(channel.state).toEqual('connected')
            resolve()
          })

          cable.restored()
        })
      })
    })

    it('connected after recoverable disconnect should first mark channels as disconnected', () => {
      cable.subscribe(channel)

      return channel.subscribed().then(() => {
        expect(cable.hub.size).toEqual(1)

        transport.closed('recover_me')

        expect(channel.state).toEqual('connecting')

        let disconnectP = new Promise<void>(resolve => {
          channel.on('disconnect', () => {
            resolve()
          })
        })

        let connectP = new Promise<void>(resolve => {
          channel.on('connect', () => {
            resolve()
          })

          cable.connected()
        })

        return Promise.all([disconnectP, connectP]).then(() => {
          expect(channel.state).toEqual('connected')
        })
      })
    })
  })

  describe('multi-subscribe', () => {
    it('subscribing multiple times performs actual subscription once', async () => {
      let spy = jest
        .spyOn(protocol, 'subscribe')
        .mockImplementation(async () => {
          return 'channel:id'
        })

      cable.subscribe(channel)
      cable.subscribe(channel)
      cable.subscribe(channel)

      await channel.subscribed()
      await channel.subscribed()
      await channel.subscribed()

      expect(cable.hub.size).toEqual(1)
      expect(channel.state).toEqual('connected')

      expect(spy).toHaveBeenCalledTimes(1)
    })

    it('subscribing second time after cable disconnected', async () => {
      let spy = jest
        .spyOn(protocol, 'subscribe')
        .mockImplementation(async () => {
          return 'channel:id'
        })

      await cable.subscribe(channel)
      await channel.subscribed()

      expect(cable.hub.size).toEqual(1)
      expect(channel.state).toEqual('connected')

      cable.disconnected(new DisconnectedError('test'))

      cable.subscribe(channel)

      let subscribePromise = channel.subscribed()

      let connectPromise = cable.connect()
      cable.connected()

      await connectPromise
      await subscribePromise

      expect(cable.hub.size).toEqual(1)
      expect(channel.state).toEqual('connected')

      expect(spy).toHaveBeenCalledTimes(2)
    })

    it('is not possible to subscribe to different cables', async () => {
      await cable.subscribe(channel)
      await channel.subscribed()

      // subscribing to another cable should fail
      let newCable = new Cable({ protocol, encoder, logger, transport })

      expect(newCable.subscribe(channel)).rejects.toEqual(
        Error('Already connected to a different receiver')
      )

      await channel.disconnect()
    })

    it('all attemts are rejected in case of a failure', () => {
      jest.spyOn(protocol, 'subscribe').mockImplementation(async () => {
        throw new SubscriptionRejectedError()
      })

      cable.subscribe(channel)
      let p1 = channel.subscribed()

      cable.subscribe(channel)
      let p2 = channel.subscribed()

      expect(p1).rejects.toBeInstanceOf(SubscriptionRejectedError)
      expect(p2).rejects.toBeInstanceOf(SubscriptionRejectedError)
    })

    it('unsubscribe should be called the same number of times as subscribe to actually unsubscribe', async () => {
      let subscribeSpy = jest
        .spyOn(protocol, 'subscribe')
        .mockImplementation(async () => {
          return 'channel:id'
        })
      let unsubscribeSpy = jest
        .spyOn(protocol, 'unsubscribe')
        .mockImplementation(async (identifier: string) => {
          expect(identifier).toEqual('channel:id')
        })

      let another = new TestChannel({ id: '26' })

      cable.subscribe(channel)
      cable.subscribe(another)
      await channel.subscribed()
      await another.subscribed()

      expect(subscribeSpy).toHaveBeenCalledTimes(1)

      expect(cable.hub.size).toEqual(2)
      expect(channel.state).toEqual('connected')
      expect(another.state).toEqual('connected')

      await channel.disconnect()
      expect(channel.state).toEqual('closed')
      expect(unsubscribeSpy).toHaveBeenCalledTimes(0)

      let messagePromise = new Promise<Message>((resolve, reject) => {
        another.on('message', msg => {
          resolve(msg)
        })
      })

      transport.receive(
        JSON.stringify({
          identifier: 'channel:id',
          payload: { foo: 'bar' }
        })
      )

      await expect(messagePromise).resolves.toEqual({ foo: 'bar' })

      await cable.subscribe(channel)
      await channel.subscribed()

      expect(subscribeSpy).toHaveBeenCalledTimes(1)
      await channel.disconnect()

      await another.disconnect()
      expect(channel.state).toEqual('closed')
      expect(another.state).toEqual('closed')
      expect(unsubscribeSpy).toHaveBeenCalledTimes(1)

      await cable.subscribe(channel)
      await channel.subscribed()
      expect(channel.state).toEqual('connected')
      expect(subscribeSpy).toHaveBeenCalledTimes(2)
    })

    it('unsubscribe more times than subscribe', async () => {
      await cable.subscribe(channel)
      await channel.subscribed()

      cable.unsubscribe(channel)
      return expect(cable.unsubscribe(channel)).rejects.toEqual(
        Error('Subscription not found: {"channel":"TestChannel","id":"26"}')
      )
    })

    it('unsubscribe failure', async () => {
      let unsubscribeSpy = jest
        .spyOn(protocol, 'unsubscribe')
        .mockImplementation(async (_identifier: string) => {
          throw Error('Something went wrong')
        })

      await cable.subscribe(channel)
      await channel.subscribed()

      await channel.disconnect()

      await expect(channel.disconnect()).resolves.toBeUndefined()

      expect(unsubscribeSpy).toHaveBeenCalledTimes(1)
    })
  })
})

it('logs encode errors', () => {
  jest
    .spyOn(encoder, 'encode')
    .mockImplementation((msg: object): string | undefined => {
      return undefined
    })

  expect(logger.errors).toHaveLength(0)

  cable.send({ action: 'do' })
  expect(logger.errors).toHaveLength(1)
})

it('logs decode errors', () => {
  jest
    .spyOn(encoder as JSONEncoder, 'decode')
    .mockImplementation((msg: string): object | undefined => {
      return undefined
    })

  cable.connected()

  expect(logger.errors).toHaveLength(0)

  transport.receive('')
  expect(logger.errors).toHaveLength(1)
})

it('keepalive', done => {
  cable.on('keepalive', data => {
    expect(data).toEqual({ epoch: 7 })
    done()
  })

  cable.keepalive({ epoch: 7 })
})

describe('subscribeTo', () => {
  beforeEach(() => {
    cable.connect()
    cable.connected()

    jest
      .spyOn(protocol, 'subscribe')
      .mockImplementation(async (identifier, params) => {
        return JSON.stringify({ identifier, ...params })
      })
  })

  it('subscribes', async () => {
    let channel = cable.subscribeTo('some_channel', { id: '2020' })
    await channel.subscribed()

    expect(cable.hub.size).toEqual(1)
    expect(channel.state).toEqual('connected')

    let message = { foo: 'bar' }

    let p = new Promise<Message>(resolve => channel.on('message', resolve))

    let identifier = JSON.stringify({ identifier: 'some_channel', id: '2020' })

    transport.receive(
      JSON.stringify({
        identifier,
        payload: message
      })
    )

    let received = await p

    expect(received).toEqual(message)
  })

  it('create different channel instances for multiple calls with the same params', async () => {
    let channel = cable.subscribeTo('some_channel', { id: '2020' })
    await channel.subscribed()

    expect(cable.hub.size).toEqual(1)
    expect(channel.state).toEqual('connected')

    let another = cable.subscribeTo('some_channel', { id: '2020' })
    await another.subscribed()

    expect(cable.hub.size).toEqual(2)
    expect(another).not.toBe(channel)
  })

  it('caches channels via classes', async () => {
    let channel = cable.subscribeTo(TestChannel, { id: '2020' })
    await channel.subscribed()

    expect(cable.hub.size).toEqual(1)
    expect(channel.state).toEqual('connected')

    let message = { foo: 'bar' }

    let p = new Promise<Message>(resolve => channel.on('message', resolve))

    let identifier = JSON.stringify({ identifier: 'TestChannel', id: '2020' })

    transport.receive(
      JSON.stringify({
        identifier,
        payload: message
      })
    )

    let received = await p

    expect(received).toEqual(message)
  })
})
