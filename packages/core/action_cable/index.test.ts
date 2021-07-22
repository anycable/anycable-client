import { jest } from '@jest/globals'

import { ActionCableProtocol, NoopLogger } from '../index.js'
import { TestConsumer } from '../protocol/testing'
import { TestLogger } from '../logger/testing'

let cable: TestConsumer
let protocol: ActionCableProtocol
let logger: TestLogger

beforeEach(() => {
  logger = new TestLogger()
  cable = new TestConsumer()
  protocol = new ActionCableProtocol({ logger })
  protocol.attached(cable)
})

it('uses NoopLogger by default', () => {
  let proto = new ActionCableProtocol()
  expect(proto.logger).toBeInstanceOf(NoopLogger)
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

  it('subscribes successfully with params', () => {
    identifier = JSON.stringify({
      channel: 'TestChannel',
      id: 2021,
      foo: 'bar'
    })

    let res = expect(
      protocol.subscribe('TestChannel', { id: 2021, foo: 'bar' })
    ).resolves.toEqual(identifier)

    expect(cable.mailbox).toHaveLength(1)
    expect(cable.mailbox[0]).toMatchObject({ command: 'subscribe', identifier })

    protocol.receive({ type: 'confirm_subscription', identifier })

    return res
  })

  it('subscribes with rejection', () => {
    let res = expect(protocol.subscribe('TestChannel')).rejects.toHaveProperty(
      'name',
      'SubscriptionRejectedError'
    )

    expect(cable.mailbox).toHaveLength(1)
    expect(cable.mailbox[0]).toMatchObject({ command: 'subscribe', identifier })

    protocol.receive({ type: 'reject_subscription', identifier })

    return res
  })

  it('unsubscribes successfully', async () => {
    await protocol.unsubscribe('test_id')

    expect(cable.mailbox).toHaveLength(1)
    expect(cable.mailbox[0]).toMatchObject({
      command: 'unsubscribe',
      identifier: 'test_id'
    })
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

  it('performs action with arguments', async () => {
    await protocol.perform('test_id', 'do', { foo: 'bar' })

    expect(cable.mailbox).toHaveLength(1)
    expect(cable.mailbox[0]).toMatchObject({
      command: 'message',
      identifier: 'test_id',
      data: JSON.stringify({ foo: 'bar', action: 'do' })
    })
  })

  it('reset rejects all pending subscriptions', () => {
    let p1 = protocol.subscribe('TestChannel')
    let p2 = protocol.subscribe('TestChannel', { id: 2021 })

    let res = Promise.allSettled([p1, p2]).then(results => {
      expect(results[0].status).toEqual('rejected')
      expect(results[1].status).toEqual('rejected')
    })

    protocol.reset(Error('Connection lost'))

    return res
  })
})

describe('receive', () => {
  it('logs error on unknown format', () => {
    protocol.receive('string')

    expect(logger.errors).toHaveLength(1)
    expect(logger.errors[0].message).toEqual('unsupported message format')
  })
  it('pings', () => {
    protocol.receive({ type: 'ping', message: '42' })
    expect(cable.lastPingedAt).toEqual(42)
  })

  it('confirm unknown subscription', () => {
    protocol.receive({ type: 'confirm_subscription', identifier: 'unknown' })

    expect(logger.errors).toHaveLength(1)
    expect(logger.errors[0].message).toEqual('subscription not found')
  })

  it('reject unknown subscription', () => {
    protocol.receive({ type: 'reject_subscription', identifier: 'unknown' })

    expect(logger.errors).toHaveLength(1)
    expect(logger.errors[0].message).toEqual('subscription not found')
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
