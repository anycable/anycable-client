import { jest } from '@jest/globals'
import {
  Cable,
  JSONEncoder,
  Message,
  ProcessedMessage,
  DisconnectedError,
  Protocol,
  NoopLogger,
  Channel,
  Encoder,
  SubscriptionRejectedError
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
      return setTimeout(
        () => resolve(JSON.stringify({ identifier, ...params })),
        0
      )
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

  receive(msg: Message): ProcessedMessage | void {
    this.counter++

    if (msg === 'disconnect') {
      this.cable.disconnected(new DisconnectedError())
      return
    }

    if (msg === 'close') {
      this.cable.close(new DisconnectedError('closed'))
      return
    }

    if (typeof msg === 'object') {
      let data = msg as { identifier: string; payload: object }

      if (!data) return

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
  transport = new TestTransport()
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
  it('is disconnected', () => {
    expect(cable.state).toEqual('disconnected')
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
    expect(transport.opened).toBeTruthy()
  })
})

describe('connect/disconnect', () => {
  it('connect', () => {
    cable.connect()

    expect(cable.state).toEqual('connecting')
    expect(transport.opened).toBeTruthy()
  })

  it('connected', done => {
    cable.on('connect', () => done())

    cable.connected()
    expect(cable.state).toEqual('connected')
  })

  it('double connect', () => {
    expect(cable.state).toEqual('disconnected')

    let res = Promise.allSettled([cable.connect(), cable.connect()]).then(
      results => {
        expect(results[0].status).toEqual('fulfilled')
        expect(results[1].status).toEqual('fulfilled')

        expect(cable.state).toEqual('connected')
        expect(transport.opened).toBeTruthy()
      }
    )

    cable.connected()

    return res
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

    return expect(cable.connect()).rejects.toEqual(Error('Connection failed'))
  })

  it('connect closed before connected', () => {
    let res = cable.connect()

    cable.close('Connection closed')

    return expect(res).rejects.toEqual({ reason: 'Connection closed' })
  })

  it('close', done => {
    cable.once('close', ev => {
      let event = ev as { reason: string }
      expect(event.reason).toEqual('test')
      done()
    })

    cable.connected()
    cable.close('test')

    expect(cable.state).toEqual('disconnected')
    expect(transport.opened).toBeFalsy()

    cable.close('test2')
  })

  it('disconnected with reason', done => {
    cable.on('disconnect', ev => {
      let event = ev as { reason: string }
      expect(event.reason).toEqual('test')
      done()
    })

    cable.connected()
    cable.disconnected('test')
    cable.disconnected('test2')

    expect(cable.state).toEqual('disconnected')
    expect(transport.opened).toBeFalsy()
  })

  it('handles transport close', done => {
    cable.on('disconnect', () => done())

    cable.connected()

    transport.closed('network failure')

    expect(cable.state).toEqual('disconnected')
  })

  it('handles server initiated disconnect', done => {
    cable.on('disconnect', () => done())

    cable.connected()

    transport.receive(JSON.stringify('disconnect'))

    expect(cable.state).toEqual('disconnected')
    expect(transport.opened).toBeFalsy()
  })

  it('handles server initiated close', done => {
    cable.on('close', () => done())

    cable.connected()

    transport.receive(JSON.stringify('close'))

    expect(cable.state).toEqual('disconnected')
    expect(transport.opened).toBeFalsy()
  })

  it('receive is no-op when disconnected', () => {
    expect(cable.state).toEqual('disconnected')

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

  it('subscribe when disconnected', () => {
    cable.disconnected()
    return expect(cable.subscribe(channel)).rejects.toEqual(
      Error('No connection')
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

  it('subscribe rejected', () => {
    jest.spyOn(protocol, 'subscribe').mockImplementation(async () => {
      throw new SubscriptionRejectedError()
    })

    expect(
      cable.subscribe(channel).finally(() => {
        expect(channel.state).toEqual('disconnected')
        expect(cable.hub.size).toEqual(0)
        expect(logger.warnings).toHaveLength(1)
      })
    ).rejects.toBeInstanceOf(SubscriptionRejectedError)
  })

  it('subscribe failure', () => {
    jest.spyOn(protocol, 'subscribe').mockImplementation(async () => {
      throw Error('failed')
    })

    expect(
      cable.subscribe(channel).finally(() => {
        expect(channel.state).toEqual('disconnected')
        expect(cable.hub.size).toEqual(0)
        expect(logger.errors).toHaveLength(1)
      })
    ).rejects.toEqual(Error('failed'))
  })

  it('unsubscribe when connected', async () => {
    let identifier = await cable.subscribe(channel)
    expect(cable.hub.size).toEqual(1)

    await cable.unsubscribe(identifier)
    expect(cable.hub.size).toEqual(0)
    expect(channel.state).toEqual('disconnected')
  })

  it('unsubscribe while connecting', () => {
    return cable.subscribe(channel).then(identifier => {
      cable.disconnected()
      cable.connect()

      let res = cable.unsubscribe(identifier).then(() => {
        expect(cable.hub.size).toEqual(0)
        expect(channel.state).toEqual('disconnected')
      })

      cable.connected()

      return res.then(() => {
        // Make sure there is no race conditions between unsubscribe and subscribe during reconnect
        return new Promise<void>((resolve, reject) => {
          channel.once('connect', () => reject('Channel reconnected'))
          setTimeout(resolve, 200)
        })
      })
    })
  })

  it('unsubscribe when disconnected', async () => {
    let identifier = await cable.subscribe(channel)
    expect(cable.hub.size).toEqual(1)

    cable.disconnected()

    await cable.unsubscribe(identifier)
    expect(cable.hub.size).toEqual(0)
    expect(channel.state).toEqual('disconnected')
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
    ).rejects.toEqual(Error('failed'))
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

  it('handles closure', async () => {
    await cable.subscribe(channel)
    expect(cable.hub.size).toEqual(1)
    expect(channel.state).toEqual('connected')

    transport.close()
    expect(channel.state).toEqual('disconnected')
  })

  it('handles recoverable closure', async () => {
    await cable.subscribe(channel)
    expect(cable.hub.size).toEqual(1)
    expect(channel.state).toEqual('connected')

    transport.closed('recover_me')
    expect(channel.state).toEqual('connecting')
  })

  it('connected after disconnect should resubscribe channels', () => {
    return cable.subscribe(channel).then(() => {
      expect(cable.hub.size).toEqual(1)

      cable.close()

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
    expect(cable.hub.size).toEqual(1)

    transport.closed('recover_me')

    expect(channel.state).toEqual('connecting')

    cable.restored()

    expect(channel.state).toEqual('connected')
  })

  it('restored after non-recoverable disconnect should resubscribe channels', () => {
    return cable.subscribe(channel).then(() => {
      expect(cable.hub.size).toEqual(1)

      cable.close()

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

it('logs encode errors', () => {
  jest
    .spyOn(encoder, 'encode')
    .mockImplementation((msg: object): string | undefined => {
      return
    })

  expect(logger.errors).toHaveLength(0)

  cable.send({ action: 'do' })
  expect(logger.errors).toHaveLength(1)
})

it('logs decode errors', () => {
  jest
    .spyOn(encoder, 'decode')
    .mockImplementation((msg: string): object | undefined => {
      return
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

  expect(cable.keepalive({ epoch: 7 })).toBeUndefined()
})
