import { WebSocketServer, WebSocket } from 'ws'
import { createCable } from '@anycable/core'

import { start, DEFAULT_SOCKET_HEADER } from './index.js'

let port: number
let wss: WebSocketServer
let receivedByServer: string[]
let conns: WebSocket[]
let connsPerStream: Record<string, WebSocket[] | undefined>

beforeEach(async () => {
  port = (8080 + Math.random() * 500) | 0
  wss = new WebSocketServer({ port })
  receivedByServer = []
  conns = []
  connsPerStream = {}

  wss.on('connection', ws => {
    conns.push(ws)

    ws.on('close', () => {
      conns.splice(conns.indexOf(ws), 1)
    })

    ws.on('message', data => {
      let msg = JSON.parse(data.toString())
      receivedByServer.push(msg)

      let { command, identifier } = msg

      let id = identifier ? JSON.parse(identifier) : {}

      if (command === 'subscribe') {
        let signed_stream_name: string
        let channel: string
        channel = id.channel
        signed_stream_name = id.signed_stream_name

        if (channel !== 'TurboChannel' || !signed_stream_name) {
          ws.send(JSON.stringify({ identifier, type: 'reject_subscription' }))
          return
        }

        if (!connsPerStream[signed_stream_name]) {
          connsPerStream[signed_stream_name] = []
        }

        connsPerStream[signed_stream_name]!.push(ws)
        ws.send(JSON.stringify({ identifier, type: 'confirm_subscription' }))
      }
    })

    ws.send(JSON.stringify({ type: 'welcome' }))
  })

  await new Promise<void>(resolve => {
    wss.on('listening', resolve)
  })
})

const broadcast = (stream: string, message: string) => {
  let identifier = JSON.stringify({
    channel: 'TurboChannel',
    signed_stream_name: stream
  })
  let payload = JSON.stringify({ identifier, message })
  for (let conn of connsPerStream[stream]!) {
    conn.send(payload)
  }
}

afterEach(() => {
  wss.close()
  for (let ws of wss.clients) {
    ws.terminate()
  }
})

describe('<turbo-stream-source>', () => {
  it('basic scenario', async () => {
    document.body.innerHTML = `
      <turbo-cable-stream-source signed-stream-name='test' channel='TurboChannel'></turbo-cable-stream-source>
      <div id="content"></div>
    `

    let cable = createCable(`ws://localhost:${port}`)
    start(cable)

    let channel = cable.hub.channels[0]
    expect(channel).not.toBeNull()

    await new Promise((resolve, reject) => {
      setTimeout(reject, 2000)
      channel.on('connect', resolve)
    })

    let msgPromise = new Promise((resolve, reject) => {
      setTimeout(reject, 2000)
      channel.on('message', resolve)
    })

    broadcast(
      'test',
      `
      <turbo-stream action="append" target="content">
        <template>
          <div id="message_1">
            The message 1.
          </div>
        </template>
      </turbo-stream>
      `
    )

    await msgPromise

    await new Promise(resolve => setTimeout(resolve, 300))

    expect(
      document.body.querySelector('#content #message_1')?.textContent?.trim()
    ).toEqual('The message 1.')
  })

  it('connected attribute', async () => {
    document.body.innerHTML = `
      <turbo-cable-stream-source-connected signed-stream-name='test-connected' channel='TurboChannel'></turbo-cable-stream-source-connected>
    `

    let cable = createCable(`ws://localhost:${port}`)
    start(cable, { tagName: 'turbo-cable-stream-source-connected' })

    let channel = cable.hub.channels[0]
    expect(channel).not.toBeUndefined()

    await new Promise((resolve, reject) => {
      setTimeout(reject, 2000)
      channel.on('connect', resolve)
    })

    await new Promise(resolve => setTimeout(resolve, 300))

    expect(
      document.body
        .querySelector('turbo-cable-stream-source-connected')
        ?.getAttribute('connected')
    ).toEqual('')

    cable.disconnect()

    expect(
      document.body
        .querySelector('turbo-cable-stream-source')
        ?.getAttribute('connected')
    ).toBeUndefined()
  })

  it('when page is a preview from Turbo cache', async () => {
    document.body.innerHTML = `
      <turbo-cable-stream-source-turbo signed-stream-name='test-connected' channel='TurboChannel'></turbo-cable-stream-source-turbo>
    `
    document.documentElement.setAttribute('data-turbo-preview', '')

    let cable = createCable(`ws://localhost:${port}`)
    start(cable, { tagName: 'turbo-cable-stream-source-turbo' })

    await new Promise(resolve => setTimeout(resolve, 300))

    expect(cable.hub.channels.length).toEqual(0)
    expect(receivedByServer.length).toEqual(0)
  })

  it('with requestSocketIDHeader=true', async () => {
    let cable = createCable(`ws://localhost:${port}`)
    cable.setSessionId('42')

    start(cable, {
      requestSocketIDHeader: true,
      tagName: 'turbo-cable-stream-source-socket-id'
    })

    let event = new CustomEvent('turbo:before-fetch-request', {
      detail: {
        fetchOptions: {
          headers: {}
        }
      }
    })

    document.dispatchEvent(event)

    expect(
      (event.detail.fetchOptions.headers as any)[DEFAULT_SOCKET_HEADER]
    ).toEqual('42')

    let eventWithHeader = new CustomEvent('turbo:before-fetch-request', {
      detail: {
        fetchOptions: {
          headers: {
            'X-Socket-ID': '123'
          }
        }
      }
    })

    expect(eventWithHeader.detail.fetchOptions.headers['X-Socket-ID']).toEqual(
      '123'
    )
  })

  it('with requestSocketIDHeader=<custom-header-name>', async () => {
    let cable = createCable(`ws://localhost:${port}`)
    cable.setSessionId('42')

    start(cable, {
      requestSocketIDHeader: 'X-TURBO-SOCKET',
      tagName: 'turbo-cable-stream-source-custom-socket-id'
    })

    let event = new CustomEvent('turbo:before-fetch-request', {
      detail: {
        fetchOptions: {
          headers: {}
        }
      }
    })

    document.dispatchEvent(event)

    expect(
      (event.detail.fetchOptions.headers as any)['X-TURBO-SOCKET']
    ).toEqual('42')
  })
})
