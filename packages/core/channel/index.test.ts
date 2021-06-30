import { Channel } from '../index.js'
import { Events, Connector, ConnectorCallback, Message, Pipe } from '../index'
import { jest } from '@jest/globals'

class TestPipe implements Pipe {
  conn: TestConnector
  id: string

  constructor(conn: TestConnector, id: string) {
    this.conn = conn
    this.id = id
  }

  close() {
    return this.conn.unsubscribe(this.id)
  }
  send(data: { action: string; payload: Message }) {
    return this.conn.perform(this.id, data.action, data.payload)
  }
}

class TestConnector implements Connector {
  callback!: ConnectorCallback
  sentCount!: number
  subscriptionsCount!: number

  connector() {
    this.sentCount = 0
    this.subscriptionsCount = 0
  }

  subscribe(
    data: { channel: string; params: any },
    callback: ConnectorCallback
  ): Promise<Pipe> {
    this.callback = callback
    const id = (++this.subscriptionsCount).toString()
    return Promise.resolve(new TestPipe(this, id))
  }

  unsubscribe(sid: string): Promise<void> {
    return Promise.resolve()
  }

  perform(sid: string, action: string, payload?: any): Promise<any> {
    if (!payload) {
      payload = {}
    }

    payload.action = action

    return Promise.resolve(payload)
  }

  send(msg: Message) {
    this.callback(msg, { id: (++this.sentCount).toString() })
  }
}

class TestChannel extends Channel<{ id: string }> {
  static identifier = 'test'
}

let client: TestConnector

beforeEach(() => {
  client = new TestConnector()
})

describe('connector communicaton', () => {
  let channel: TestChannel

  beforeEach(() => {
    channel = new TestChannel(client, { id: '2021' })
  })

  it('freezes params', () => {
    expect(() => (channel.params.id = 'bar')).toThrow(
      /Cannot assign to read only property/
    )
  })

  it('connects', async () => {
    jest
      .spyOn(client, 'subscribe')
      .mockImplementation(({ channel, params }, _callback) => {
        expect(channel).toEqual('test')
        expect(params).toMatchObject({ id: '2021' })

        return Promise.resolve(new TestPipe(client, '1'))
      })

    await channel.connect()

    expect(channel.connected).toEqual(true)
  })

  it('connect rejection', async () => {
    jest
      .spyOn(client, 'subscribe')
      .mockImplementation(({ channel, params }, _callback) => {
        expect(channel).toEqual('test')
        expect(params).toMatchObject({ id: '2021' })

        return Promise.reject('Forbidden')
      })

    try {
      await channel.connect()
      fail('No exception was thrown')
    } catch (e) {
      expect(e).toEqual('Forbidden')
    }

    expect(channel.connected).toEqual(false)
  })

  it('double connect', async () => {
    await channel.connect()

    try {
      await channel.connect()
      fail('No exception was thrown')
    } catch (e) {
      expect(e).toEqual('Already connected')
    }
  })

  it('performs action with payload', async () => {
    await channel.connect()

    jest
      .spyOn(channel.pipe, 'send')
      .mockImplementation((data: { action: string; payload?: Message }) => {
        expect(data.action).toEqual('do')
        expect(data.payload).toMatchObject({ foo: 'bar' })

        return Promise.resolve(null)
      })

    let res = await channel.perform('do', { foo: 'bar' })
    expect(res).toBeNull()
  })

  it('performs action without payload', async () => {
    await channel.connect()

    jest
      .spyOn(channel.pipe, 'send')
      .mockImplementation((data: { action: string; payload?: Message }) => {
        expect(data.action).toEqual('do')
        expect(data.payload).toBeUndefined()

        return Promise.resolve(null)
      })

    let res = await channel.perform('do')
    expect(res).toBeNull()
  })

  it('performs without connect', async () => {
    try {
      await channel.perform('do', { foo: 'bar' })
      fail('No exception was thrown')
    } catch (e) {
      expect(e).toMatch(/must be connected/i)
    }
  })

  it('performs right after connect', async () => {
    channel.connect()
    let res = await channel.perform('do', { foo: 'bar' })
    expect(res).toMatchObject({ foo: 'bar', action: 'do' })
  })

  it('disconnects', async () => {
    await channel.connect()

    jest.spyOn(channel.pipe, 'close').mockImplementation(() => {
      return Promise.resolve()
    })

    await channel.disconnect()

    expect(channel.connected).toEqual(false)
  })

  it('disconnect without connect', async () => {
    try {
      await channel.disconnect()
      fail('No exception was thrown')
    } catch (e) {
      expect(e).toMatch(/must be connected/i)
    }
  })

  it('disconnect right after connect', async () => {
    channel.connect()
    await channel.disconnect()

    expect(channel.connected).toEqual(false)
  })
})

interface CustomEvents extends Events {
  custom: (count: number, name: string) => void
}

class EventsChannel extends Channel<{}, CustomEvents> {
  static identifier = 'events'

  triggerCustom(str: string) {
    this.emit('custom', parseInt(str), str)
  }
}

describe('events', () => {
  let calls: any[]
  let channel: EventsChannel

  beforeEach(() => {
    calls = []
    channel = new EventsChannel(client)
  })

  it('emits start on connect', async () => {
    channel.on('start', () => calls.push('ok'))

    await channel.connect()

    expect(calls).toEqual(['ok'])
  })

  it('emits stop on disconnect', async () => {
    channel.on('stop', () => calls.push('ko'))

    await channel.connect()
    await channel.disconnect()

    expect(calls).toEqual(['ko'])
  })

  it('emits data on incoming message', async () => {
    channel.on('data', msg => calls.push(msg))

    await channel.connect()

    client.send('test')
    client.send({ name: 'Murakami' })

    expect(calls).toHaveLength(2)
    expect(calls[0]).toEqual('test')
    expect(calls[1]).toMatchObject({ name: 'Murakami' })
  })

  it('emits custom events', () => {
    channel.on('custom', (num: number, str: string) => calls.push([num, str]))

    channel.triggerCustom('13')

    expect(calls).toEqual([[13, '13']])
  })

  it('once', async () => {
    channel.once('data', msg => calls.push(msg))

    await channel.connect()

    client.send('test')
    client.send({ name: 'Murakami' })

    expect(calls).toHaveLength(1)
    expect(calls[0]).toEqual('test')
  })

  it('unbind', async () => {
    let unbind = channel.once('data', msg => calls.push(msg))

    await channel.connect()

    client.send('test')
    unbind()
    client.send({ name: 'Murakami' })

    expect(calls).toHaveLength(1)
    expect(calls[0]).toEqual('test')
  })
})
