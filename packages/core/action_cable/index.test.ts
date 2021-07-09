import { ActionCableProtocol } from '../index.js'
import { TestConsumer } from '../protocol/testing'

let cable: TestConsumer
let protocol: ActionCableProtocol

beforeEach(() => {
  cable = new TestConsumer()
  protocol = new ActionCableProtocol(cable)
})

describe('connection', () => {
  it('welcome', () => {
    protocol.receive({ type: 'welcome' })

    expect(cable.state).toEqual('connected')
    expect(cable.mailbox).toHaveLength(0)
  })

  it('disconnect', () => {
    protocol.receive({ type: 'disconnect' })

    expect(cable.state).toEqual('disconnected')
    expect(cable.mailbox).toHaveLength(0)
  })

  it('disconnect with reason', () => {
    protocol.receive({ type: 'disconnect', reason: 'forbidden' })

    expect(cable.state).toEqual('disconnected')
    expect(cable.mailbox).toEqual([{ type: 'disconnect', reason: 'forbidden' }])
  })

  it('disconnect with explicit reconnect', () => {
    protocol.receive({ type: 'disconnect', reconnect: true })

    expect(cable.state).toEqual('disconnected')
    expect(cable.mailbox).toHaveLength(0)
  })

  it('disconnect with reconnect false', () => {
    protocol.receive({ type: 'disconnect', reconnect: false, reason: 'ko' })

    expect(cable.state).toEqual('closed')
    expect(cable.mailbox).toEqual([{ type: 'close', reason: 'ko' }])
  })

  it('ping', () => {
    protocol.receive({ type: 'ping' })

    expect(cable.lastPingedAt).toEqual(0)
  })

  it('ping with timestamp', () => {
    protocol.receive({ type: 'ping', message: 4321 })

    expect(cable.lastPingedAt).toEqual(4321)
  })
})
