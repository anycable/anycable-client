import { jest } from '@jest/globals'

import {
  Channel,
  ChannelEvents as Events,
  Receiver,
  Message,
  Identifier,
  MessageMeta
} from '../index.js'

class TestReceiver implements Receiver {
  sentCount!: number
  subscriptionsCount!: number
  channel!: Channel

  constructor() {
    this.sentCount = 0
    this.subscriptionsCount = 0
  }

  subscribe(channel: Channel) {
    this.channel = channel
    this.channel.connecting(this)
  }

  subscribed(channel?: Channel) {
    if (channel) {
      this.channel = channel
      this.channel.connecting(this)
    }

    let id = (++this.subscriptionsCount).toString()
    this.channel.connected(id)
  }

  rejected() {
    this.channel.close('Rejected')
  }

  unsubscribe(_sid: Identifier): Promise<void> {
    this.channel.disconnected()
    return Promise.resolve()
  }

  perform(
    _sid: string,
    action: string,
    payload?: object
  ): Promise<Message | void> {
    let data = {}
    if (!payload) {
      data = { action }
    } else {
      data = { action, ...payload }
    }

    return Promise.resolve(data)
  }

  send(msg: Message) {
    this.channel.receive(msg, { id: (++this.sentCount).toString() })
  }
}

class TestChannel extends Channel<{ id: string }> {
  static identifier = 'test'
}

let client: TestReceiver

beforeEach(() => {
  client = new TestReceiver()
})

describe('receiver communicaton', () => {
  let channel: TestChannel

  beforeEach(() => {
    channel = new TestChannel({ id: '2021' })
  })

  it('freezes params', () => {
    expect(() => (channel.params.id = 'bar')).toThrow(
      /Cannot assign to read only property/
    )
  })

  it('returns identifier', () => {
    expect(channel.identifier).toEqual(TestChannel.identifier)
  })

  it('connects', async () => {
    expect(channel.state).toEqual('disconnected')

    client.subscribe(channel)

    expect(channel.state).toEqual('connecting')

    client.subscribed()

    expect(channel.state).toEqual('connected')
    expect(channel.id).toBeDefined()
  })

  it('connect rejection', async () => {
    client.subscribe(channel)
    expect(channel.state).toEqual('connecting')

    client.rejected()
    expect(channel.state).toEqual('disconnected')
    expect(channel.id).toBeUndefined()
  })

  it('double connecting', async () => {
    client.subscribe(channel)
    client.subscribe(channel)

    client.subscribed()

    expect(() => {
      channel.connecting(new TestReceiver())
    }).toThrow('Already connected')

    expect(() => {
      client.subscribed()
    }).toThrow('Already connected')
  })

  it('restored', () => {
    client.subscribed(channel)
    channel.connecting(client)

    expect(channel.state).toEqual('connecting')

    let res = channel.perform('restore')
    channel.restored()

    return expect(res).resolves.toEqual({ action: 'restore' })
  })

  it('restored when connected', () => {
    client.subscribed(channel)
    expect(channel.state).toEqual('connected')

    channel.restored()
    expect(channel.state).toEqual('connected')
  })

  it('restored when disconnected', () => {
    client.subscribed(channel)
    expect(channel.state).toEqual('connected')

    channel.disconnected()
    expect(channel.state).toEqual('disconnected')

    expect(() => {
      channel.restored()
    }).toThrow('Must be connecting')
  })

  it('performs action with payload', async () => {
    client.subscribed(channel)

    jest
      .spyOn(client, 'perform')
      .mockImplementation(
        (id: Identifier, action: string, payload?: Message) => {
          expect(id).toEqual(channel.id)
          expect(action).toEqual('do')
          expect(payload).toMatchObject({ foo: 'bar' })

          return Promise.resolve()
        }
      )

    let res = await channel.perform('do', { foo: 'bar' })
    expect(res).toBeUndefined()
  })

  it('performs action without payload', async () => {
    client.subscribed(channel)

    jest
      .spyOn(client, 'perform')
      .mockImplementation(
        (id: Identifier, action: string, payload?: Message) => {
          expect(id).toEqual(channel.id)
          expect(action).toEqual('do')
          expect(payload).toBeUndefined()

          return Promise.resolve()
        }
      )

    let res = await channel.perform('do')
    expect(res).toBeUndefined()
  })

  it('performs without connect', async () => {
    await expect(channel.perform('do', { foo: 'bar' })).rejects.toThrow(
      /no connection/i
    )
  })

  it('performs right after connect', () => {
    client.subscribe(channel)

    let res = expect(channel.perform('do', { foo: 'bar' })).resolves.toEqual({
      foo: 'bar',
      action: 'do'
    })

    client.subscribed()

    return res
  })

  it('performs before connection failed', () => {
    client.subscribe(channel)

    let res = expect(channel.perform('do', { foo: 'bar' })).rejects.toEqual({
      reason: 'connection lost'
    })

    channel.disconnected('connection lost')

    return res
  })

  it('disconnects', async () => {
    client.subscribed(channel)

    jest.spyOn(client, 'unsubscribe').mockImplementation((id: Identifier) => {
      expect(id).toEqual(channel.id)
      channel.disconnected()
      return Promise.resolve()
    })

    await channel.disconnect()

    expect(channel.state).toEqual('disconnected')
  })

  it('disconnect without connect', async () => {
    await channel.disconnect()
    expect(channel.state).toEqual('disconnected')
  })

  it('disconnect while connecting successfully', () => {
    client.subscribe(channel)
    let res = channel.disconnect().then(() => {
      expect(channel.state).toEqual('disconnected')
    })

    client.subscribed()

    return res
  })

  it('disconnect while connecting and rejected', () => {
    client.subscribe(channel)
    let res = channel.disconnect().catch(() => {
      expect(channel.state).toEqual('disconnected')
    })

    client.rejected()

    return res
  })

  it('disconnect right after connect', () => {
    client.subscribe(channel)

    let res = channel.disconnect().then(() => {
      expect(channel.state).toEqual('disconnected')
    })

    client.subscribed()

    return res
  })

  it('connect-perform-disconnect', () => {
    client.subscribe(channel)

    let p1 = channel.perform('do', { foo: 'bar' }).then(res => {
      expect(res).toMatchObject({ foo: 'bar', action: 'do' })
    })

    let p2 = channel.disconnect()

    let res = Promise.all([p1, p2]).then(() => {
      expect(channel.state).toEqual('disconnected')
    })

    client.subscribed()

    return res
  })
})

type CustomMessage = {
  id: string
  counter: number
}

interface CustomEvents extends Events<CustomMessage> {
  custom: (count: number, name: string) => void
}

class EventsChannel extends Channel<{}, CustomMessage, CustomEvents> {
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
    channel = new EventsChannel()
  })

  it('emits connect', () => {
    channel.on('connect', () => calls.push('ok'))

    client.subscribed(channel)

    expect(calls).toEqual(['ok'])
  })

  it('emits disconnect', () => {
    channel.on('disconnect', () => calls.push('ko'))

    client.subscribed(channel)
    channel.disconnected()

    expect(calls).toEqual(['ko'])
  })

  it('does not emit disconnect when disconnected', () => {
    client.subscribed(channel)
    channel.disconnected()

    channel.on('disconnect', () => {
      throw 'should not emit disconnect'
    })

    channel.disconnected()
  })

  it('emits close', () => {
    channel.on('close', () => calls.push('ko'))

    client.subscribed(channel)
    channel.close('forbidden')

    expect(calls).toEqual(['ko'])
  })

  it('emits restore', () => {
    channel.on('restore', () => calls.push('rrr'))

    client.subscribed(channel)
    channel.connecting(client)
    channel.restored()

    expect(calls).toEqual(['rrr'])
  })

  it('does not emit close when disconnected', () => {
    client.subscribed(channel)
    channel.disconnected()

    channel.on('close', () => {
      throw 'should not emit close'
    })

    channel.close()
  })

  it('emits message', () => {
    channel.on('message', (msg: CustomMessage) => calls.push(msg))

    client.subscribed(channel)

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

  it('once', () => {
    channel.once('message', msg => calls.push(msg))

    client.subscribed(channel)

    client.send('test')
    client.send({ name: 'Murakami' })

    expect(calls).toHaveLength(1)
    expect(calls[0]).toEqual('test')
  })

  it('unbind', () => {
    let unbind = channel.once('message', msg => calls.push(msg))

    client.subscribed(channel)

    client.send('test')
    unbind()
    client.send({ name: 'Murakami' })

    expect(calls).toHaveLength(1)
    expect(calls[0]).toEqual('test')
  })
})
