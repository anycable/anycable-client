import { jest } from '@jest/globals'

import {
  createCable,
  ActionCableProtocol,
  WebSocketTransport,
  Message,
  createConsumer,
  Transport,
  SubscriptionRejectedError,
  DisconnectedError,
  Cable,
  TokenRefresher
} from '../index.js'
import { TestTransport } from '../transport/testing'

it('requires url or transport', () => {
  expect(() => createCable()).toThrow(/url or transport must be specified/i)
})

it('with transport', () => {
  let tt = new TestTransport('ws://anycable.test')
  let cable = createCable({ transport: tt })

  expect(cable.transport).toBe(tt)
})

class FakeSocket {
  url: string
  format: string
  foo: string
  subprotocol: string

  constructor(
    url: string,
    subprotocol: string,
    options: Record<any, any> = {}
  ) {
    this.url = url
    this.format = options.websocketFormat
    this.subprotocol = subprotocol
    this.foo = options.foo
  }
}

it('with websocket options', () => {
  let cable = createCable('ws://example', {
    websocketImplementation: FakeSocket,
    websocketOptions: { foo: 'bar' },
    subprotocol: 'anycable-test'
  })

  cable.transport.open()

  let wsTransport = cable.transport as WebSocketTransport
  let socket = wsTransport.ws as unknown as FakeSocket

  expect(socket.url).toBe('ws://example')
  expect(socket.foo).toBe('bar')
  expect(socket.subprotocol).toBe('anycable-test')
})

it('defaults', () => {
  let cable = createCable('ws://example')
  expect(cable.protocol).toBeInstanceOf(ActionCableProtocol)
  expect(cable.transport).toBeInstanceOf(WebSocketTransport)

  let ws = cable.transport as WebSocketTransport
  expect(ws.url).toEqual('ws://example')

  expect(cable.logger.level).toEqual('warn')
})

it('unsupported protocol', () => {
  expect(() =>
    // We want to make sure, that `createCable` throws an error
    // for unsupported protocols in runtime. Since TS doesn't allow to
    // pass arbitrary string as protocol, we ignore it for this particular test
    //
    // @ts-ignore
    createCable('ws://example', { protocol: 'actioncable-v1-whatever' })
  ).toThrow(/protocol is not supported/i)

  expect(() =>
    // @ts-ignore
    createCable('ws://example', { protocol: 'action-cable-v1-json' })
  ).toThrow(/protocol is not supported/i)
})

it('missing protocol', () => {
  expect(() => createCable('ws://example', { protocol: undefined })).toThrow(
    /protocol must be specified/i
  )
})

it('missing encoder when required', () => {
  expect(() =>
    createCable('ws://example', { protocol: 'actioncable-v1-msgpack' })
  ).toThrow(/encoder must be specified/i)

  expect(() =>
    createCable('ws://example', { protocol: 'actioncable-v1-protobuf' })
  ).toThrow(/encoder must be specified/i)
})

it('with monitor=false', () => {
  let cable = createCable('ws://example', { monitor: false })

  expect(cable.monitor).toBeUndefined()
})

describe('with tokenRefresher', () => {
  let transport: TestTransport
  let called: number
  let refresher: TokenRefresher
  let cable: Cable

  beforeEach(() => {
    transport = new TestTransport('ws://anycable.test')
    called = 0
    refresher = (t: Transport) => {
      called++
      t.setURL('ws://anycable-new.test')
      return Promise.resolve()
    }

    cable = createCable('ws://example', {
      tokenRefresher: refresher,
      transport
    })
  })

  it('success', () => {
    cable.connected()
    cable.closed('token_expired')

    let spy = jest.spyOn(cable, 'connect')

    return new Promise<void>(resolve => {
      transport.once('open', () => {
        cable.connected()
        expect(transport.url).toEqual('ws://anycable-new.test')
        expect(spy).toHaveBeenCalledTimes(1)
        resolve()
      })
    })
  })

  it('when failed to refresh', () => {
    refresher = (t: Transport) => {
      called++
      return Promise.reject(Error('no token in the response'))
    }

    cable = createCable('ws://example', {
      tokenRefresher: refresher,
      transport
    })

    cable.connected()
    let spy = jest.spyOn(cable, 'connect')

    cable.closed('token_expired')
    expect(spy).toHaveBeenCalledTimes(0)
    expect(called).toEqual(1)

    // Check that we're trying to refresh after cable connected successfully
    cable.connected()
    cable.closed('token_expired')

    expect(called).toEqual(2)
    expect(spy).toHaveBeenCalledTimes(0)
  })

  it('multiple expirations', async () => {
    cable.connected()
    cable.closed('token_expired')

    expect(called).toEqual(1)
    expect(transport.url).toEqual('ws://anycable-new.test')

    cable.connected()

    // A hack to make sure all async functions have been resolved
    await new Promise<void>(resolve => setTimeout(resolve, 100))

    cable.closed('token_expired')
    expect(called).toEqual(2)
  })

  it('when connection failed', async () => {
    cable.connected()

    let openSpy = jest.spyOn(cable.transport, 'open').mockImplementation(() => {
      return Promise.reject(new DisconnectedError('failed'))
    })

    let waitDisconnect = new Promise(resolve => {
      cable.on('disconnect', resolve)
    })

    cable.closed('token_expired')
    expect(called).toEqual(1)

    await waitDisconnect

    openSpy.mockReset()

    // Check that we continue to watching expired tokens in case of disconnect
    cable.connected()
    cable.closed('token_expired')

    // A hack to make sure all async functions have been resolved
    await new Promise<void>(resolve => setTimeout(resolve, 100))

    expect(called).toEqual(2)
    expect(cable.state).toEqual('connecting')
  })

  it('when still expired or closed by server', async () => {
    cable.connected()
    cable.closed('token_expired')

    expect(called).toEqual(1)
    expect(transport.url).toEqual('ws://anycable-new.test')

    // A hack to make sure all async functions have been resolved
    await new Promise<void>(resolve => setTimeout(resolve, 100))

    // Shouldn't call refresher again
    cable.closed('unauthorized')
    expect(called).toEqual(1)
  })

  it('doesn not call refresher if closed by user', async () => {
    cable.connected()
    cable.disconnect()

    expect(called).toEqual(0)
  })
})

type TestMixin = {
  initialized: () => void
  connected: () => void
  rejected: () => void
  received: (data: Message) => void
  disconnected: () => void
  callbacks: string[]
  messages: Message[]
}

describe('createConsumer', () => {
  let mixin: TestMixin

  beforeEach(() => {
    /* eslint-disable object-shorthand */
    mixin = {
      callbacks: [],
      messages: [],
      initialized: function () {
        let self = this as unknown as TestMixin
        self.callbacks = ['initialized']
        self.messages = []
      },
      connected: function () {
        let self = this as unknown as TestMixin
        self.callbacks.push('connected')
      },
      rejected: function () {
        let self = this as unknown as TestMixin
        self.callbacks.push('rejected')
      },
      received: function (data: Message) {
        let self = this as unknown as TestMixin
        self.messages.push(data)
      },
      disconnected: function () {
        let self = this as unknown as TestMixin
        self.callbacks.push('disconnected')
      }
    }
  })

  it('subscriptions + message + unsubscribe', async () => {
    let consumer = createConsumer('ws://example')
    let cable = consumer.cable
    cable.connected()

    expect(cable.protocol).toBeInstanceOf(ActionCableProtocol)

    jest.spyOn(cable.protocol, 'subscribe').mockImplementation(() => {
      return Promise.resolve('2020')
    })

    let sub = consumer.subscriptions.create<TestMixin>(
      {
        sub: 'some_channel',
        id: '2020'
      },
      mixin
    )

    let channel = sub.channel

    expect(sub.identifier).toEqual(channel.identifier)
    expect(sub.callbacks).toContain('initialized')

    await new Promise<void>((resolve, reject) => {
      let tid = setTimeout(() => {
        reject(Error('Timed out to receive connect'))
      }, 400)
      channel.once('connect', () => {
        clearTimeout(tid)
        resolve()
      })
    })

    expect(cable.hub.size).toEqual(1)
    expect(channel.state).toEqual('connected')
    expect(sub.callbacks).toContain('connected')

    let message = { foo: 'bar' }

    channel.receive(message)

    expect(sub.messages).toEqual([message])

    jest.spyOn(cable.protocol, 'unsubscribe').mockImplementation(() => {
      return Promise.resolve()
    })

    let closePromise = new Promise<void>((resolve, reject) => {
      let tid = setTimeout(() => {
        reject(Error('Timed out to receive close'))
      }, 400)

      channel.once('close', () => {
        clearTimeout(tid)
        resolve()
      })
    })

    sub.unsubscribe()

    await closePromise

    expect(sub.callbacks).toContain('disconnected')
  })

  it('subscriptions + rejected', async () => {
    let consumer = createConsumer('ws://example')
    let cable = consumer.cable
    cable.connected()

    expect(cable.protocol).toBeInstanceOf(ActionCableProtocol)

    jest.spyOn(cable.protocol, 'subscribe').mockImplementation(() => {
      return Promise.reject(new SubscriptionRejectedError('Forbidden'))
    })

    let sub = consumer.subscriptions.create<TestMixin>(
      {
        channel: 'some_channel',
        id: '2020'
      },
      mixin
    )

    let channel = sub.channel

    expect(sub.callbacks).toContain('initialized')

    await new Promise<void>(resolve =>
      channel.once('close', () => {
        resolve()
      })
    )
    expect(sub.callbacks).toContain('rejected')
  })

  it('subscription without params + disconnect', async () => {
    let consumer = createConsumer('ws://example')
    let cable = consumer.cable
    cable.connected()

    expect(cable.protocol).toBeInstanceOf(ActionCableProtocol)

    jest.spyOn(cable.protocol, 'subscribe').mockImplementation(() => {
      return Promise.resolve('2020')
    })

    let sub = consumer.subscriptions.create<TestMixin>('some_channel', mixin)

    let channel = sub.channel

    expect(sub.callbacks).toContain('initialized')

    await new Promise<void>(resolve =>
      channel.once('connect', () => {
        resolve()
      })
    )

    expect(sub.callbacks).toContain('connected')

    cable.disconnected()

    expect(sub.callbacks).toContain('disconnected')
  })

  it('subscription with partial mixin', async () => {
    let consumer = createConsumer('ws://example')
    let cable = consumer.cable
    cable.connected()

    expect(cable.protocol).toBeInstanceOf(ActionCableProtocol)

    jest.spyOn(cable.protocol, 'subscribe').mockImplementation(() => {
      return Promise.resolve('2020')
    })

    let data: Message[] = []

    let minimalMixin = {
      received: (msg: Message) => data.push(msg)
    }

    let sub = consumer.subscriptions.create<TestMixin>(
      'some_channel',
      minimalMixin
    )

    let channel = sub.channel

    await new Promise<void>(resolve =>
      channel.once('connect', () => {
        resolve()
      })
    )

    let message = { foo: 'bar' }

    channel.receive(message)

    expect(data).toEqual([message])
  })

  it('subscription + perform + send', async () => {
    let consumer = createConsumer('ws://example')
    let cable = consumer.cable
    cable.connected()

    expect(cable.protocol).toBeInstanceOf(ActionCableProtocol)

    jest.spyOn(cable.protocol, 'subscribe').mockImplementation(() => {
      return Promise.resolve('2020')
    })

    let sentData

    jest.spyOn(cable, 'send').mockImplementation(data => {
      sentData = data
    })

    let sub = consumer.subscriptions.create('some_channel')

    let channel = sub.channel

    await new Promise<void>((resolve, reject) => {
      let tid = setTimeout(() => {
        reject(Error('Timed out to receive connect'))
      }, 400)

      channel.once('connect', () => {
        clearTimeout(tid)
        resolve()
      })
    })

    sub.perform('test', { foo: 'bar' })

    await new Promise<void>(resolve => setTimeout(resolve, 100))

    expect(sentData).toEqual({
      command: 'message',
      identifier: '2020',
      data: JSON.stringify({ foo: 'bar', action: 'test' })
    })

    sub.send({ type: 'history' })

    await new Promise<void>(resolve => setTimeout(resolve, 100))

    expect(sentData).toEqual({
      command: 'message',
      identifier: '2020',
      data: JSON.stringify({ type: 'history' })
    })
  })
})
