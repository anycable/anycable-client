import { jest } from '@jest/globals'
import {
  ActionCableExtendedProtocol,
  ActionCableProtocol,
  TokenRefresher,
  Transport,
  WebSocketTransport
} from '@anycable/core'

import { createCable, fetchTokenFromHTML } from './index.js'
import { Monitor } from './monitor/index.js'
import { Logger } from './logger/index.js'

describe('createCable', () => {
  it('defaults', () => {
    let cable = createCable()
    expect(cable.protocol).toBeInstanceOf(ActionCableProtocol)
    expect(cable.transport).toBeInstanceOf(WebSocketTransport)

    let ws = cable.transport
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
    let ws = cable.transport
    expect(ws.url).toEqual(`ws://anycable.go:2313/cable`)
  })

  it('uses url from action-cable-url meta', () => {
    document.head.innerHTML = `
      <meta name="action-cable-url" content="ws://anycable.go:2313/cable">
    `
    let cable = createCable()
    let ws = cable.transport
    expect(ws.url).toEqual(`ws://anycable.go:2313/cable`)
  })

  it('adds current host if url does not contain one', () => {
    document.head.innerHTML = `
      <meta name="action-cable-url" content="/cablitto">
    `
    let cable = createCable()
    let ws = cable.transport
    expect(ws.url).toEqual(`ws://anycable.test/cablitto`)
  })

  it('uses history timestamp from action-cable-history-timestamp meta', () => {
    document.head.innerHTML = `
      <meta name="action-cable-history-timestamp" content="20230416">
    `
    let cable = createCable({ protocol: 'actioncable-v1-ext-json' })
    let protocol = cable.protocol as any
    expect(protocol.restoreSince).toEqual(20230416)
  })
})

describe('fetchTokenFromHTML', () => {
  let transport: Transport
  let refresher: TokenRefresher

  let fetch = (global.fetch = jest.fn(() =>
    Promise.reject(Error('Not implemented'))
  ) as jest.Mock<any>)

  beforeEach(() => {
    fetch.mockClear()
    transport = createCable().transport
    refresher = fetchTokenFromHTML()
  })

  it('with defaults', async () => {
    let html = `
    <html>
      <head>
        <meta name="action-cable-url" content="ws://anycable.go:2313/cable?token=secret">
      </head>
      <body>
      </body>
    </html>
    `
    let mock = fetch.mockImplementationOnce(() =>
      Promise.resolve({ text: () => Promise.resolve(html), ok: true })
    )

    await refresher(transport)

    expect(mock).toHaveBeenCalledWith(
      'http://anycable.test/demo',
      expect.objectContaining({
        credentials: 'same-origin',
        headers: expect.objectContaining({
          'X-ANYCABLE-OPERATION': 'token-refresh'
        })
      })
    )
    expect(transport.url).toEqual('ws://anycable.go:2313/cable?token=secret')
  })

  it('with custom url and no meta data in response', () => {
    let html = `
    <html>
      <head>
      </head>
      <body>
      </body>
    </html>
    `
    let mock = fetch.mockImplementationOnce(() =>
      Promise.resolve({ text: () => Promise.resolve(html), ok: true })
    )

    refresher = fetchTokenFromHTML({ url: 'http://anycable.io/refresh' })

    expect(refresher(transport)).rejects.toBeInstanceOf(Error)

    expect(mock).toHaveBeenCalledWith(
      'http://anycable.io/refresh',
      expect.anything()
    )
  })

  it('when http failed', () => {
    fetch.mockImplementationOnce(() => Promise.reject(Error('Server is down')))

    expect(refresher(transport)).rejects.toEqual(Error('Server is down'))
  })
})
