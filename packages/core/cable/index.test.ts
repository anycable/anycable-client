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
  Message,
  ChannelsCache
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
        resolve(JSON.stringify({ identifier, ...params }))
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
  let expectedIdentifier: string

  beforeEach(() => {
    channel = new TestChannel({ id: '26' })
    expectedIdentifier = '{"identifier":"TestChannel","id":"26"}'
    cable.connect()
    cable.connected()
  })

  it('subscribe when connected', done => {
    cable.subscribe(channel).then(identifier => {
      expect(cable.hub.size).toEqual(1)
      expect(channel.state).toEqual('connected')

      let message = { foo: 'bar' }

      channel.on('message', msg => {
        expect(msg).toEqual(message)
        done()
      })

      transport.receive(
        JSON.stringify({
          identifier,
          payload: message
        })
      )
    })
  })

  it('subscribe when idle', () => {
    cable = new Cable({
      protocol,
      encoder,
      logger,
      transport
    })

    expect(cable.state).toEqual('idle')

    let res = cable.subscribe(channel).then(() => {
      expect(channel.state).toEqual('connected')
      expect(cable.state).toEqual('connected')
    })

    cable.connected()

    return res
  })

  it('subscribe when disconnected', async () => {
    cable.disconnected()

    let subscribePromise = cable.subscribe(channel).then(() => {
      expect(channel.state).toEqual('connected')
      expect(cable.state).toEqual('connected')
    })

    cable.connect()
    cable.connected()

    await subscribePromise

    // Make sure that we do not double-mark the channels
    // and still can disconnect
    expect(channel.state).toEqual('connected')

    let res = await channel.disconnect()
    expect(res).toEqual(true)
    expect(channel.state).toEqual('closed')
  })

  it('subscribe when closed', () => {
    cable.closed()

    let subscribePromise = cable.subscribe(channel).then(identifier => {
      expect(cable.hub.size).toEqual(1)
      expect(channel.state).toEqual('connected')

      return identifier
    })

    cable.connect()
    cable.connected()

    return expect(subscribePromise).resolves.toEqual(expectedIdentifier)
  })

  it('subscribe canceled while cable was connecting', () => {
    cable.disconnected()
    cable.connect()

    let subscribePromise = cable.subscribe(channel)

    channel.disconnect()
    cable.connected()

    return expect(subscribePromise).rejects.toEqual(
      new ReasonError('Channel was disconnected before subscribing', 'canceled')
    )
  })

  it('subscribe while connecting', done => {
    cable.disconnected()
    cable.connect()

    cable.subscribe(channel).then(identifier => {
      expect(cable.hub.size).toEqual(1)
      expect(channel.state).toEqual('connected')

      let message = { foo: 'bar' }

      channel.on('message', msg => {
        expect(msg).toEqual(message)
        done()
      })

      transport.receive(
        JSON.stringify({
          identifier,
          payload: message
        })
      )
    })

    cable.connected()
  })

  it('cable connecting + subscribe + cable disconnected + cable connected', async () => {
    cable.disconnected(new DisconnectedError('before'))
    let connectPromise = cable.connect()

    let message = { foo: 'bar' }

    let promise = cable.subscribe(channel).then(identifier => {
      expect(cable.hub.size).toEqual(1)
      expect(channel.state).toEqual('connected')

      return new Promise<object>(resolve => {
        channel.on('message', msg => {
          resolve(message)
        })

        transport.receive(
          JSON.stringify({
            identifier,
            payload: message
          })
        )
      })
    })

    cable.disconnected(new DisconnectedError('middle'))

    // disconnected result in rejection which we need to handle
    try {
      await connectPromise
    } catch (err) {}

    cable.connect()
    cable.connected()

    return expect(promise).resolves.toEqual(message)
  })

  it('cable idle + subscribe + cable close + cable connected', async () => {
    // We need a fresh, IDLE, instance
    cable = new Cable({
      protocol,
      encoder,
      logger,
      transport
    })

    let promise = cable.subscribe(channel).then(identifier => {
      expect(cable.hub.size).toEqual(1)
      expect(channel.state).toEqual('connected')

      return identifier
    })

    expect(cable.state).toEqual('connecting')
    cable.disconnect()

    cable.connect()
    cable.connected()

    return expect(promise).resolves.toEqual(expectedIdentifier)
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
              resolve(JSON.stringify({ identifier, ...params }))
            }, 0)
          })
        }
      })

    let disconnectEvent: DisconnectedError

    channel.on('disconnect', ev => {
      disconnectEvent = ev
    })

    let promise = cable.subscribe(channel).then(identifier => {
      expect(cable.hub.size).toEqual(1)
      expect(channel.state).toEqual('connected')

      // No disconnect event should be emitted since cable disconnected
      // while the channel hasn't been subscribed yet
      expect(disconnectEvent).toBeUndefined()

      return new Promise<object>(resolve => {
        channel.on('message', msg => {
          resolve(message)
        })

        transport.receive(
          JSON.stringify({
            identifier,
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

    expect(
      cable.subscribe(channel).finally(() => {
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

    return expect(
      cable.subscribe(channel).finally(() => {
        expect(channel.state).toEqual('closed')
        expect(cable.hub.size).toEqual(0)
        expect(logger.errors).toHaveLength(1)
      })
    ).rejects.toEqual(new ReasonError(Error('failed')))
  })

  it('unsubscribe when connected', async () => {
    let identifier = await cable.subscribe(channel)
    expect(cable.hub.size).toEqual(1)

    await cable.unsubscribe(identifier)
    expect(cable.hub.size).toEqual(0)
    expect(channel.state).toEqual('closed')
  })

  it('unsubscribe while connecting', () => {
    return cable.subscribe(channel).then(identifier => {
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
    let identifier = await cable.subscribe(channel)
    expect(cable.hub.size).toEqual(1)

    cable.disconnected()

    let res = await cable.unsubscribe(identifier)
    expect(res).toEqual(true)
    expect(cable.hub.size).toEqual(0)
    expect(channel.state).toEqual('closed')
  })

  it('unsubscribe with unknown identifier', async () => {
    return expect(cable.unsubscribe('123')).rejects.toEqual(
      Error('Channel not found: 123')
    )
  })

  it('unsubscribe failure', async () => {
    let identifier = await cable.subscribe(channel)
    expect(cable.hub.size).toEqual(1)

    jest.spyOn(protocol, 'unsubscribe').mockImplementation(async () => {
      throw Error('failed')
    })

    expect(
      cable.unsubscribe(identifier).finally(() => {
        expect(logger.errors).toHaveLength(1)
      })
    ).rejects.toEqual(new ReasonError(Error('failed')))
  })

  it('unsubscribe failed due to disconnect', async () => {
    let identifier = await cable.subscribe(channel)
    expect(cable.hub.size).toEqual(1)

    jest.spyOn(protocol, 'unsubscribe').mockImplementation(async () => {
      throw new DisconnectedError('failed')
    })

    let res = await cable.unsubscribe(identifier)
    expect(res).toEqual(true)
    expect(cable.hub.size).toEqual(0)
    expect(channel.state).toEqual('closed')
  })

  it('perform when connected', async () => {
    cable.hub.add('42', channel)

    await cable.perform('42', 'do', { foo: 'bar' })

    expect(transport.sent).toEqual([
      JSON.stringify({
        identifier: '42',
        action: 'do',
        payload: { foo: 'bar' }
      })
    ])
  })

  it('perform when closed', async () => {
    cable.hub.add('42', channel)
    cable.closed()

    return expect(cable.perform('42', 'do', { foo: 'bar' })).rejects.toEqual(
      Error('No connection')
    )
  })

  it('perform when disconnected', async () => {
    cable.hub.add('42', channel)
    cable.disconnected()

    return expect(cable.perform('42', 'do', { foo: 'bar' })).rejects.toEqual(
      Error('No connection')
    )
  })

  it('perform while connecting', () => {
    cable.hub.add('42', channel)

    cable.disconnected()
    cable.connect()

    let res = cable.perform('42', 'do', { foo: 'bar' }).then(() => {
      expect(transport.sent).toEqual([
        JSON.stringify({
          identifier: '42',
          action: 'do',
          payload: { foo: 'bar' }
        })
      ])
    })

    cable.connected()

    return res
  })

  it('perform with unknown identifier', async () => {
    return expect(cable.perform('42', 'do', { foo: 'bar' })).rejects.toEqual(
      Error('Channel not found: 42')
    )
  })

  it('perform with response', async () => {
    let identifier = await cable.subscribe(channel)
    expect(cable.hub.size).toEqual(1)

    jest
      .spyOn(protocol, 'perform')
      .mockImplementation(async (id, action, payload) => {
        expect(id).toEqual(identifier)
        expect(action).toEqual('ping')
        expect(payload).toBeUndefined()

        return Promise.resolve('pong')
      })

    let response = await cable.perform(identifier, 'ping')
    expect(response).toEqual('pong')
  })

  it('perform failure', async () => {
    let identifier = await cable.subscribe(channel)
    expect(cable.hub.size).toEqual(1)

    jest.spyOn(protocol, 'perform').mockImplementation(async () => {
      throw Error('failed')
    })

    expect(
      cable.perform(identifier, 'bla').finally(() => {
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
              resolve(JSON.stringify({ identifier, ...params }))
            }, 0)
          })
        })
    })

    it('handles closure', async () => {
      await cable.subscribe(channel)
      cable.subscribe(channel2)

      expect(cable.hub.size).toEqual(2)
      expect(channel.state).toEqual('connected')
      expect(channel2.state).toEqual('connecting')

      transport.close()
      expect(channel.state).toEqual('disconnected')
      expect(channel2.state).toEqual('connecting')
    })

    it('closed by user', async () => {
      await cable.subscribe(channel)
      expect(cable.hub.size).toEqual(1)

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
      cable.subscribe(channel2)

      expect(cable.hub.size).toEqual(2)
      expect(channel.state).toEqual('connected')
      expect(channel2.state).toEqual('connecting')

      transport.closed('recover_me')
      expect(channel.state).toEqual('connecting')
      expect(channel2.state).toEqual('connecting')
    })

    it('connected after disconnect should resubscribe channels', () => {
      return cable.subscribe(channel).then(() => {
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
      await cable.subscribe(channel)

      let subscribePromise = cable.subscribe(channel2).then(id => {
        expect(id).toEqual('attempt:2')
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
      return cable.subscribe(channel).then(() => {
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
      return cable.subscribe(channel).then(() => {
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
      await cable.subscribe(channel)
      await cable.subscribe(channel)

      expect(cable.hub.size).toEqual(1)
      expect(channel.id).toEqual('channel:id')
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
      expect(cable.hub.size).toEqual(1)
      expect(channel.id).toEqual('channel:id')
      expect(channel.state).toEqual('connected')

      cable.disconnected(new DisconnectedError('test'))

      let subscribePromise = cable.subscribe(channel)

      let connectPromise = cable.connect()
      cable.connected()

      await connectPromise
      await subscribePromise

      expect(cable.hub.size).toEqual(1)
      expect(channel.id).toEqual('channel:id')
      expect(channel.state).toEqual('connected')

      expect(spy).toHaveBeenCalledTimes(2)
    })

    it('is not possible to subscribe to different cables', async () => {
      await cable.subscribe(channel)
      let prevId = channel.id

      // subscribing to another cable should fail
      let newCable = new Cable({ protocol, encoder, logger, transport })

      expect(newCable.subscribe(channel)).rejects.toEqual(
        Error('Already connected to another cable')
      )

      await channel.disconnect()

      // Subscribes with the same ID
      expect(newCable.subscribe(channel)).resolves.toEqual(prevId)
    })

    it('all attemts are rejected in case of a failure', () => {
      jest.spyOn(protocol, 'subscribe').mockImplementation(async () => {
        throw new SubscriptionRejectedError()
      })

      let p1 = cable.subscribe(channel)
      let p2 = cable.subscribe(channel)

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

      cable.subscribe(channel)
      await cable.subscribe(channel)

      expect(subscribeSpy).toHaveBeenCalledTimes(1)

      expect(cable.hub.size).toEqual(1)
      expect(channel.state).toEqual('connected')

      let res = await channel.disconnect()
      // First disconnect shouldn't unsubscribe the channel
      expect(res).toEqual(false)
      expect(channel.state).toEqual('connected')
      expect(unsubscribeSpy).toHaveBeenCalledTimes(0)

      await cable.subscribe(channel)
      expect(subscribeSpy).toHaveBeenCalledTimes(1)
      await channel.disconnect()

      res = await channel.disconnect()
      expect(res).toEqual(true)
      expect(channel.state).toEqual('closed')
      expect(unsubscribeSpy).toHaveBeenCalledTimes(1)

      await cable.subscribe(channel)
      expect(channel.state).toEqual('connected')
      expect(subscribeSpy).toHaveBeenCalledTimes(2)
    })

    it('unsubscribe more times than subscribe', async () => {
      await cable.subscribe(channel)

      let p = cable.unsubscribe(channel.id)
      let res = await cable.unsubscribe(channel.id)
      expect(res).toEqual(true)
      expect(p).resolves.toEqual(true)
    })

    it('unsubscribe failure', async () => {
      let counter = 0

      let unsubscribeSpy = jest
        .spyOn(protocol, 'unsubscribe')
        .mockImplementation(async (_identifier: string) => {
          counter++
          if (counter === 1) throw Error('Something went wrong')
        })

      await cable.subscribe(channel)

      let thrown

      try {
        await channel.disconnect()
      } catch (err) {
        thrown = err
      }

      expect(thrown).toEqual(Error('Something went wrong'))

      expect(channel.disconnect()).resolves.toEqual(true)

      expect(unsubscribeSpy).toHaveBeenCalledTimes(2)
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
  })

  it('subscribes', async () => {
    let channel = await cable.subscribeTo('some_channel', { id: '2020' })

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

  it('caches channels when cache is present', async () => {
    cable.cache = new ChannelsCache()

    let channel = await cable.subscribeTo('some_channel', { id: '2020' })

    expect(cable.hub.size).toEqual(1)
    expect(channel.state).toEqual('connected')

    let another = await cable.subscribeTo('some_channel', { id: '2020' })

    expect(cable.hub.size).toEqual(1)
    expect(another).toBe(channel)

    // Make sure we distinguish ghost channels
    await cable.subscribeTo('another_channel', { id: '2020' })
    await cable.subscribeTo('some_channel', { id: '2022' })
    expect(cable.hub.size).toEqual(3)

    cable.cache.delete('some_channel', { id: '2020' })
    let newChannel = await cable.subscribeTo('some_channel', { id: '2020' })
    expect(newChannel).not.toBe(channel)
  })

  it('caches channels via classes', async () => {
    cable.cache = new ChannelsCache()

    let channel = await cable.subscribeTo(TestChannel, { id: '2020' })

    expect(cable.hub.size).toEqual(1)
    expect(channel.state).toEqual('connected')

    let another = await cable.subscribeTo(TestChannel, { id: '2020' })

    expect(cable.hub.size).toEqual(1)
    expect(another).toBe(channel)
  })
})
