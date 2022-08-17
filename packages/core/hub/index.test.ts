import { CreateSubscriptionOptions } from '.'
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
let options: CreateSubscriptionOptions

let waitSec = () => {
  return new Promise<void>(resolve => {
    setTimeout(resolve, 100)
  })
}

let createOptions = () => {
  return {
    subscribe: waitSec,
    unsubscribe: waitSec
  }
}

beforeEach(() => {
  hub = new Hub()
  channel = new TestChannel()
})

describe('hub', () => {
  it('add-subscribe-transmit-remove-transmit', () => {
    hub.subscribe('a', 'A')

    subscription = hub.subscriptions.create('a', createOptions())
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
    subscription = hub.subscriptions.create('a', createOptions())
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

    subscription = hub.subscriptions.create('a', createOptions())
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

    subscription = hub.subscriptions.create('a', createOptions())
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
    hub.subscriptions.create('b', createOptions()).add(b)
    hub.subscribe('b', 'B')

    expect(b.mailbox).toHaveLength(0)
  })

  it('subscribe / unsubscribe', () => {
    hub.subscribe('a', 'A')

    subscription = hub.subscriptions.create('a', createOptions())
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

    let newSubscription = hub.subscriptions.create('a', createOptions())
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
    expect(hub.subscriptions.create('a', createOptions())).toBeDefined()

    subscription = hub.subscriptions.get('a')!
    expect(subscription.channels).toHaveLength(0)
    expect(subscription.id).toEqual('a')
    expect(subscription.state).toEqual('idle')
    expect(subscription.intent).toEqual('unsubscribed')

    subscription.add(channel)
    expect(subscription.channels).toEqual([channel])
  })

  it('notify keeps track of the channel states', () => {
    subscription = hub.subscriptions.create('a', createOptions())

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
  it('pending unknown intent', () => {
    subscription = hub.subscriptions.create('a', createOptions())
    expect(() => (subscription as any).pending('unknown')).toThrow(
      Error('Unknown subscription intent: unknown')
    )
  })
})

describe('ensureSubscribed / maybeUnsubscribe', () => {
  let subscribedCount = 0
  let unsubscribedCount = 0

  beforeEach(() => {
    subscribedCount = 0
    unsubscribedCount = 0

    options = {
      subscribe: async sub => {
        let lock = await sub.acquire('subscribed')
        subscribedCount++
        await waitSec()
        sub.notify('connected')
        lock.release()
      },
      unsubscribe: async sub => {
        let lock = await sub.acquire('unsubscribed')
        unsubscribedCount++
        await waitSec()
        sub.notify('closed')
        lock.release()
      }
    }

    subscription = hub.subscriptions.create('a', options)
    channel = new TestChannel()
  })

  it('ensureSubscribed + maybeUnsubscribe', async () => {
    subscription.ensureSubscribed()

    subscription.maybeUnsubscribe()
    expect(unsubscribedCount).toBe(0)

    await subscription.pending('subscribed')
    expect(subscribedCount).toBe(1)

    await subscription.pending('unsubscribed')
    expect(unsubscribedCount).toBe(1)
  })

  it('ensureSubscribed when activated', async () => {
    subscription.ensureSubscribed()
    await Promise.resolve()

    subscription.ensureSubscribed()
    await Promise.resolve()

    expect(subscribedCount).toBe(1)
  })

  it('ensureResubscribed after reset', async () => {
    subscription.ensureSubscribed()
    await subscription.pending('subscribed')

    subscription.ensureResubscribed()
    await subscription.pending('subscribed')

    expect(subscribedCount).toBe(2)
  })

  it('ensureSubscribed when closed', () => {
    subscription.close()
    expect(() => {
      subscription.ensureSubscribed()
    }).toThrow(Error('Subscription is disposed'))
  })

  it('ensureResubscribed when closed', () => {
    subscription.close()
    subscription.ensureResubscribed()
    expect(subscribedCount).toBe(0)
  })

  it('maybeUnsubscribe when non activated without channels', async () => {
    subscription.maybeUnsubscribe()
    await Promise.resolve()

    expect(unsubscribedCount).toBe(0)

    subscription.ensureSubscribed()
    await Promise.resolve()

    subscription.maybeUnsubscribe()
    await Promise.resolve()

    subscription.maybeUnsubscribe()
    await waitSec()

    expect(unsubscribedCount).toBe(1)
  })

  it('maybeUnsubscribe when has channels', () => {
    subscription.add(channel)

    subscription.ensureSubscribed()

    subscription.maybeUnsubscribe()

    expect(unsubscribedCount).toBe(0)
  })

  it('maybeUnsubscribe when closed', () => {
    subscription.ensureSubscribed()
    subscription.close()
    subscription.maybeUnsubscribe()

    expect(unsubscribedCount).toBe(0)
  })

  it('ensureSubscribed when locked', async () => {
    let unsubPromise = subscription.acquire('unsubscribed')
    let lockPromise = subscription.acquire('subscribed')

    subscription.ensureSubscribed()

    let unsubLock = await unsubPromise
    unsubLock.release()

    let lock = await lockPromise
    lock.release()
  })
})
