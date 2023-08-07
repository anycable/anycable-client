import { WebSocketServer, WebSocket } from 'ws'
import { Socket } from 'net'
import { clearInterval } from 'timers'

import { WebSocketTransport } from '../index.js'

let port: number
let wss: WebSocketServer

beforeEach(async () => {
  port = (8080 + Math.random() * 500) | 0
  wss = new WebSocketServer({ port })

  await new Promise<void>(resolve => {
    wss.on('listening', resolve)
  })
})

afterEach(() => {
  wss.close()
  for (let ws of wss.clients) {
    ws.terminate()
  }
})

function connect(
  server: WebSocketServer,
  client: WebSocketTransport
): Promise<WebSocket> {
  return new Promise(resolve => {
    server.on('connection', ws => {
      resolve(ws)
    })
    client.open()
  })
}

function received(buffer: string[], msg: string, wait: number = 1000) {
  return new Promise<void>((resolve, reject) => {
    let nums = wait / 100

    let id: any = setInterval(() => {
      if (nums === 0) {
        clearInterval(id)
        reject(Error(`Timed out to receive: ${msg}`))
        return
      }

      nums--

      let match = buffer.find(el => el === msg)

      if (match) {
        clearInterval(id)
        resolve()
      }
    }, 100)
  })
}

it('works', async () => {
  let client = new WebSocketTransport<WebSocket, string>(
    `ws://0.0.0.0:${port}`,
    { websocketImplementation: WebSocket }
  )

  let clientReceived: string[] = []
  client.on('data', msg => {
    clientReceived.push(msg)
  })

  let openPromise = new Promise<void>((resolve, reject) => {
    let tid = setTimeout(() => {
      reject(Error('Failed to open'))
    }, 500)
    client.on('open', () => {
      clearTimeout(tid)
      resolve()
    })
  })

  let serverWS = await connect(wss, client)

  await openPromise

  expect(client.connected).toBe(true)

  let serverReceived: string[] = []
  serverWS.on('message', msg => {
    serverReceived.push(msg.toString())
  })

  client.send('ping')
  await received(serverReceived, 'ping')

  let dataPromise = new Promise<string>((resolve, reject) => {
    let tid = setTimeout(() => {
      reject(Error('Failed to receive data'))
    }, 500)
    client.once('data', data => {
      clearTimeout(tid)
      resolve(data)
    })
  })

  serverWS.send('pong')

  let msg = await dataPromise

  expect(msg).toEqual('pong')

  let closePromise = new Promise<void>((resolve, reject) => {
    let tid = setTimeout(() => {
      reject(Error('No close event emitted'))
    }, 500)
    client.once('close', () => {
      clearTimeout(tid)
      resolve()
    })
  })

  serverWS.close()
  await closePromise
  expect(client.connected).toBe(false)
})

it('connection refused', async () => {
  let client = new WebSocketTransport<WebSocket, string>(
    `ws://0.0.0.0:${port + 1}`,
    { websocketImplementation: WebSocket }
  )

  await expect(client.open()).rejects.toEqual(Error('WS connection closed'))

  expect(client.connected).toBe(false)

  expect(() => client.close()).not.toThrow()
})

it('connection error', async () => {
  let socket!: Socket

  wss.on('connection', (ws, request) => {
    socket = request.socket
  })

  let client = new WebSocketTransport<WebSocket, string>(
    `ws://0.0.0.0:${port}`,
    { websocketImplementation: WebSocket }
  )

  await client.open()

  let errorPromise = new Promise<void>(resolve => {
    client.on('error', err => {
      expect(err.message).toMatch(/invalid/i)
      resolve()
    })
  })

  socket.write('HTTP/1.1 403 Unauthorized\r\n\r\n')

  await errorPromise
})

it('close', async () => {
  let serverWS!: WebSocket

  let closePromise = new Promise<void>(resolve => {
    wss.on('connection', ws => {
      serverWS = ws
      ws.on('close', resolve)
    })
  })

  let client = new WebSocketTransport<WebSocket, string>(
    `ws://0.0.0.0:${port}`,
    { websocketImplementation: WebSocket }
  )

  let clientReceived: string[] = []

  let receivedOnce = new Promise<void>(resolve => {
    let firstMsg = true

    client.on('data', msg => {
      clientReceived.push(msg)
      if (firstMsg) {
        firstMsg = false
        resolve()
      }
    })
  })

  await client.open()
  serverWS.send('data 1')

  await receivedOnce

  client.close()
  serverWS.send('data 2')

  await closePromise

  serverWS.send('data 3')

  await new Promise(resolve => setTimeout(resolve, 100))

  expect(clientReceived).toEqual(['data 1'])
})

it('with binary protocol', async () => {
  wss.on('connection', ws => {
    ws.on('message', msg => {
      let data = msg as Buffer

      data[0] += 1
      data[1] += 1

      ws.send(data)
    })
  })

  let client = new WebSocketTransport<WebSocket, Uint8Array>(
    `ws://0.0.0.0:${port}`,
    { websocketImplementation: WebSocket, format: 'binary' }
  )

  await client.open()

  let dataPromise = new Promise<Uint8Array>((resolve, reject) => {
    let tid = setTimeout(() => {
      reject(Error('Failed to receive data'))
    }, 500)
    client.once('data', msg => {
      clearTimeout(tid)
      resolve(msg)
    })
  })

  client.send(new Uint8Array([4, 21]))

  let response = await dataPromise

  expect(response).toEqual(new Uint8Array([5, 22]))
})

it('with headers', async () => {
  wss.on('connection', (ws, req) => {
    let clientHeaders = req.headers

    ws.send(clientHeaders['x-api-token'] || 'none')
  })

  let headers = {
    'x-api-token': 'secret'
  }

  let client = new WebSocketTransport<WebSocket, string>(
    `ws://0.0.0.0:${port}`,
    { websocketImplementation: WebSocket, websocketOptions: { headers } }
  )

  let dataPromise = new Promise<string>((resolve, reject) => {
    let tid = setTimeout(() => {
      reject(Error('Failed to receive data'))
    }, 500)
    client.once('data', msg => {
      clearTimeout(tid)
      resolve(msg)
    })
  })

  await client.open()

  let response = await dataPromise

  expect(response).toEqual('secret')
})
