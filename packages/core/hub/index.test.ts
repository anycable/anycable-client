import { Hub, Channel, MessageMeta, Message } from '../index'

class TestChannel extends Channel {
  static identifier = 'HubChannel'

  mailbox: [Message, MessageMeta][]

  constructor() {
    super()
    this.mailbox = []
  }

  receive(msg: Message, meta: MessageMeta) {
    this.mailbox.push([msg, meta])
  }
}

class AnotherChannel extends Channel<{ x: string }> {
  static identifier = 'AnotherChannel'

  mailbox: [Message, MessageMeta][]

  constructor(params: { x: string }) {
    super(params)
    this.mailbox = []
  }

  receive(msg: Message, meta: MessageMeta) {
    this.mailbox.push([msg, meta])
  }
}

let hub: Hub
let channel: TestChannel

beforeEach(() => {
  hub = new Hub()
  channel = new TestChannel()
})

it('add-subscribe-transmit-remove-transmit', () => {
  hub.subscribe('a', 'z')

  hub.add('a', channel)
  hub.subscribe('a', 'A')

  expect(hub.size).toEqual(1)
  expect(hub.channels).toEqual([channel])

  hub.transmit('A', 'hello', {})
  expect(channel.mailbox).toEqual([['hello', {}]])

  hub.remove('a')

  expect(hub.size).toEqual(0)
  expect(hub.channels).toEqual([])

  hub.transmit('A', 'hello', {})
  expect(channel.mailbox).toHaveLength(1)
})

it('removeChannel', () => {
  hub.add('a', channel)
  expect(hub.size).toEqual(1)
  expect(hub.subscriptions).toHaveLength(1)

  hub.removeChannel(channel)
  expect(hub.size).toEqual(0)
  expect(hub.subscriptions).toHaveLength(0)

  hub.removeChannel(channel)
  expect(hub.size).toEqual(0)
})

it('transmit before add', () => {
  hub.transmit('A', 'hello', { id: '1' })
  hub.transmit('A', 'goodbye', { id: '2' })

  hub.add('a', channel)
  hub.subscribe('a', 'A')

  expect(hub.size).toEqual(1)
  expect(hub.channels).toEqual([channel])
  expect(channel.mailbox).toEqual([
    ['hello', { id: '1' }],
    ['goodbye', { id: '2' }]
  ])

  hub.remove('a')

  let newChannel = new TestChannel()
  hub.add('a', newChannel)
  expect(newChannel.mailbox).toHaveLength(0)
})

it('close', () => {
  hub.transmit('a', 'hello', { id: '1' })
  hub.transmit('b', 'goodbye', { id: '2' })

  hub.add('a', channel)
  hub.subscribe('a', 'a')

  expect(hub.size).toEqual(1)
  expect(hub.channels).toEqual([channel])
  expect(channel.mailbox).toEqual([['hello', { id: '1' }]])

  hub.close()

  expect(hub.size).toEqual(1)
  expect(hub.channels).toEqual([channel])
  expect(hub.activeSubscriptions).toHaveLength(1)
  expect(hub.pendingSubscriptions).toHaveLength(0)

  let b = new TestChannel()
  hub.add('b', b)

  expect(b.mailbox).toHaveLength(0)
  expect(hub.activeSubscriptions).toHaveLength(1)
  expect(hub.pendingSubscriptions).toHaveLength(1)
})

describe('subscriptions', () => {
  it('subscriptionFor', () => {
    hub.add('a', channel)

    let sub = hub.findSubscription('a')

    expect(sub).toBeDefined()

    if (sub) {
      expect(sub.id).toEqual('a')
      expect(sub.remoteId).toBeUndefined()
      expect(sub.channel).toEqual('HubChannel')
      expect(sub.params).toBeUndefined
    }
  })

  it('subscriptions / activeSubscriptions / pendingSubscriptions', () => {
    hub.add('a', channel)
    let anotherChannel = new AnotherChannel({ x: 'y' })

    hub.add('b', anotherChannel)
    hub.subscribe('a', 'A')

    let subs = hub.subscriptions

    expect(subs).toHaveLength(2)
    expect(hub.activeSubscriptions).toStrictEqual([hub.findSubscription('a')])
    expect(hub.pendingSubscriptions).toStrictEqual([hub.findSubscription('b')])

    expect(hub.channels).toHaveLength(2)
    expect(hub.activeChannels).toStrictEqual([channel])
    expect(hub.pendingChannels).toStrictEqual([anotherChannel])
  })

  it('add + add + removeChannel + add + remove', () => {
    hub.add('a', channel)
    hub.subscribe('a', 'A')

    let anotherChannel = new AnotherChannel({ x: 'y' })
    hub.add('b', anotherChannel)

    let bSub = hub.findSubscription('b')
    expect(bSub).toBeDefined()

    if (bSub) {
      expect(bSub.params).toEqual({ x: 'y' })
    }

    let newChannel = new TestChannel()
    hub.add('a', newChannel)

    expect(hub.channels).toHaveLength(3)
    expect(hub.activeChannels).toHaveLength(2)
    expect(hub.subscriptions).toHaveLength(2)

    hub.removeChannel(channel)

    expect(hub.channels).toHaveLength(2)
    expect(hub.activeChannels).toHaveLength(1)
    expect(hub.subscriptions).toHaveLength(2)

    hub.remove('b')

    expect(hub.channels).toHaveLength(1)
    expect(hub.activeChannels).toHaveLength(1)
    expect(hub.subscriptions).toHaveLength(1)
  })
})

describe('unsubscribes', () => {
  it('add / get / remove', async () => {
    expect(hub.unsubscribes.get('a')).toBeUndefined()

    let promise = new Promise<void>(resolve => {
      setTimeout(resolve, 200)
    })

    hub.unsubscribes.add('a', promise)

    let req = hub.unsubscribes.get('a')

    expect(req).toBeDefined()

    await req

    expect(hub.unsubscribes.get('a')).toBeUndefined()

    let noPromise = new Promise<void>((resolve, reject) => {
      setTimeout(reject, 200)
    })

    hub.unsubscribes.add('b', noPromise)

    req = hub.unsubscribes.get('b')

    expect(req).toBeDefined()

    await expect(req).rejects.toEqual(Error('unknown unsubscribe error'))

    expect(hub.unsubscribes.get('b')).toBeUndefined()
  })
})
