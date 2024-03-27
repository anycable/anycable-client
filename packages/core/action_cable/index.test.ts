import { jest } from '@jest/globals'

import {
  ActionCableProtocol,
  NoopLogger,
  SubscriptionTimeoutError
} from '../index.js'
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

  it('welcome with sid', () => {
    protocol.receive({ type: 'welcome', sid: '20231013' })

    expect(cable.state).toEqual('connected')
    expect(cable.mailbox).toHaveLength(0)
    expect(cable.sessionId).toEqual('20231013')
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
      foo: 'bar',
      id: 2021
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

  it('subscribe cofirmed after retrying', async () => {
    identifier = JSON.stringify({
      channel: 'TestChannel',
      foo: 'bar',
      id: 2021
    })

    protocol.subscribeRetryInterval = 500

    let res = protocol.subscribe('TestChannel', { id: 2021, foo: 'bar' })

    expect(cable.mailbox).toHaveLength(1)

    // Cooldown
    await new Promise(resolve =>
      setTimeout(resolve, protocol.subscribeCooldownInterval * 2)
    )

    expect(cable.mailbox).toHaveLength(2)
    expect(cable.mailbox[0]).toMatchObject({ command: 'subscribe', identifier })
    expect(cable.mailbox[1]).toMatchObject({ command: 'subscribe', identifier })

    protocol.receive({ type: 'confirm_subscription', identifier })

    await res
  })

  it('subscribe cofirmed before retrying and a new subscribe is made', async () => {
    identifier = JSON.stringify({
      channel: 'TestChannel',
      foo: 'bar',
      id: 2021
    })

    protocol.subscribeRetryInterval = 500

    let res = protocol.subscribe('TestChannel', { id: 2021, foo: 'bar' })

    expect(cable.mailbox).toHaveLength(1)

    protocol.receive({ type: 'confirm_subscription', identifier })

    await new Promise(resolve => setTimeout(resolve, 300))

    await res

    let second = protocol.subscribe('TestChannel', { id: 2021, foo: 'bar' })

    expect(cable.mailbox).toHaveLength(2)

    await new Promise(resolve => setTimeout(resolve, 300))

    protocol.receive({ type: 'confirm_subscription', identifier })

    await second

    // No new commands sent
    expect(cable.mailbox).toHaveLength(2)
  })

  it('subscribe cofirmed before expiring and a new subscribe is made', async () => {
    identifier = JSON.stringify({
      channel: 'TestChannel',
      foo: 'bar',
      id: 2021
    })

    protocol.subscribeRetryInterval = 500

    let res = protocol.subscribe('TestChannel', { id: 2021, foo: 'bar' })

    expect(cable.mailbox).toHaveLength(1)

    await new Promise(resolve => setTimeout(resolve, 600))

    expect(cable.mailbox).toHaveLength(2)

    protocol.receive({ type: 'confirm_subscription', identifier })

    await res

    await new Promise(resolve => setTimeout(resolve, 300))

    let second = protocol.subscribe('TestChannel', { id: 2021, foo: 'bar' })

    await new Promise(resolve => setTimeout(resolve, 300))

    protocol.receive({ type: 'confirm_subscription', identifier })

    await second
  })

  it('subscribe rejected if no ack received after retrying', async () => {
    identifier = JSON.stringify({
      channel: 'TestChannel',
      foo: 'bar',
      id: 2021
    })

    protocol.subscribeRetryInterval = 500

    let res = expect(
      protocol.subscribe('TestChannel', { id: 2021, foo: 'bar' })
    ).rejects.toEqual(
      new SubscriptionTimeoutError(
        `Haven't received subscription ack in 1000ms for ${identifier}`
      )
    )

    expect(cable.mailbox).toHaveLength(1)

    await res
    expect(cable.mailbox).toHaveLength(2)

    expect(cable.mailbox[0]).toMatchObject({ command: 'subscribe', identifier })
    expect(cable.mailbox[1]).toMatchObject({ command: 'subscribe', identifier })
  })

  it('unsubscribe when subscribe confirmed after expired', async () => {
    identifier = JSON.stringify({
      channel: 'TestChannel',
      foo: 'bar',
      id: 2021
    })

    protocol.subscribeRetryInterval = 500

    await expect(
      protocol.subscribe('TestChannel', { id: 2021, foo: 'bar' })
    ).rejects.toEqual(
      new SubscriptionTimeoutError(
        `Haven't received subscription ack in 1000ms for ${identifier}`
      )
    )

    cable.mailbox.length = 0

    protocol.receive({ type: 'confirm_subscription', identifier })

    expect(cable.mailbox).toHaveLength(1)
    expect(cable.mailbox[0]).toMatchObject({
      command: 'unsubscribe',
      identifier
    })

    let newSubscribe = protocol.subscribe('TestChannel', {
      id: 2021,
      foo: 'bar'
    })

    // Cooldown
    await new Promise(resolve =>
      setTimeout(resolve, protocol.subscribeCooldownInterval * 2)
    )

    protocol.receive({ type: 'confirm_subscription', identifier })

    await newSubscribe
  })

  it('double subscribing warns', async () => {
    let res = expect(protocol.subscribe('TestChannel')).resolves.toEqual(
      identifier
    )

    expect(cable.mailbox).toHaveLength(1)
    expect(cable.mailbox[0]).toMatchObject({ command: 'subscribe', identifier })

    expect(logger.warnings).toHaveLength(0)
    let second = protocol.subscribe('TestChannel').catch(() => {})
    expect(logger.warnings).toHaveLength(1)

    protocol.receive({ type: 'confirm_subscription', identifier })

    await Promise.all([res, second])
  })

  it('unsubscribes successfully', async () => {
    await protocol.unsubscribe('test_id')

    expect(cable.mailbox).toHaveLength(1)
    expect(cable.mailbox[0]).toMatchObject({
      command: 'unsubscribe',
      identifier: 'test_id'
    })
  })

  it('unsubscribe followed by subscribe', async () => {
    identifier = JSON.stringify({
      channel: 'FastChannel'
    })

    await protocol.unsubscribe(identifier)
    let subscribePromise = expect(
      protocol.subscribe('FastChannel')
    ).resolves.toEqual(identifier)

    expect(cable.mailbox).toHaveLength(1)
    expect(cable.mailbox[0]).toMatchObject({
      command: 'unsubscribe',
      identifier
    })

    await new Promise(resolve =>
      setTimeout(resolve, protocol.subscribeCooldownInterval * 2)
    )

    expect(cable.mailbox).toHaveLength(2)
    expect(cable.mailbox[1]).toMatchObject({ command: 'subscribe', identifier })

    protocol.receive({ type: 'confirm_subscription', identifier })

    await subscribePromise
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

  it('performs whisper with objects', async () => {
    await protocol.perform('test_id', '$whisper', {
      event: 'typing',
      name: 'vova'
    })

    expect(cable.mailbox).toHaveLength(1)
    expect(cable.mailbox[0]).toMatchObject({
      command: 'whisper',
      identifier: 'test_id',
      data: {
        event: 'typing',
        name: 'vova'
      }
    })
  })

  it('reset rejects all pending subscriptions', () => {
    let p1 = protocol.subscribe('TestChannel')
    let p2 = protocol.subscribe('TestChannel', { id: 2021 })

    /* eslint-disable n/no-unsupported-features/es-builtins */
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
    expect(logger.errors[0].message).toEqual(
      'subscription not found, unsubscribing'
    )
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
