import { ActionCableProtocol, WebSocketTransport } from '@anycable/core'

import { createCable } from './index.js'
import { Monitor } from './monitor/index.js'
import { Logger } from './logger/index.js'

it('defaults', () => {
  let cable = createCable()
  expect(cable.protocol).toBeInstanceOf(ActionCableProtocol)
  expect(cable.transport).toBeInstanceOf(WebSocketTransport)

  let ws = cable.transport as WebSocketTransport
  expect(ws.url).toEqual(`ws://anycable.test/cable`)

  expect(cable.logger).toBeInstanceOf(Logger)
  expect(cable.logger.level).toEqual('warn')

  expect(cable.monitor).toBeInstanceOf(Monitor)
})

it('with monitor=false', () => {
  let cable = createCable({ monitor: false })

  expect(cable.monitor).toBeUndefined()
})

it('uses url from cable-url meta', () => {
  document.head.innerHTML = `
    <meta name="cable-url" content="ws://anycable.go:2313/cable">
  `
  let cable = createCable()
  let ws = cable.transport as WebSocketTransport
  expect(ws.url).toEqual(`ws://anycable.go:2313/cable`)
})

it('uses url from action-cable-url meta', () => {
  document.head.innerHTML = `
    <meta name="action-cable-url" content="ws://anycable.go:2313/cable">
  `
  let cable = createCable()
  let ws = cable.transport as WebSocketTransport
  expect(ws.url).toEqual(`ws://anycable.go:2313/cable`)
})
