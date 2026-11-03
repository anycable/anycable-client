import { jest } from '@jest/globals'

import { WebSocketTransport } from '../index.js'
import { createCable } from '../create-cable/index.js'

class ConnectingSocket extends EventTarget {
  static CONNECTING = 0
  readyState = ConnectingSocket.CONNECTING
  onclose: ((event: Event) => void) | undefined
  onopen: ((event: Event) => void) | undefined
  onmessage: ((event: MessageEvent) => void) | undefined
  onerror: ((event: Event) => void) | undefined
  close = jest.fn(() => {
    this.readyState = 3
  })

  constructor(_url: string) {
    super()
    socket = this
  }

  openSocket() {
    this.readyState = 1
    this.dispatchEvent(new Event('open'))
    this.onopen?.(new Event('open'))
  }

  failHandshake() {
    this.readyState = 3
    this.dispatchEvent(new Event('error'))
    this.dispatchEvent(new Event('close'))
  }
}

let socket: ConnectingSocket

it('defers closing a connecting socket after cable disconnect', async () => {
  let transport = new WebSocketTransport('ws://', {
    websocketImplementation: ConnectingSocket
  })
  let cable = createCable({ transport, monitor: false })
  let close = jest.fn()
  transport.on('close', close)

  let connecting = cable.connect()
  expect(cable.state).toBe('connecting')
  cable.disconnect()
  transport.close()

  expect(socket.close).not.toHaveBeenCalled()
  expect(close).toHaveBeenCalledTimes(1)
  expect(transport.ws).toBeUndefined()
  await expect(connecting).rejects.toBeUndefined()

  socket.openSocket()
  expect(socket.close).toHaveBeenCalledTimes(1)
  expect(close).toHaveBeenCalledTimes(1)
})

it('does not close a socket whose handshake fails after teardown', async () => {
  let transport = new WebSocketTransport('ws://', {
    websocketImplementation: ConnectingSocket
  })
  let close = jest.fn()
  transport.on('close', close)
  let connecting = transport.open()

  transport.close()
  await expect(connecting).rejects.toThrow('WS connection closed')
  expect(() => {
    socket.failHandshake()
  }).not.toThrow()
  expect(socket.close).not.toHaveBeenCalled()
  expect(close).toHaveBeenCalledTimes(1)
})
