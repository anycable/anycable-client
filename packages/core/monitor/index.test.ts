import { jest } from '@jest/globals'
import { createNanoEvents, Emitter, Unsubscribe } from 'nanoevents'

import {
  ReasonError,
  Monitor,
  Monitorable,
  CableEvents,
  StaleConnectionError,
  backoffWithJitter
} from '../index.js'
import { TestLogger } from '../logger/testing'

class TestCable implements Monitorable {
  emitter: Emitter

  constructor() {
    this.emitter = createNanoEvents()
  }

  async connect() {}
  disconnected(err: ReasonError) {} // eslint-disable-line
  close() {}

  on<E extends keyof CableEvents>(
    event: E,
    callback: CableEvents[E]
  ): Unsubscribe {
    return this.emitter.on(event, callback)
  }
}

let cable: TestCable
let monitor: Monitor
let logger: TestLogger

let strategy = (attempts: number) => 2 ** attempts * 1000

const INTERVAL = 3000

beforeEach(() => {
  cable = new TestCable()
  logger = new TestLogger('info')
  monitor = new Monitor({
    pingInterval: INTERVAL,
    reconnectStrategy: strategy,
    logger
  })
  monitor.watch(cable)
  jest.useFakeTimers()
})

afterEach(() => {
  jest.clearAllTimers()
})

it('requries pingInterval', () => {
  expect(() => new Monitor({ pingInterval: 0 })).toThrow(
    /incorrect pinginterval/i
  )
})

it('requries reconnectStrategy', () => {
  expect(() => new Monitor({ pingInterval: 1 })).toThrow(
    /reconnect strategy must be provided/i
  )
})

it('open - stale - disconnect - connect', () => {
  expect(monitor.state).toEqual('pending_connect')

  cable.emitter.emit('connect')

  expect(monitor.state).toEqual('connected')

  let spy = jest.spyOn(cable, 'disconnected').mockImplementation(err => {
    expect(err).toBeInstanceOf(StaleConnectionError)
  })

  // Poll interval lies in [3/4*pingInterval; 5/3*pingInterval],
  // Thus, to make sure we miss two intervals, we need to multiply by 3
  jest.advanceTimersByTime(INTERVAL * 4)

  expect(spy).toHaveBeenCalledTimes(1)

  expect(monitor.state).toEqual('pending_disconnect')

  cable.emitter.emit('disconnect')

  expect(monitor.state).toEqual('pending_reconnect')

  let spy2 = jest.spyOn(cable, 'connect')

  jest.advanceTimersByTime(strategy(0) + 100)

  expect(spy2).toHaveBeenCalledTimes(1)

  expect(monitor.state).toEqual('pending_connect')
})

it('open - stale - with custom maxMissingPings', () => {
  monitor.dispose()
  monitor = new Monitor({
    pingInterval: 2000,
    maxMissingPings: 3,
    reconnectStrategy: strategy
  })
  monitor.watch(cable)

  cable.emitter.emit('connect')
  expect(monitor.state).toEqual('connected')

  let spy = jest.spyOn(cable, 'disconnected').mockImplementation(err => {
    expect(err).toBeInstanceOf(StaleConnectionError)
  })

  // poll \in [1.5; 2.5]
  jest.advanceTimersByTime(5900)

  expect(spy).toHaveBeenCalledTimes(0)
  expect(monitor.state).toEqual('connected')

  jest.advanceTimersByTime(2600)

  expect(spy).toHaveBeenCalledTimes(1)
  expect(monitor.state).toEqual('pending_disconnect')
})

it('open - keepalive - keepalive', () => {
  expect(monitor.state).toEqual('pending_connect')

  cable.emitter.emit('connect')

  expect(monitor.state).toEqual('connected')

  jest.advanceTimersByTime(INTERVAL + 100)

  cable.emitter.emit('keepalive')

  jest.advanceTimersByTime(INTERVAL + 100)

  cable.emitter.emit('keepalive')

  jest.advanceTimersByTime(INTERVAL + 100)

  cable.emitter.emit('keepalive')

  jest.advanceTimersByTime(INTERVAL + 100)

  expect(monitor.state).toEqual('connected')
})

it('open - stale - reconnect failed', () => {
  monitor.dispose()
  monitor = new Monitor({
    pingInterval: 1000,
    maxReconnectAttempts: 2,
    reconnectStrategy: strategy
  })
  monitor.watch(cable)

  cable.emitter.emit('connect')
  expect(monitor.state).toEqual('connected')

  jest.advanceTimersByTime(3700)

  expect(monitor.state).toEqual('pending_disconnect')

  // First attempt failed
  cable.emitter.emit('disconnect')
  expect(monitor.state).toEqual('pending_reconnect')

  // Second attempt failed
  cable.emitter.emit('disconnect')
  expect(monitor.state).toEqual('pending_reconnect')

  let spy = jest.spyOn(cable, 'close')

  cable.emitter.emit('disconnect')
  expect(spy).toHaveBeenCalledTimes(1)

  expect(monitor.state).toEqual('disconnected')
})

it('open - disconnect - reconnect failed - reconnect success', () => {
  monitor.dispose()
  monitor = new Monitor({
    pingInterval: 1000,
    maxReconnectAttempts: 2,
    reconnectStrategy: strategy
  })
  monitor.watch(cable)

  cable.emitter.emit('connect')
  expect(monitor.state).toEqual('connected')

  cable.emitter.emit('disconnect')
  expect(monitor.state).toEqual('pending_reconnect')

  cable.emitter.emit('connect')
  expect(monitor.state).toEqual('connected')

  cable.emitter.emit('disconnect')
  expect(monitor.state).toEqual('pending_reconnect')

  cable.emitter.emit('disconnect')
  expect(monitor.state).toEqual('pending_reconnect')

  cable.emitter.emit('connect')
  expect(monitor.state).toEqual('connected')
})

it('open - disconnect - reconnecting - close', () => {
  cable.emitter.emit('connect')
  expect(monitor.state).toEqual('connected')

  cable.emitter.emit('disconnect')
  expect(monitor.state).toEqual('pending_reconnect')

  let spy = jest.spyOn(cable, 'connect')

  cable.emitter.emit('close')
  expect(monitor.state).toEqual('disconnected')

  // Make sure reconnect is not called
  jest.advanceTimersByTime(strategy(0) * 2)

  expect(spy).toHaveBeenCalledTimes(0)
  expect(monitor.state).toEqual('disconnected')
})

describe('reconnectNow', () => {
  it('when reconnecting', () => {
    cable.emitter.emit('connect')
    expect(monitor.state).toEqual('connected')

    // Should be no-op
    monitor.reconnectNow()

    cable.emitter.emit('disconnect')
    expect(monitor.state).toEqual('pending_reconnect')

    jest.advanceTimersByTime(strategy(0) / 2)

    expect(monitor.state).toEqual('pending_reconnect')

    let spy = jest.spyOn(cable, 'connect')

    monitor.reconnectNow()
    expect(spy).toHaveBeenCalledTimes(1)

    expect(monitor.state).toEqual('pending_connect')
  })

  it('when disconnected', () => {
    cable.emitter.emit('connect')
    // Switch to pending_disconnect state due to stale check
    jest.advanceTimersByTime(INTERVAL * 4)

    expect(monitor.reconnectNow()).toBe(true)
    expect(monitor.state).toEqual('pending_connect')
  })

  it('when connect throws an exception prints to log', async () => {
    cable.emitter.emit('connect')
    // Switch to pending_disconnect state due to stale check
    jest.advanceTimersByTime(INTERVAL * 4)

    jest
      .spyOn(cable, 'connect')
      .mockImplementation(() => Promise.reject(Error('Failure')))

    expect(monitor.reconnectNow()).toBe(true)
    expect(monitor.state).toEqual('pending_connect')

    // Flush connect promise
    await Promise.resolve()

    expect(logger.infos).toHaveLength(1)
  })

  it('when connected', () => {
    cable.emitter.emit('connect')

    expect(monitor.reconnectNow()).toBe(false)
  })
})

describe('backoffWithJitter', () => {
  it('works', () => {
    let backoff = backoffWithJitter(3, { jitterRatio: 0 })

    // x \in [3, 6]
    let delay = backoff(0)

    expect(delay).toBeGreaterThanOrEqual(3.0)
    expect(delay).toBeLessThanOrEqual(6.0)

    // x \in [6, 12]
    delay = backoff(1)

    expect(delay).toBeGreaterThanOrEqual(6.0)
    expect(delay).toBeLessThanOrEqual(12.0)

    backoff = backoffWithJitter(2, { backoffRate: 3 })

    // x \in [3 * 3 * 0.5 = 4.5, 3 * 3 * 3 * 1.5 = 40.5]
    delay = backoff(1)

    expect(delay).toBeGreaterThanOrEqual(4.5)
    expect(delay).toBeLessThanOrEqual(40.5)
  })

  it('recognizes maxInterval', () => {
    let backoff = backoffWithJitter(3, {
      jitterRatio: 0,
      backoffRate: 2,
      maxInterval: 10
    })

    let delay = backoff(3)

    expect(delay).toEqual(10)
  })
})
