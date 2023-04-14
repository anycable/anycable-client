import { jest } from '@jest/globals'

import { ActionCableExtendedProtocol } from '../index.js'
import { TestConsumer } from '../protocol/testing'
import { TestLogger } from '../logger/testing'

let cable: TestConsumer
let protocol: ActionCableExtendedProtocol
let logger: TestLogger

beforeEach(() => {
  logger = new TestLogger()
  cable = new TestConsumer()
  protocol = new ActionCableExtendedProtocol({ logger })
  protocol.attached(cable)
})

it('recoverableClosure', () => {
  expect(protocol.recoverableClosure(Error('any'))).toEqual(false)
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
})

describe('subscriptions', () => {
  let identifier: string

  beforeEach(() => {
    identifier = JSON.stringify({ channel: 'TestChannel' })
  })

  it('subscribes successfully without params', () => {
    let res = expect(protocol.subscribe('TestChannel')).resolves.toEqual(
      identifier
    )

    expect(cable.mailbox).toHaveLength(1)
    expect(cable.mailbox[0]).toMatchObject({ command: 'subscribe', identifier })

    protocol.receive({ type: 'confirm_subscription', identifier })

    return res
  })

  it('performs action', async () => {
    await protocol.perform('test_id', 'do')

    expect(cable.mailbox).toHaveLength(1)
    expect(cable.mailbox[0]).toMatchObject({
      command: 'message',
      identifier: 'test_id',
      data: JSON.stringify({ action: 'do' })
    })
  })
})

describe('receive', () => {
  it('logs error on unknown format', () => {
    protocol.receive('string')

    expect(logger.errors).toHaveLength(1)
    expect(logger.errors[0].message).toEqual('unsupported message format')
  })

  it('ping', () => {
    protocol.receive({ type: 'ping', message: '42' })
    expect(cable.lastPingedAt).toEqual(42)
  })

  it('message', () => {
    expect(
      protocol.receive({ identifier: 'channel', message: 'hello' })
    ).toEqual({
      identifier: 'channel',
      message: 'hello'
    })
  })

  it('warns on unknown message type', () => {
    protocol.receive({ type: 'custom' })

    expect(logger.warnings).toHaveLength(1)
    expect(logger.warnings[0].message).toEqual('unknown message type: custom')
  })
})
