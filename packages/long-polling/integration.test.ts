import fetch from 'node-fetch'
import { IncomingMessage, createServer } from 'http'

import { LongPollingTransport } from './index.js'

describe('LongPollingTransport', () => {
  let port: number
  let server: ReturnType<typeof createServer>
  let transport: LongPollingTransport
  let responses: string[]
  let received: IncomingMessage[]
  let responseStatus: number
  let pollId: string
  let pollInterval = 500
  let cooldownPeriod = 300
  let sendBuffer = 100
  let pingInterval = 450

  beforeEach(() => {
    responses = []
    received = []
    responseStatus = 200
    port = (4080 + Math.random() * 500) | 0

    server = createServer(async (request, response) => {
      if (request.method !== 'POST' || request.url !== '/poll') {
        response.writeHead(404)
        response.end()
        return
      }

      received.push(request)

      let headers: Record<string, string> = {
        'Content-Type': 'text/plain'
      }

      if (pollId) {
        headers['X-Anycable-Poll-Id'] = pollId
      }

      if (
        (responseStatus === 200 || responseStatus === 204) &&
        responses.length === 0
      ) {
        // wait for poll interval
        await new Promise(resolve => setTimeout(resolve, pollInterval))
      }

      response.writeHead(responseStatus, headers)

      for (let i = 0; i < responses.length; i++) {
        response.write(responses[i] + '\n')
      }
      response.end()
    })

    server.listen(port)
  })

  beforeEach(() => {
    transport = new LongPollingTransport(`http://localhost:${port}/poll`, {
      cooldownPeriod,
      sendBuffer,
      pingInterval,
      fetchImplementation: fetch
    })
  })

  afterEach(async () => {
    await transport.close()
    server.close()
  })

  it('displayName', () => {
    expect(transport.displayName()).toMatch('LongPolling')
  })

  it('opens a connection with a POST request', async () => {
    let incoming: string[] = []
    transport.on('data', (msg: string) => {
      if (!msg.match(/ping/)) incoming.push(msg)
    })

    let openPromise = new Promise<void>((resolve, reject) => {
      let tid = setTimeout(() => {
        reject(Error('Failed to open'))
      }, 500)
      transport.once('open', () => {
        clearTimeout(tid)
        resolve()
      })
    })

    responses.push('welcome')

    await transport.open()
    await openPromise

    expect(transport.connected).toBe(true)
    expect(incoming).toEqual(['welcome'])
  })

  it('rejects if the server responds with non-20x code', async () => {
    responseStatus = 422

    await expect(transport.open()).rejects.toEqual(
      Error('Unexpected status code: 422')
    )
  })

  it('rejects if the server responds with 401 without messages', async () => {
    responseStatus = 401

    await expect(transport.open()).rejects.toEqual(
      Error('Unexpected status code: 401')
    )
  })

  it('rejects if the server responds with 401 code but process messages', async () => {
    let incoming: string[] = []
    transport.on('data', (msg: string) => {
      if (!msg.match(/ping/)) incoming.push(msg)
    })

    responseStatus = 401
    responses.push('unauthorized')

    await expect(transport.open()).rejects.toEqual(
      Error('Unexpected status code: 401')
    )

    expect(transport.connected).toBe(false)
    expect(incoming).toEqual(['unauthorized'])
  })

  it('rejects if the server responds with 50x code', async () => {
    responseStatus = 503

    await expect(transport.open()).rejects.toEqual(
      Error('Unexpected status code: 503')
    )
  })

  it('sends poll ID received from the server via X-ANYCABLE-POLL-ID header', async () => {
    let incoming: string[] = []
    transport.on('data', (msg: string) => {
      if (!msg.match(/ping/)) incoming.push(msg)
    })

    let openPromise = new Promise<void>((resolve, reject) => {
      let tid = setTimeout(() => {
        reject(Error('Failed to open'))
      }, 500)
      transport.once('open', () => {
        clearTimeout(tid)
        resolve()
      })
    })

    pollId = 'abc123'
    responses.push('welcome')

    await transport.open()
    await openPromise

    expect(incoming).toEqual(['welcome'])

    responses.length = 0
    incoming.length = 0
    responses.push('confirmed')

    transport.send('hello')
    transport.send('world')

    // Wait for send to be processed
    await new Promise(resolve => setTimeout(resolve, 300))

    expect(received).toHaveLength(2)
    expect(received[1].headers['x-anycable-poll-id']).toEqual('abc123')
    expect(incoming).toEqual(['confirmed'])
  })

  it('sends multiple requests according to poll interval', async () => {
    let incoming: string[] = []
    transport.on('data', (msg: string) => {
      if (!msg.match(/ping/)) incoming.push(msg)
    })

    let openPromise = new Promise<void>((resolve, reject) => {
      let tid = setTimeout(() => {
        reject(Error('Failed to open'))
      }, 500)
      transport.once('open', () => {
        clearTimeout(tid)
        resolve()
      })
    })

    responses.push('welcome')

    await transport.open()
    await openPromise

    expect(incoming).toEqual(['welcome'])

    responses.length = 0
    incoming.length = 0
    responses.push('hello')

    // Perform one more polling request
    await new Promise(resolve => setTimeout(resolve, 500))

    expect(incoming).toEqual(['hello'])
  })

  it('close() aborts the request in-flight and stops polling', async () => {
    let incoming: string[] = []
    transport.on('data', (msg: string) => {
      if (!msg.match(/ping/)) incoming.push(msg)
    })

    let openPromise = new Promise<void>((resolve, reject) => {
      let tid = setTimeout(() => {
        reject(Error('Failed to open'))
      }, 500)
      transport.once('open', () => {
        clearTimeout(tid)
        resolve()
      })
    })

    responses.push('welcome')

    await transport.open()
    await openPromise

    expect(incoming).toEqual(['welcome'])

    incoming.length = 0
    responses.length = 0
    // Wait for the next polling request to start
    await new Promise(resolve => setTimeout(resolve, 350))
    // Close the transport
    transport.close()
    // Add responses
    await new Promise(resolve => setTimeout(resolve, 50))
    responses.push('hey?')

    // Wait till polling completes
    await new Promise(resolve => setTimeout(resolve, 300))
    expect(incoming).toEqual([])

    // Let server finish processing the request
    await new Promise(resolve => setTimeout(resolve, 300))
    expect(incoming).toEqual([])
  })

  describe('when open', () => {
    beforeEach(async () => {
      let openPromise = new Promise<void>((resolve, reject) => {
        let tid = setTimeout(() => {
          reject(Error('Failed to open'))
        }, 500)
        transport.once('open', () => {
          clearTimeout(tid)
          resolve()
        })
      })

      responses.push('welcome')

      await transport.open()
      await openPromise

      expect(transport.connected).toBe(true)
      responses.length = 0
      received.length = 0
    })

    it('when poll request fails must close transport', async () => {
      responseStatus = 422

      let closePromise = new Promise<void>((resolve, reject) => {
        let tid = setTimeout(() => {
          reject(Error('Failed to close'))
        }, 500)
        transport.once('close', () => {
          clearTimeout(tid)
          resolve()
        })
      })

      await closePromise
    })

    it('when poll request fails with 401 process messages', async () => {
      let incoming: string[] = []
      transport.on('data', (msg: string) => {
        if (!msg.match(/ping/)) incoming.push(msg)
      })

      responseStatus = 401
      responses.push('session_expired')

      let closePromise = new Promise<void>((resolve, reject) => {
        let tid = setTimeout(() => {
          reject(Error('Failed to close'))
        }, 500)
        transport.once('close', () => {
          clearTimeout(tid)

          if (!incoming.length || incoming[0] !== 'session_expired') {
            reject(Error('No expected messages were received'))
            return
          }
          resolve()
        })
      })

      await closePromise
    })

    it('when poll occurs before we flush buffer', async () => {
      // Wait almost till the next poll
      await new Promise(resolve => setTimeout(resolve, 250))

      transport.send('command')

      // Wait for the next poll
      await new Promise(resolve => setTimeout(resolve, 70))

      // Make sure request was sent
      expect(received).toHaveLength(1)

      let request = received[0]
      let payload = ''

      request.on('data', (chunk: Buffer) => {
        payload += chunk.toString()
      })

      await new Promise<void>((resolve, reject) => {
        let tid = setTimeout(() => {
          reject(Error('Request was not closed'))
        }, 500)
        request.once('end', () => {
          clearTimeout(tid)
          resolve()
        })
      })

      expect(payload).toEqual('command')
    })

    it('when closed before we flush buffer', async () => {
      transport.send('command')

      await new Promise(resolve => setTimeout(resolve, 50))

      transport.close()

      // wait for potential flush
      await new Promise(resolve => setTimeout(resolve, 100))

      // Make sure no requests were made
      expect(received).toHaveLength(0)
    })

    it('when marked as connected=false before we flush buffer', async () => {
      transport.send('command')

      await new Promise(resolve => setTimeout(resolve, 50))
      ;(transport as any).connected = false

      // wait for potential flush
      await new Promise(resolve => setTimeout(resolve, 100))

      // Make sure no requests were made
      expect(received).toHaveLength(0)
    })

    it('sending commands aborts polling request', async () => {
      let incoming: string[] = []
      transport.on('data', (msg: string) => {
        if (!msg.match(/ping/)) incoming.push(msg)
      })

      // wait for polling to start
      await new Promise(resolve => setTimeout(resolve, 330))

      // Make sure no requests were made
      expect(received).toHaveLength(1)

      transport.send('command')

      // wait for command to flush
      await new Promise(resolve => setTimeout(resolve, 120))

      // Make sure no requests were made
      expect(received).toHaveLength(2)

      // Wait a bit more to make sure polling request was aborted
      await new Promise(resolve => setTimeout(resolve, 100))

      responses.push('reply')

      // Let server finish processing the aborted requests
      await new Promise(resolve => setTimeout(resolve, 500))

      expect(incoming).toEqual(['reply'])
    })
  })
})
