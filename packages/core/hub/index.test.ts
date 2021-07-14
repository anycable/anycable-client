import { Hub, Channel, MessageMeta, Message } from '../index'

class TestChannel extends Channel {
  mailbox: [Message, MessageMeta][]

  constructor() {
    super()
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

it('add-transmit-remove-transmit', () => {
  hub.add('a', channel)

  expect(hub.size).toEqual(1)
  expect(hub.channels).toEqual([channel])

  hub.transmit('a', 'hello', {})
  expect(channel.mailbox).toEqual([['hello', {}]])

  let removed = hub.remove('a')
  expect(removed).toStrictEqual(channel)

  expect(hub.size).toEqual(0)
  expect(hub.channels).toEqual([])

  hub.transmit('a', 'hello', {})
  expect(channel.mailbox).toHaveLength(1)
})

it('remove not found', () => {
  expect(hub.remove('a')).toBeUndefined()
})

it('transmit before add', () => {
  hub.transmit('a', 'hello', { id: '1' })
  hub.transmit('a', 'goodbye', { id: '2' })

  hub.add('a', channel)

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

  expect(hub.size).toEqual(1)
  expect(hub.channels).toEqual([channel])
  expect(channel.mailbox).toEqual([['hello', { id: '1' }]])

  hub.close()

  expect(hub.size).toEqual(1)
  expect(hub.channels).toEqual([channel])

  let b = new TestChannel()
  hub.add('b', b)

  expect(b.mailbox).toHaveLength(0)
})
