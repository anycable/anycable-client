import {
  Hub,
  Channel,
  MessageMeta,
  Message,
  Subscription,
  DisconnectedError
} from '../index'

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
let subscription: Subscription

let waitSec = () => {
  return new Promise<void>(resolve => {
    setTimeout(resolve, 100)
  })
}

beforeEach(() => {
  hub = new Hub()
  channel = new TestChannel()
})

describe('hub', () => {
  it('add-subscribe-transmit-remove-transmit', () => {
    hub.subscribe('a', 'A')

    subscription = hub.subscriptions.fetch('a')
    expect(subscription.remoteId).toBe('A')

    subscription.add(channel)

    expect(hub.size).toEqual(1)
    expect(hub.channels).toEqual([channel])

    hub.transmit('A', 'hello', {})
    expect(channel.mailbox).toEqual([['hello', {}]])

    hub.subscriptions.remove('a')

    expect(hub.size).toEqual(0)
    expect(hub.channels).toEqual([])

    hub.transmit('A', 'hello', {})
    expect(channel.mailbox).toHaveLength(1)
  })

  it('remove channel + dispose', () => {
    subscription = hub.subscriptions.fetch('a')
    subscription.add(channel)

    expect(hub.size).toEqual(1)
    expect(hub.subscriptions.all()).toHaveLength(1)
    expect(hub.subscriptions.all()[0].channels).toHaveLength(1)

    subscription.remove(channel)
    expect(hub.size).toEqual(0)
    expect(hub.subscriptions.all()).toHaveLength(1)
    expect(hub.subscriptions.all()[0].channels).toHaveLength(0)

    subscription.remove(channel)
    expect(hub.size).toEqual(0)
    expect(hub.subscriptions.all()).toHaveLength(1)

    hub.subscriptions.remove('a')
    expect(hub.size).toEqual(0)
    expect(hub.subscriptions.all()).toHaveLength(0)
  })

  it('transmit before add', () => {
    hub.transmit('A', 'hello', { id: '1' })
    hub.transmit('A', 'goodbye', { id: '2' })

    subscription = hub.subscriptions.fetch('a')
    subscription.add(channel)

    hub.subscribe('a', 'A')

    expect(hub.size).toEqual(1)
    expect(hub.channels).toEqual([channel])
    expect(channel.mailbox).toEqual([
      ['hello', { id: '1' }],
      ['goodbye', { id: '2' }]
    ])

    hub.subscriptions.remove('a')

    let newChannel = new TestChannel()
    subscription.add(newChannel)
    expect(newChannel.mailbox).toHaveLength(0)
  })

  it('close', () => {
    hub.transmit('A', 'hello', { id: '1' })
    hub.transmit('B', 'goodbye', { id: '2' })

    subscription = hub.subscriptions.fetch('a')
    subscription.add(channel)
    subscription.add(channel)

    hub.subscribe('a', 'A')

    expect(hub.size).toEqual(1)
    expect(hub.channels).toEqual([channel])
    expect(channel.mailbox).toEqual([['hello', { id: '1' }]])

    hub.close()

    expect(hub.size).toEqual(1)
    expect(hub.channels).toEqual([channel])

    let b = new TestChannel()
    hub.subscriptions.fetch('b').add(b)
    hub.subscribe('b', 'B')

    expect(b.mailbox).toHaveLength(0)
  })

  it('subscribe / unsubscribe', () => {
    hub.subscribe('a', 'A')

    subscription = hub.subscriptions.fetch('a')
    expect(subscription.remoteId).toBe('A')

    subscription.add(channel)

    hub.transmit('A', 'hello', { id: '1' })
    expect(channel.mailbox).toEqual([['hello', { id: '1' }]])

    // Reset mailbox
    channel.mailbox.length = 0

    hub.unsubscribe('a')
    // make sure double-unsubscribe does not throw
    hub.unsubscribe('a')

    expect(hub.size).toBe(0)

    let newSubscription = hub.subscriptions.fetch('a')
    expect(newSubscription).not.toStrictEqual(subscription)
    expect(newSubscription.remoteId).toBeUndefined()

    newSubscription.add(channel)

    hub.transmit('A', 'goodbye', {})
    expect(channel.mailbox).toEqual([])

    hub.subscribe('a', 'A')
    expect(channel.mailbox).toEqual([['goodbye', {}]])
  })
})

describe('subscriptions', () => {
  it('fetch / get', () => {
    expect(hub.subscriptions.get('a')).toBeUndefined()
    expect(hub.subscriptions.fetch('a')).toBeDefined()

    subscription = hub.subscriptions.get('a')!
    expect(subscription.channels).toHaveLength(0)
    expect(subscription.id).toEqual('a')
    expect(subscription.state).toEqual('idle')
    expect(subscription.intent).toEqual('unsubscribed')

    subscription.add(channel)
    expect(subscription.channels).toEqual([channel])
  })

  it('notify keeps track of the channel states', () => {
    subscription = hub.subscriptions.fetch('a')

    expect(subscription.state).toEqual('idle')

    subscription.notify('connecting')
    expect(subscription.state).toEqual('connecting')

    subscription.add(channel)
    // Do not change state when adding
    expect(channel.state).toEqual('idle')

    subscription.notify('connected')
    expect(channel.state).toEqual('connected')

    let event!: DisconnectedError
    channel.on('disconnect', ev => {
      event = ev
    })

    subscription.notify('disconnected', new DisconnectedError('test'))
    expect(event).toEqual(new DisconnectedError('test'))
  })
})

describe('pending requests', () => {
  it('pending write + hasPending + pending read', async () => {
    subscription = hub.subscriptions.fetch('a')

    subscription.pending('subscribed', waitSec())

    expect(subscription.hasPending('subscribed')).toBe(true)

    await subscription.pending('subscribed')

    expect(subscription.hasPending('subscribed')).toBe(false)
  })

  it('pending read when empty', async () => {
    subscription = hub.subscriptions.fetch('a')
    expect(subscription.hasPending('subscribed')).toBe(false)
    await subscription.pending('subscribed')
    expect(subscription.hasPending('subscribed')).toBe(false)
  })

  it('pending double write', async () => {
    subscription = hub.subscriptions.fetch('a')
    subscription.pending('subscribed', waitSec())
    expect(() => {
      subscription.pending('subscribed', waitSec())
    }).toThrow(Error('Already pending subscribed'))
  })

  it('pending different intents', async () => {
    subscription = hub.subscriptions.fetch('a')
    subscription.pending('subscribed', waitSec())
    subscription.pending('unsubscribed', waitSec())

    await subscription.pending('subscribed')
    await subscription.pending('unsubscribed')

    expect(subscription.hasPending('subscribed')).toBe(false)
    expect(subscription.hasPending('unsubscribed')).toBe(false)
  })

  it('pending rejected', async () => {
    subscription = hub.subscriptions.fetch('a')
    subscription.pending('subscribed', Promise.reject(Error('test')))

    await subscription.pending('subscribed')

    expect(subscription.hasPending('subscribed')).toBe(false)
  })
})
