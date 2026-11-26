import { jest } from '@jest/globals'
import { DisconnectedError } from '@anycable/core'

import { TestTransport } from '../../core/transport/testing'
import { createCable } from '../index.js'

afterEach(() => {
  jest.restoreAllMocks()
})

it('binds activity listeners while the cable is alive and unbinds on close', () => {
  let add = jest.spyOn(window, 'addEventListener')
  let remove = jest.spyOn(window, 'removeEventListener')
  let onlineCalls = (spy: typeof add) =>
    spy.mock.calls.filter(([event]) => event === 'online').length

  let transport = new TestTransport('ws:///')
  let cable = createCable({ transport, logLevel: 'error' })

  // Bound on watch, once
  expect(onlineCalls(add)).toBe(1)

  cable.connected()
  expect(onlineCalls(add)).toBe(1)

  // Still bound after disconnect: 'online' triggers a reconnect
  cable.disconnected(new DisconnectedError('network'))
  expect(cable.state).toEqual('disconnected')
  expect(onlineCalls(remove)).toBe(0)

  window.dispatchEvent(new Event('online'))
  expect(cable.state).toEqual('connecting')

  cable.connected()

  // Closed: listeners are removed, 'online' does nothing
  cable.disconnect()
  expect(cable.state).toEqual('closed')
  expect(onlineCalls(remove)).toBe(1)

  window.dispatchEvent(new Event('online'))
  expect(cable.state).toEqual('closed')

  // Connecting again re-binds a single set
  cable.connect()
  cable.connected()
  expect(onlineCalls(add)).toBe(2)

  cable.monitor!.dispose()
  expect(onlineCalls(remove)).toBe(2)
})
