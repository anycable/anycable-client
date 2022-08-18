import { jest } from '@jest/globals'

import {
  Channel,
  ChannelEvents as Events,
  Receiver,
  Message,
  ReasonError,
  DisconnectedError,
  SubscriptionRejectedError,
  Identifier
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
    this.channel.attached(this)
    this.channel.connecting()
  }

  subscribed(channel?: Channel) {
    if (channel) {
      this.channel = channel
      this.channel.attached(this)
      this.channel.connecting()
    }

    let id = (++this.subscriptionsCount).toString()
    this.channel.connected()
  }

  rejected() {
    this.channel.closed(new SubscriptionRejectedError('Rejected'))
  }

  unsubscribe(channel: Channel): void {
    channel.closed(new DisconnectedError('Unsubscribed'))
  }

  perform(
    _identifier: Identifier,
    action?: string,
    payload?: object
  ): Promise<Message | void> {
    let data = {}
    if (!payload) {
      data = { action: action || 'receive' }
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

class AnotherTestChannel extends Channel<{ id: string }> {
  static identifier = 'test_me_too'
}

let client: TestReceiver

beforeEach(() => {
  client = new TestReceiver()
})

describe('receiver communicaton', () => {
  let channel: TestChannel
  let anotherChannel: AnotherTestChannel

  beforeEach(() => {
    channel = new TestChannel({ id: '2021' })
  })

  it('freezes params', () => {
    expect(() => (channel.params.id = 'bar')).toThrow(
      /Cannot assign to read only property/
    )
  })

  it('returns channel identifier', () => {
    expect(channel.channelId).toEqual(TestChannel.identifier)
    expect(channel.identifier).toEqual(`{"channel":"test","id":"2021"}`)
  })

  it('connects', async () => {
    expect(channel.state).toEqual('idle')

    client.subscribe(channel)

    expect(channel.state).toEqual('connecting')

    client.subscribed()

    expect(channel.state).toEqual('connected')
  })

  it('connect rejection', async () => {
    client.subscribe(channel)
    expect(channel.state).toEqual('connecting')

    client.rejected()
    expect(channel.state).toEqual('closed')
  })

  it('double attached', async () => {
    client.subscribe(channel)
    client.subscribe(channel)

    client.subscribed()

    expect(() => {
      channel.attached(new TestReceiver())
    }).toThrow('Already connected to a different receiver')

    client.subscribed()

    expect(channel.state).toEqual('connected')
  })

  it('restored', () => {
    client.subscribed(channel)
    channel.connecting()

    expect(channel.state).toEqual('connecting')

    let res = channel.perform('restore')
    channel.restored()

    return expect(res).resolves.toEqual({ action: 'restore' })
  })

  it('restored when connected', () => {
    client.subscribed(channel)
    expect(channel.state).toEqual('connected')

    expect(() => {
      channel.restored()
    }).toThrow(Error('Already connected'))
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

  it('pending subscribed when closed', () => {
    channel.closed()
    return expect(channel.ensureSubscribed()).rejects.toEqual(
      Error('Channel is unsubscribed')
    )
  })

  it('performs action with payload', async () => {
    client.subscribed(channel)

    jest
      .spyOn(client, 'perform')
      .mockImplementation(
        (_id: Identifier, action?: string, payload?: Message) => {
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
        (identifier: Identifier, action?: string, payload?: Message) => {
          expect(identifier).toEqual(channel.identifier)
          expect(action).toEqual('do')
          expect(payload).toBeUndefined()

          return Promise.resolve()
        }
      )

    let res = await channel.perform('do')
    expect(res).toBeUndefined()
  })

  it('send', async () => {
    client.subscribed(channel)

    jest
      .spyOn(client, 'perform')
      .mockImplementation(
        (identifier: Identifier, action?: string, payload?: Message) => {
          expect(identifier).toEqual(channel.identifier)
          expect(action).toBeUndefined
          expect(payload).toMatchObject({ test: 'send' })

          return Promise.resolve()
        }
      )

    let res = await channel.send({ test: 'send' })
    expect(res).toBeUndefined()
  })

  it('performs without connect', async () => {
    await expect(channel.perform('do', { foo: 'bar' })).rejects.toThrow(
      Error('Channel is not subscribed')
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

  it('performs many times while connecting', () => {
    client.subscribe(channel)

    let p1 = expect(channel.perform('do', { foo: 'bar' })).resolves.toEqual({
      foo: 'bar',
      action: 'do'
    })

    let p2 = expect(channel.perform('das', { foo: 'baz' })).resolves.toEqual({
      foo: 'baz',
      action: 'das'
    })

    client.subscribed()

    return Promise.all([p1, p2])
  })

  it('performs when disconnected', () => {
    client.subscribe(channel)

    let res = expect(channel.perform('do', { foo: 'bar' })).resolves.toEqual({
      foo: 'bar',
      action: 'do'
    })

    channel.disconnected(new DisconnectedError('connection lost'))

    client.subscribe(channel)
    client.subscribed()

    return res
  })

  it('disconnects', () => {
    client.subscribed(channel)

    jest.spyOn(client, 'unsubscribe').mockImplementation((ch: Channel) => {
      expect(ch).toEqual(channel)
      channel.closed()
    })

    channel.disconnect()

    expect(channel.state).toEqual('closed')
  })

  it('disconnect without connect', () => {
    channel.disconnect()
    expect(channel.state).toEqual('idle')
  })

  it('disconnect while connecting successfully', () => {
    client.subscribe(channel)
    channel.disconnect()

    expect(channel.state).toEqual('closed')

    channel.disconnect()

    client.subscribed()

    expect(channel.state).toEqual('closed')
  })

  it('disconnect while connecting and rejected', () => {
    client.subscribe(channel)
    channel.disconnect()
    client.rejected()

    expect(channel.state).toEqual('closed')
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
    channel.on('connect', event => {
      expect(event.reconnect).toBe(false)
      expect(event.restored).toBe(false)
      calls.push('ok')
    })

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
    channel.closed(new ReasonError('forbidden'))

    expect(calls).toEqual(['ko'])
  })

  it('emits connect when restored', () => {
    client.subscribed(channel)

    channel.on('connect', event => {
      expect(event.reconnect).toBe(true)
      expect(event.restored).toBe(true)
      calls.push('rrr')
    })

    channel.connecting()
    channel.restored()

    expect(calls).toEqual(['rrr'])
  })

  it('emits close when disconnected', () => {
    client.subscribed(channel)
    channel.disconnected()

    let res = new Promise(resolve => channel.on('close', resolve))

    channel.closed()

    return res
  })

  it('does not emit close when closed', () => {
    client.subscribed(channel)
    channel.closed()

    channel.on('close', () => {
      throw 'Should not emit close'
    })

    channel.closed()
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
