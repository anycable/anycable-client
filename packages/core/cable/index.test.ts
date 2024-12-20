/*eslint n/no-unsupported-features/es-syntax: ["error", {version: "14.0"}] */
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
  StaleConnectionError,
  ReasonError,
  Message,
  InfoEvent
} from '../index.js'
import { TestTransport } from '../transport/testing'
import { TestLogger } from '../logger/testing'
import { PUBSUB_CHANNEL, PubSubChannel, CableOptions } from './index.js'

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
      let data = msg as { identifier: string; payload: object; type?: string }

      let { identifier, payload, type } = data

      return {
        type,
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

  /* eslint-disable n/handle-callback-err */
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
let cableOptions: CableOptions

beforeEach(() => {
  logger = new TestLogger()
  transport = new TestTransport('ws:///')
  encoder = new JSONEncoder()
  protocol = new TestProtocol()

  cableOptions = {
    protocol,
    encoder,
    logger,
    transport
  }

  cable = new Cable(cableOptions)
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
    cable
      .subscribe(channel)
      .ensureSubscribed()
      .then(() => {
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

  it('subscribe when idle', async () => {
    cable = new Cable({
      protocol,
      encoder,
      logger,
      transport
    })

    expect(cable.state).toEqual('idle')

    let res = cable
      .subscribe(channel)
      .ensureSubscribed()
      .then(() => {
        expect(channel.state).toEqual('connected')
        expect(cable.state).toEqual('connected')
      })

    // Make sure connected is called asynchrounously
    await Promise.resolve()
    cable.connected()

    return res
  })

  it('subscribe when disconnected', async () => {
    cable.disconnected()

    let subscribePromise = cable
      .subscribe(channel)
      .ensureSubscribed()
      .then(() => {
        expect(channel.state).toEqual('connected')
        expect(cable.state).toEqual('connected')
      })

    cable.connect()
    // Make sure connected is called asynchrounously
    await Promise.resolve()
    cable.connected()

    await subscribePromise

    // Make sure that we do not double-mark the channels
    // and still can disconnect
    expect(channel.state).toEqual('connected')

    channel.disconnect()
    expect(channel.state).toEqual('closed')
  })

  it('subscribe when closed', async () => {
    cable.closed()

    let subscribePromise = cable
      .subscribe(channel)
      .ensureSubscribed()
      .then(() => {
        expect(cable.hub.size).toEqual(1)
        expect(channel.state).toEqual('connected')
      })

    cable.connect()
    // Make sure connected is called asynchrounously
    await Promise.resolve()
    cable.connected()

    await subscribePromise
  })

  it('disconnect does not wait for subscribe to complete if cable is not connected', async () => {
    cable.disconnected()
    cable.connect()

    let subscribePromise = cable.subscribe(channel).ensureSubscribed()

    channel.disconnect()
    cable.connected()

    await cable.hub.subscriptions
      .get(channel.identifier)!
      .pending('unsubscribed')

    expect(channel.state).toEqual('closed')
    expect(cable.hub.size).toEqual(0)

    return expect(subscribePromise).rejects.toEqual(
      Error('Channel was disconnected before subscribing')
    )
  })

  it('multiple subscribes and unsubscribes from different channels', async () => {
    let another = new TestChannel({ id: '26' })

    cable.disconnected()
    cable.connect()

    let subscribeFirst = cable
      .subscribe(channel)
      .ensureSubscribed()
      .catch(err => {
        expect(err).toEqual(
          Error('Channel was disconnected before subscribing')
        )
      })

    channel.disconnect()
    // Make sure connected is called asynchrounously
    await Promise.resolve()
    cable.connected()

    let subscribeSecond = cable.subscribe(another).ensureSubscribed()

    await Promise.all([subscribeFirst, subscribeSecond])

    expect(another.state).toEqual('connected')
    expect(channel.state).toEqual('closed')
    expect(cable.hub.size).toEqual(1)
  })

  it('subscribe + disconnect stale + subscribe another channel', async () => {
    let another = new TestChannel({ id: '26' })

    await cable.subscribe(channel).ensureSubscribed()

    cable.disconnected(new StaleConnectionError('stale'))

    cable.subscribe(another)

    // It shouldn't be connected
    expect(another.state).toEqual('connecting')

    let subscribePromise = another.ensureSubscribed()
    // Make sure connected is called asynchrounously
    await Promise.resolve()
    cable.connected()

    await subscribePromise

    expect(another.state).toEqual('connected')
    expect(channel.state).toEqual('connected')
    expect(cable.hub.size).toEqual(2)
  })

  it('subscribe while connecting', async () => {
    cable.disconnected()
    cable.connect()

    let promise = cable
      .subscribe(channel)
      .ensureSubscribed()
      .then(() => {
        expect(cable.hub.size).toEqual(1)
        expect(channel.state).toEqual('connected')
      })

    // Make sure connected is called asynchrounously
    await Promise.resolve()

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

    let promise = cable
      .subscribe(channel)
      .ensureSubscribed()
      .then(() => {
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

    let promise = cable
      .subscribe(channel)
      .ensureSubscribed()
      .then(() => {
        expect(cable.hub.size).toEqual(1)
        expect(channel.state).toEqual('connected')
      })

    expect(cable.state).toEqual('connecting')
    cable.disconnect()

    cable.connect()
    // Make sure connected is called asynchrounously
    await Promise.resolve()
    cable.connected()

    await promise
  })

  it('subscribing + cable disconnected + subscribed failed with disconnected error + cable connected', async () => {
    let message = { foo: 'bar' }
    let first = true
    let transportCalledResolver: () => void
    let transportCalled = new Promise<void>(resolve => {
      transportCalledResolver = resolve
    })

    jest
      .spyOn(protocol, 'subscribe')
      .mockImplementation(async (identifier, params) => {
        if (first) {
          transportCalledResolver()
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

    let promise = cable
      .subscribe(channel)
      .ensureSubscribed()
      .then(() => {
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

    await transportCalled

    cable.disconnected(new DisconnectedError('test'))

    // Make sure connected is called asynchrounously
    await Promise.resolve()

    cable.connect()
    // Make sure connected is called asynchrounously
    await Promise.resolve()
    cable.connected()

    return expect(promise).resolves.toEqual(message)
  })

  it('subscribe rejected', async () => {
    jest.spyOn(protocol, 'subscribe').mockImplementation(async () => {
      throw new SubscriptionRejectedError()
    })

    let expectedErr: any

    await cable
      .subscribe(channel)
      .ensureSubscribed()
      .catch(err => {
        expectedErr = err
      })

    expect(channel.state).toEqual('closed')
    expect(cable.hub.size).toEqual(0)
    expect(logger.warnings).toHaveLength(1)
    expect(expectedErr).toBeInstanceOf(SubscriptionRejectedError)
  })

  it('subscribe + unsubscribe + rejected', async () => {
    jest.spyOn(protocol, 'subscribe').mockImplementation(async () => {
      await Promise.resolve()

      cable.unsubscribe(channel)

      expect(channel.state).toEqual('closed')
      expect(cable.hub.size).toEqual(0)
      expect(cable.hub.subscriptions.all()).toHaveLength(1)

      throw new SubscriptionRejectedError()
    })

    let subscribePromise = cable
      .subscribe(channel)
      .ensureSubscribed()
      .catch(err => {
        return err
      })

    let err = await subscribePromise
    expect(err).toEqual(
      new ReasonError('Channel was disconnected before subscribing', 'canceled')
    )

    expect(logger.warnings).toHaveLength(1)
    expect(cable.hub.size).toEqual(0)
    expect(cable.hub.subscriptions.all()).toHaveLength(0)
  })

  it('subscribe unknown failure', () => {
    jest.spyOn(protocol, 'subscribe').mockImplementation(async () => {
      throw Error('failed')
    })

    return expect(
      cable
        .subscribe(channel)
        .ensureSubscribed()
        .finally(() => {
          expect(channel.state).toEqual('closed')
          expect(cable.hub.size).toEqual(0)
          expect(logger.errors).toHaveLength(1)
        })
    ).rejects.toEqual(new ReasonError(Error('failed')))
  })

  it('unsubscribe when connected', async () => {
    await cable.subscribe(channel).ensureSubscribed()
    expect(cable.hub.size).toEqual(1)

    cable.unsubscribe(channel)
    expect(cable.hub.size).toEqual(0)
    expect(channel.state).toEqual('closed')
  })

  it('unsubscribe followed by subscribe', async () => {
    await cable.subscribe(channel).ensureSubscribed()

    expect(cable.hub.size).toEqual(1)

    cable.unsubscribe(channel)
    // Make sure called asynchrounously
    await Promise.resolve()
    cable.subscribe(channel)

    let subPromise = channel.ensureSubscribed()

    await subPromise

    expect(channel.state).toEqual('connected')
    expect(cable.hub.size).toEqual(1)
  })

  it('subscribe followed by disconnect', async () => {
    let subPromise = cable.subscribe(channel).ensureSubscribed()
    channel.disconnect()

    await subPromise.catch(err => {
      expect(err).toEqual(Error('Channel was disconnected before subscribing'))
    })

    expect(channel.state).toEqual('closed')
    expect(cable.hub.size).toEqual(0)
  })

  it('unsubscribe while connecting', async () => {
    await cable.subscribe(channel).ensureSubscribed()

    cable.disconnected(new DisconnectedError('before'))
    let connectPromise = cable.connect()

    channel.disconnect()

    let channelPromise = new Promise<void>((resolve, reject) => {
      channel.once('connect', () => {
        reject(Error('Channel reconnected'))
      })
      setTimeout(resolve, 200)
    })

    cable.connected()

    await connectPromise
    await channelPromise
  })

  it('unsubscribe when disconnected', async () => {
    cable.subscribe(channel)
    expect(cable.hub.size).toEqual(1)

    await channel.ensureSubscribed()

    cable.disconnected()

    cable.unsubscribe(channel)
    expect(cable.hub.size).toEqual(0)
    expect(channel.state).toEqual('closed')
  })

  it('unsubscribe with unknown identifier', () => {
    expect(() => {
      cable.unsubscribe(new TestChannel({ id: '123' }))
    }).toThrow(
      Error('Subscription not found: {"channel":"TestChannel","id":"123"}')
    )
  })

  it('unsubscribe failure', async () => {
    cable.subscribe(channel)
    expect(cable.hub.size).toEqual(1)

    await channel.ensureSubscribed()

    jest.spyOn(protocol, 'unsubscribe').mockImplementation(async () => {
      throw Error('failed')
    })

    cable.unsubscribe(channel)

    await cable.hub.subscriptions
      .get(channel.identifier)!
      .pending('unsubscribed')

    expect(logger.errors).toHaveLength(1)
  })

  it('unsubscribe failed due to disconnect', async () => {
    cable.subscribe(channel)
    expect(cable.hub.size).toEqual(1)

    await channel.ensureSubscribed()

    jest.spyOn(protocol, 'unsubscribe').mockImplementation(async () => {
      throw new DisconnectedError('failed')
    })

    cable.unsubscribe(channel)
    expect(cable.hub.size).toEqual(0)
    expect(channel.state).toEqual('closed')

    await cable.hub.subscriptions
      .get(channel.identifier)!
      .pending('unsubscribed')

    expect(channel.state).toEqual('closed')
    expect(cable.hub.size).toEqual(0)
  })

  it('perform when connected', async () => {
    cable.subscribe(channel).ensureSubscribed()

    await cable.perform(channel.identifier, 'do', { foo: 'bar' })

    expect(transport.sent).toEqual([
      JSON.stringify({
        identifier: 'test_26',
        action: 'do',
        payload: { foo: 'bar' }
      })
    ])
  })

  it('perform when closed', async () => {
    await cable.subscribe(channel).ensureSubscribed()

    cable.closed()

    await expect(
      cable.perform(channel.identifier, 'do', { foo: 'bar' })
    ).rejects.toEqual(Error('No connection'))

    let cable2 = new Cable({ ...cableOptions, performFailures: 'warn' })
    cable2.connect()
    cable2.connected()
    let channel2 = cable2.subscribeTo('test')
    await channel2.ensureSubscribed()
    cable2.closed()

    await expect(
      cable2.perform(channel.identifier, 'do', { foo: 'bar' })
    ).resolves.toBeUndefined()
    expect(logger.warnings).toHaveLength(1)

    let cable3 = new Cable({ ...cableOptions, performFailures: 'ignore' })
    cable3.connect()
    cable3.connected()
    let channel3 = cable3.subscribeTo('test')
    await channel3.ensureSubscribed()
    cable3.closed()

    await expect(
      cable3.perform(channel.identifier, 'do', { foo: 'bar' })
    ).resolves.toBeUndefined()
    expect(logger.warnings).toHaveLength(1)
  })

  it('send when closed', () => {
    cable.disconnect()
    expect(() => {
      cable.send({ action: 'ping' })
    }).toThrow(Error('Cable is closed'))
  })

  it('perform when disconnected', async () => {
    cable.subscribe(channel)
    await channel.ensureSubscribed()
    cable.disconnected()

    return expect(channel.perform('do', { foo: 'bar' })).rejects.toEqual(
      Error('No connection')
    )
  })

  it('perform while connecting', async () => {
    cable.subscribe(channel)
    await channel.ensureSubscribed()

    cable.disconnected()
    cable.connect()

    let res = cable
      .perform(channel.identifier, 'do', { foo: 'bar' })
      .then(() => {
        expect(transport.sent).toEqual([
          JSON.stringify({
            identifier: 'test_26',
            action: 'do',
            payload: { foo: 'bar' }
          })
        ])
      })

    // Make sure connected is called asynchrounously
    await Promise.resolve()
    cable.connected()

    return res
  })

  it('connecting - perform - unsubscribe', async () => {
    cable.subscribe(channel)
    await channel.ensureSubscribed()

    cable.disconnected()
    cable.connect()

    let perform = cable.perform(channel.identifier, 'do', { foo: 'bar' })
    cable.unsubscribe(channel)

    // Make sure connected is called asynchrounously
    await Promise.resolve()
    cable.connected()

    await expect(perform).rejects.toEqual(
      Error('Subscription is closed: {"channel":"TestChannel","id":"26"}')
    )
    expect(transport.sent).toHaveLength(0)
  })

  it('perform with unknown identifier', async () => {
    return expect(
      cable.perform(channel.identifier, 'do', { foo: 'bar' })
    ).rejects.toEqual(
      Error('Subscription not found: {"channel":"TestChannel","id":"26"}')
    )
  })

  it('perform with response', async () => {
    cable.subscribe(channel)
    expect(cable.hub.size).toEqual(1)

    await channel.ensureSubscribed()

    jest
      .spyOn(protocol, 'perform')
      .mockImplementation(async (id, action, payload) => {
        expect(id).toEqual('test_26')
        expect(action).toEqual('ping')
        expect(payload).toBeUndefined()

        return Promise.resolve('pong')
      })

    let response = await cable.perform(channel.identifier, 'ping')
    expect(response).toEqual('pong')
  })

  it('perform failure', async () => {
    cable.subscribe(channel)
    expect(cable.hub.size).toEqual(1)

    await channel.ensureSubscribed()

    jest.spyOn(protocol, 'perform').mockImplementation(async () => {
      throw Error('failed')
    })

    return expect(
      cable.perform(channel.identifier, 'bla').finally(() => {
        expect(logger.errors).toHaveLength(1)
      })
    ).rejects.toEqual(Error('failed'))
  })

  it('notify w/o identifier', async () => {
    let received: InfoEvent[] = []
    let promise = new Promise<void>((resolve, reject) => {
      let tid = setTimeout(() => {
        reject(Error('Timed out to receive notification event'))
      }, 500)

      cable.on('info', evt => {
        received.push(evt)

        if (received.length === 2) {
          clearTimeout(tid)
          resolve()
        }
      })
    })

    cable.notify('test_notification')
    cable.notify('test_notification', { foo: 'bar' })

    await promise

    expect(received).toEqual([
      { type: 'test_notification', data: undefined },
      { type: 'test_notification', data: { foo: 'bar' } }
    ])
  })

  it('notify', async () => {
    cable.subscribe(channel)
    expect(cable.hub.size).toEqual(1)

    await channel.ensureSubscribed()

    let promise = new Promise<void>((resolve, reject) => {
      let tid = setTimeout(() => {
        reject(Error('Timed out to receive notification event'))
      }, 500)

      cable.on('info', () => {
        clearTimeout(tid)
        reject(Error('Should not receive info event for cable'))
      })

      channel.on('info', evt => {
        clearTimeout(tid)
        expect(evt.type).toEqual('test_notification')
        expect(evt.data).toEqual({ foo: 'bar' })
        resolve()
      })
    })

    cable.notify('test_notification', 'test_26', { foo: 'bar' })

    await promise
  })

  it('receive events', async () => {
    await cable.subscribe(channel).ensureSubscribed()

    expect(cable.hub.size).toEqual(1)
    expect(channel.state).toEqual('connected')

    let promise = new Promise<void>((resolve, reject) => {
      let tid = setTimeout(() => {
        reject(Error('Timed out to receive message'))
      }, 500)

      channel.on('info', (msg: InfoEvent) => {
        clearTimeout(tid)
        expect(msg.data).toEqual('hallo')
        resolve()
      })
    })

    transport.receive(
      JSON.stringify({
        identifier: 'test_26',
        payload: { data: 'hallo' },
        type: 'info'
      })
    )

    await promise
  })

  describe('closure and recovery with channels', () => {
    let channel2: TestChannel
    let firstError: Promise<void>

    beforeEach(() => {
      channel2 = new TestChannel({ id: '27' })
      let attempt = 0
      let firstErrorResolver: () => void
      firstError = new Promise<void>(resolve => {
        firstErrorResolver = resolve
      })

      jest
        .spyOn(protocol, 'subscribe')
        .mockImplementation(async (identifier, params) => {
          if ((params as any).id === '27') {
            attempt++
            firstErrorResolver()

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
      await cable.subscribe(channel).ensureSubscribed()

      cable.subscribe(channel2)

      expect(cable.hub.size).toEqual(2)
      expect(channel.state).toEqual('connected')
      expect(channel2.state).toEqual('connecting')

      transport.close()
      expect(channel.state).toEqual('disconnected')
      expect(channel2.state).toEqual('disconnected')
    })

    it('closed by user', async () => {
      await cable.subscribe(channel).ensureSubscribed()
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
      await cable.subscribe(channel).ensureSubscribed()

      cable.subscribe(channel2)

      expect(cable.hub.size).toEqual(2)
      expect(channel.state).toEqual('connected')
      expect(channel2.state).toEqual('connecting')

      transport.closed('recover_me')
      expect(channel.state).toEqual('connecting')
      expect(channel2.state).toEqual('connecting')
    })

    it('connected after disconnect should resubscribe channels', async () => {
      await cable.subscribe(channel).ensureSubscribed()
      expect(cable.hub.size).toEqual(1)

      cable.closed()

      let connectPromise = new Promise<void>((resolve, reject) => {
        let tid = setTimeout(() => {
          reject(Error('Timeout out to connect'))
        }, 200)

        channel.on('connect', () => {
          clearTimeout(tid)
          expect(channel.state).toEqual('connected')
          resolve()
        })
      })

      // Make sure connected is called asynchrounously
      await Promise.resolve()
      cable.connected()

      await connectPromise
    })

    it('restored after recoverable disconnect should mark channels as connected', async () => {
      await cable.subscribe(channel).ensureSubscribed()

      let subscribePromise = cable
        .subscribe(channel2)
        .ensureSubscribed()
        .then(() => {
          expect(channel2.state).toEqual('connected')
        })

      expect(cable.hub.size).toEqual(2)

      await firstError

      transport.closed('recover_me')

      await Promise.resolve()

      expect(channel.state).toEqual('connecting')
      expect(channel2.state).toEqual('connecting')

      // Make sure restored is called asynchrounously
      await Promise.resolve()
      cable.restored(['test_26'])

      expect(channel.state).toEqual('connected')
      expect(channel2.state).toEqual('connecting')

      await subscribePromise
    })

    it('resubscribe with empty subscription', async () => {
      await cable.subscribe(channel).ensureSubscribed()
      expect(cable.hub.size).toEqual(1)

      transport.closed('recover_me')

      await Promise.resolve()

      expect(channel.state).toEqual('connecting')

      cable.hub.subscriptions.get(channel.identifier)!.remove(channel)

      // Make sure restored is called asynchrounously
      await Promise.resolve()
      cable.connected()

      expect(channel.state).toEqual('connecting')
    })

    it('restored only marks matching channels as connected', async () => {
      await cable.subscribe(channel).ensureSubscribed()

      let event: DisconnectedError | undefined

      channel.on('disconnect', ev => {
        event = ev
      })

      let subscribePromise = cable
        .subscribe(channel2)
        .ensureSubscribed()
        .then(() => {
          expect(channel2.state).toEqual('connected')
        })

      expect(cable.hub.size).toEqual(2)

      await firstError

      transport.closed('recover_me')

      await Promise.resolve()

      expect(channel.state).toEqual('connecting')
      expect(channel2.state).toEqual('connecting')

      expect(event).toBeUndefined()

      // Make sure restored is called asynchrounously
      await Promise.resolve()

      cable.restored([])

      expect(channel.state).toEqual('connecting')
      expect(channel2.state).toEqual('connecting')
      expect(event).toBeDefined()

      await subscribePromise
    })

    it('restored after non-recoverable disconnect', async () => {
      await cable.subscribe(channel).ensureSubscribed()

      expect(cable.hub.size).toEqual(1)

      cable.closed()

      let connectPromise = new Promise<void>((resolve, reject) => {
        let tid = setTimeout(() => {
          reject(Error('Timeout out to connect'))
        }, 200)

        channel.on('connect', () => {
          clearTimeout(tid)
          expect(channel.state).toEqual('connected')
          resolve()
        })
      })

      // Make sure restored is called asynchrounously
      await Promise.resolve()
      cable.restored(['test_26'])

      await connectPromise
    })

    it('connected after recoverable disconnect should first mark channels as disconnected', async () => {
      await cable.subscribe(channel).ensureSubscribed()

      expect(cable.hub.size).toEqual(1)

      transport.closed('recover_me')

      expect(channel.state).toEqual('connecting')

      let disconnectP = new Promise<void>((resolve, reject) => {
        let tid = setTimeout(() => {
          reject(Error('timed out to disconnnect'))
        }, 200)
        channel.on('disconnect', () => {
          clearTimeout(tid)
          resolve()
        })
      })

      let connectP = new Promise<void>((resolve, reject) => {
        let tid = setTimeout(() => {
          reject(Error('timed out to connect'))
        }, 200)

        channel.on('connect', () => {
          clearTimeout(tid)
          resolve()
        })

        // Make sure connected is called asynchrounously
        return Promise.resolve().then(() => {
          cable.connected()
        })
      })

      return Promise.all([disconnectP, connectP]).then(() => {
        expect(channel.state).toEqual('connected')
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

      await cable.subscribe(channel).ensureSubscribed()
      await channel.ensureSubscribed()

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

      await cable.subscribe(channel).ensureSubscribed()

      expect(cable.hub.size).toEqual(1)
      expect(channel.state).toEqual('connected')

      cable.disconnected(new DisconnectedError('test'))

      let subscribePromise = cable.subscribe(channel).ensureSubscribed()

      let connectPromise = cable.connect()

      // Make sure connected is called asynchrounously
      await Promise.resolve()
      cable.connected()

      await connectPromise
      await subscribePromise

      expect(cable.hub.size).toEqual(1)
      expect(channel.state).toEqual('connected')

      expect(spy).toHaveBeenCalledTimes(2)
    })

    it('is not possible to subscribe to different cables', async () => {
      await cable.subscribe(channel).ensureSubscribed()

      // subscribing to another cable should fail
      let newCable = new Cable({ protocol, encoder, logger, transport })

      expect(() => {
        newCable.subscribe(channel)
      }).toThrow(Error('Already connected to a different receiver'))
    })

    it('all attemts are rejected in case of a failure', () => {
      jest.spyOn(protocol, 'subscribe').mockImplementation(async () => {
        throw new SubscriptionRejectedError()
      })

      let p1 = cable.subscribe(channel).ensureSubscribed()
      let p2 = cable.subscribe(channel).ensureSubscribed()

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

      await cable.subscribe(channel).ensureSubscribed()
      await cable.subscribe(another).ensureSubscribed()

      expect(subscribeSpy).toHaveBeenCalledTimes(1)

      expect(cable.hub.size).toEqual(2)
      expect(channel.state).toEqual('connected')
      expect(another.state).toEqual('connected')

      channel.disconnect()
      expect(channel.state).toEqual('closed')
      expect(unsubscribeSpy).toHaveBeenCalledTimes(0)

      let messagePromise = new Promise<Message>((resolve, reject) => {
        let tid = setTimeout(() => {
          reject(Error('Timed out to receive message'))
        }, 500)

        another.on('message', msg => {
          clearTimeout(tid)
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

      await cable.subscribe(channel).ensureSubscribed()

      expect(subscribeSpy).toHaveBeenCalledTimes(1)
      channel.disconnect()

      another.disconnect()
      expect(channel.state).toEqual('closed')
      expect(another.state).toEqual('closed')

      let sub = cable.hub.subscriptions.get(channel.identifier)!
      await sub.pending('subscribed')
      await sub.pending('unsubscribed')

      expect(unsubscribeSpy).toHaveBeenCalledTimes(1)

      await cable.subscribe(channel).ensureSubscribed()
      expect(channel.state).toEqual('connected')
      expect(subscribeSpy).toHaveBeenCalledTimes(2)
    })

    it('unsubscribe more times than subscribe', async () => {
      await cable.subscribe(channel).ensureSubscribed()

      cable.unsubscribe(channel)

      expect(() => {
        cable.unsubscribe(channel)
      }).not.toThrow()
    })

    it('unsubscribe failure', async () => {
      let unsubscribeSpy = jest
        .spyOn(protocol, 'unsubscribe')
        .mockImplementation(async (_identifier: string) => {
          throw Error('Something went wrong')
        })

      await cable.subscribe(channel).ensureSubscribed()

      channel.disconnect()

      let sub = cable.hub.subscriptions.get(channel.identifier)!

      await sub.pending('subscribed')
      await sub.pending('unsubscribed')

      expect(unsubscribeSpy).toHaveBeenCalledTimes(1)

      await sub.pending('unsubscribed')

      expect(channel.state).toBe('closed')
      expect(cable.hub.size).toBe(0)
    })
  })

  describe('with concurrentSubscribes=false', () => {
    let anotherChannel: TestChannel

    beforeEach(() => {
      anotherChannel = new TestChannel({ id: '27' })

      cable = new Cable({
        protocol,
        encoder,
        logger,
        transport,
        hubOptions: { concurrentSubscribes: false }
      })

      cable.connect()
      cable.connected()
    })

    it('concurrent subscribe commands are executed sequentially', async () => {
      let firstSubResolver!: (value: string) => void
      let firstSubConfirmed = new Promise<string>(resolve => {
        firstSubResolver = resolve
      })

      let secondSubResolver!: (value: string) => void
      let secondSubConfirmed = new Promise<string>(resolve => {
        secondSubResolver = resolve
      })

      let subscribeSpy = jest
        .spyOn(protocol, 'subscribe')
        .mockImplementation((identifier, params) => {
          if ((params as any).id === '26') {
            return firstSubConfirmed
          } else {
            return secondSubConfirmed
          }
        })

      let p1 = cable.subscribe(channel).ensureSubscribed()
      let p2 = cable.subscribe(anotherChannel).ensureSubscribed()

      // Subscribes are sent asynchronously, so we need to continue execution after they're processed
      await Promise.resolve()
      await Promise.resolve()

      expect(subscribeSpy).toHaveBeenCalledTimes(1)

      firstSubResolver('test_1')

      await p1

      secondSubResolver('test_2')

      await p2

      expect(subscribeSpy).toHaveBeenCalledTimes(2)
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
    await channel.ensureSubscribed()

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
    await channel.ensureSubscribed()

    expect(cable.hub.size).toEqual(1)
    expect(channel.state).toEqual('connected')

    let another = cable.subscribeTo('some_channel', { id: '2020' })
    await another.ensureSubscribed()

    expect(cable.hub.size).toEqual(2)
    expect(another).not.toBe(channel)
  })

  it('caches channels via classes', async () => {
    let channel = cable.subscribeTo(TestChannel, { id: '2020' })
    await channel.ensureSubscribed()

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

describe('streamFrom / streamFromSigned', () => {
  beforeEach(() => {
    cable.connect()
    cable.connected()

    jest
      .spyOn(protocol, 'subscribe')
      .mockImplementation(async (identifier, params) => {
        return JSON.stringify({ identifier, ...params })
      })
  })

  it('subscribes to $pubsub channel', async () => {
    let channel = cable.streamFrom('chat_15')
    await channel.ensureSubscribed()

    let signedChannel = cable.streamFromSigned('xyz-chat-zyx')
    await signedChannel.ensureSubscribed()

    expect(cable.hub.size).toEqual(2)
    expect(channel.state).toEqual('connected')
    expect(signedChannel.state).toEqual('connected')

    let p = new Promise<Message>(resolve => channel.on('message', resolve))
    let p2 = new Promise<Message>(resolve =>
      signedChannel.on('message', resolve)
    )

    transport.receive(
      JSON.stringify({
        identifier: JSON.stringify({
          identifier: '$pubsub',
          stream_name: 'chat_15'
        }),
        payload: { foo: 'clear' }
      })
    )

    let received = await p

    expect(received).toEqual({ foo: 'clear' })

    transport.receive(
      JSON.stringify({
        identifier: JSON.stringify({
          identifier: PUBSUB_CHANNEL,
          signed_stream_name: 'xyz-chat-zyx'
        }),
        payload: { foo: 'signed' }
      })
    )

    let received2 = await p2

    expect(received2).toEqual({ foo: 'signed' })
  })

  it('using PubSubChannel class', async () => {
    let channel = new PubSubChannel({ stream_name: 'chat_2' })
    cable.subscribe(channel)
    await channel.ensureSubscribed()

    expect(cable.hub.size).toEqual(1)
    expect(channel.state).toEqual('connected')

    let p = new Promise<Message>(resolve => channel.on('message', resolve))

    transport.receive(
      JSON.stringify({
        identifier: JSON.stringify({
          identifier: '$pubsub',
          stream_name: 'chat_2'
        }),
        payload: { foo: 'clear' }
      })
    )

    let received = await p

    expect(received).toEqual({ foo: 'clear' })
  })

  it('rejects perform attempts', async () => {
    let channel = cable.streamFrom('chat_15')
    await channel.ensureSubscribed()

    // @ts-ignore
    expect(channel.perform('keepalive')).rejects.toEqual(
      Error('not implemented')
    )
  })

  it('allows whispering', async () => {
    let channel = cable.streamFrom('chat_15')
    await channel.ensureSubscribed()

    jest
      .spyOn(protocol, 'perform')
      .mockImplementation(async (id, action, payload) => {
        expect(action).toEqual('$whisper')
        expect(payload).toEqual({ foo: 'bar' })

        return Promise.resolve()
      })

    await channel.whisper({ foo: 'bar' })
  })
})

describe('setSessionID', () => {
  it('sets session id and updates transport params', () => {
    cable.setSessionId('session-id')
    expect(cable.sessionId).toEqual('session-id')
    expect(transport.state.sid).toEqual('session-id')
  })
})
