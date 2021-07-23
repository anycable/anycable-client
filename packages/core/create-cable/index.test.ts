import {
  createCable,
  ActionCableProtocol,
  WebSocketTransport
} from '../index.js'
import { TestTransport } from '../transport/testing'

it('requires url or transport', () => {
  expect(() => createCable()).toThrow(/url or transport must be specified/i)
})

it('with transport', () => {
  let tt = new TestTransport()
  let cable = createCable({ transport: tt })

  expect(cable.transport).toBe(tt)
})

it('defaults', () => {
  let cable = createCable('ws://example')
  expect(cable.protocol).toBeInstanceOf(ActionCableProtocol)
  expect(cable.transport).toBeInstanceOf(WebSocketTransport)

  let ws = cable.transport as WebSocketTransport
  expect(ws.url).toEqual('ws://example')

  expect(cable.logger.level).toEqual('warn')
})

it('unsupported protocol', () => {
  expect(() =>
    createCable('ws://example', { protocol: 'actioncable-v1-msgpack' })
  ).toThrow(/protocol is not supported/i)
})

it('with monitor=false', () => {
  let cable = createCable('ws://example', { monitor: false })

  expect(cable.monitor).toBeUndefined()
})
