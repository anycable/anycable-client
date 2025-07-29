import { jest } from '@jest/globals'
import { WebSocketServer, WebSocket } from 'ws'
import { createCable, Cable } from '@anycable/core'

import { EchoCable } from './index.js'

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
        let stream_name: string
        let channel: string

        channel = id.channel
        signed_stream_name = id.signed_stream_name
        stream_name = id.stream_name

        if (channel !== '$pubsub') {
          ws.send(JSON.stringify({ identifier, type: 'reject_subscription' }))
          return
        }

        // Handle both signed and unsigned streams
        let streamKey = signed_stream_name || stream_name
        if (!streamKey) {
          ws.send(JSON.stringify({ identifier, type: 'reject_subscription' }))
          return
        }

        if (!connsPerStream[streamKey]) {
          connsPerStream[streamKey] = []
        }

        connsPerStream[streamKey]!.push(ws)
        ws.send(JSON.stringify({ identifier, type: 'confirm_subscription' }))
      }
    })

    ws.send(JSON.stringify({ type: 'welcome' }))
  })

  await new Promise<void>(resolve => {
    wss.on('listening', resolve)
  })
})

const broadcast = (stream: string, event: string, data: any) => {
  let identifier = JSON.stringify({
    channel: '$pubsub',
    signed_stream_name: stream.startsWith('signed:') ? stream : undefined,
    stream_name: stream.startsWith('signed:') ? undefined : stream
  })

  let message = {
    event,
    data
  }

  let payload = JSON.stringify({ identifier, message })

  let connections = connsPerStream[stream]
  if (connections) {
    for (let conn of connections) {
      conn.send(payload)
    }
  }
}

const broadcastPresence = (stream: string, message: any) => {
  let identifier = JSON.stringify({
    channel: '$pubsub',
    signed_stream_name: stream.startsWith('signed:') ? stream : undefined,
    stream_name: stream.startsWith('signed:') ? undefined : stream
  })

  let payload = JSON.stringify({ identifier, type: 'presence', message })

  let connections = connsPerStream[stream]
  if (connections) {
    for (let conn of connections) {
      conn.send(payload)
    }
  }
}

// Mock fetch for Laravel auth endpoints
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>
global.fetch = mockFetch

afterEach(() => {
  wss.close()
  for (let ws of wss.clients) {
    ws.terminate()
  }
  jest.clearAllMocks()
})

describe('EchoCable Laravel Echo Integration', () => {
  let echoCable: EchoCable

  beforeEach(() => {
    mockFetch.mockClear()

    echoCable = new EchoCable({
      cableOptions: { url: `ws://localhost:${port}` },
      auth: {
        headers: {
          'X-CSRF-TOKEN': 'test-token'
        }
      }
    })
  })

  it('creates public channel and receives events', async () => {
    let channel = echoCable.channel('test-channel')
    expect(channel).toBeDefined()

    let eventReceived = false
    let receivedData: any = null

    channel.listen('test-event', (data: any) => {
      eventReceived = true
      receivedData = data
    })

    await new Promise((resolve, reject) => {
      setTimeout(reject, 2000)
      channel.subscribed(resolve)
    })

    broadcast('test-channel', 'test-event', { message: 'Hello World' })

    await new Promise(resolve => setTimeout(resolve, 300))

    expect(eventReceived).toBe(true)
    expect(receivedData).toEqual({ message: 'Hello World' })
  })

  it('creates private channel with authentication', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        auth: 'mock-auth-signature',
        signed_stream_name: 'signed:private-test-channel'
      })
    } as Response)

    let privateChannel = echoCable.privateChannel('test-channel')
    expect(privateChannel).toBeDefined()

    let eventReceived = false
    let receivedData: any = null

    privateChannel.listen('private-event', (data: any) => {
      eventReceived = true
      receivedData = data
    })

    await new Promise((resolve, reject) => {
      setTimeout(reject, 3000)
      privateChannel.subscribed(resolve)
    })

    expect(mockFetch).toHaveBeenCalledWith('/broadcasting/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-CSRF-TOKEN': 'test-token'
      },
      body: JSON.stringify({
        socket_id: echoCable.cable.sessionId || 'anycable-session',
        channel_name: 'private-test-channel'
      }),
      credentials: 'same-origin'
    })

    broadcast('signed:private-test-channel', 'private-event', {
      secret: 'data'
    })

    await new Promise(resolve => setTimeout(resolve, 300))

    expect(eventReceived).toBe(true)
    expect(receivedData).toEqual({ secret: 'data' })
  })

  it('creates presence channel with user authentication', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        auth: 'mock-auth-signature',
        signed_stream_name: 'signed:presence-test-channel',
        presence: {
          id: 1,
          name: 'John Doe',
          email: 'john@example.com'
        }
      })
    } as Response)

    let presenceChannel = echoCable.presenceChannel('test-channel')
    expect(presenceChannel).toBeDefined()

    let usersHere: any[] = []
    let userJoining: any = null
    let userLeaving: any = null

    presenceChannel
      .here((users: any) => {
        usersHere = users
      })
      .joining((user: any) => {
        userJoining = user
      })
      .leaving((user: any) => {
        userLeaving = user
      })

    await new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(Error('timed out to subscribe'))
      }, 1000)
      presenceChannel.subscribed(resolve)
    })

    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      '/broadcasting/auth',
      expect.any(Object)
    )

    broadcastPresence('signed:presence-test-channel', {
      type: 'info',
      records: [
        { id: '1', info: { id: 1, name: 'John Doe' } },
        { id: '2', info: { id: 2, name: 'Jane Smith' } }
      ]
    })

    await new Promise(resolve => setTimeout(resolve, 300))

    expect(usersHere).toHaveLength(2)
    expect(usersHere[0]).toEqual({ id: 1, name: 'John Doe' })

    broadcastPresence('signed:presence-test-channel', {
      type: 'join',
      id: '3',
      info: { id: 3, name: 'Bob Wilson' }
    })

    await new Promise(resolve => setTimeout(resolve, 300))

    expect(presenceChannel.getMembers()).toHaveLength(3)
    expect(userJoining).toEqual({ id: 3, name: 'Bob Wilson' })

    broadcastPresence('signed:presence-test-channel', {
      type: 'leave',
      id: '2'
    })

    await new Promise(resolve => setTimeout(resolve, 300))

    expect(presenceChannel.getMembers()).toHaveLength(2)
    expect(userLeaving).toEqual({ id: 2, name: 'Jane Smith' })
  })

  it('handles whisper events on private channels', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        auth: 'mock-auth-signature',
        signed_stream_name: 'signed:private-test-channel'
      })
    } as Response)

    let privateChannel = echoCable.privateChannel('test-channel')

    let whisperReceived = false
    let whisperData: any = null

    privateChannel.listenForWhisper('typing', (data: any) => {
      whisperReceived = true
      whisperData = data
    })

    await new Promise((resolve, reject) => {
      setTimeout(reject, 3000)
      privateChannel.subscribed(resolve)
    })

    broadcast('signed:private-test-channel', 'client-typing', {
      user: 'John',
      typing: true
    })

    await new Promise(resolve => setTimeout(resolve, 300))

    expect(whisperReceived).toBe(true)
    expect(whisperData).toEqual({ user: 'John', typing: true })
  })

  it('handles Laravel notifications', async () => {
    let channel = echoCable.channel('user.1')

    let notificationReceived = false
    let notificationData: any = null

    channel.notification((data: any) => {
      notificationReceived = true
      notificationData = data
    })

    await new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(Error('timed out to subscribe'))
      }, 2000)
      channel.subscribed(resolve)
    })

    // Simulate a Laravel notification
    broadcast(
      'user.1',
      'Illuminate\\Notifications\\Events\\BroadcastNotificationCreated',
      {
        id: 'notification-id',
        type: 'App\\Notifications\\OrderShipped',
        data: { order_id: 123 }
      }
    )

    await new Promise(resolve => setTimeout(resolve, 300))

    expect(notificationReceived).toBe(true)
    expect(notificationData).toEqual({
      id: 'notification-id',
      type: 'App\\Notifications\\OrderShipped',
      data: { order_id: 123 }
    })
  })

  it('handles channel leaving and cleanup', async () => {
    let channel = echoCable.channel('test-channel')

    await new Promise((resolve, reject) => {
      setTimeout(reject, 2000)
      channel.subscribed(resolve)
    })

    expect(Object.keys(echoCable.channels)).toContain('test-channel')

    echoCable.leave('test-channel')

    expect(Object.keys(echoCable.channels)).not.toContain('test-channel')
    expect(Object.keys(echoCable.channels)).not.toContain(
      'private-test-channel'
    )
    expect(Object.keys(echoCable.channels)).not.toContain(
      'presence-test-channel'
    )
  })

  it('provides socket ID from cable session', () => {
    let cable = createCable(`ws://localhost:${port}`)
    cable.setSessionId('test-session-id')

    let customCable = new EchoCable({ cable })

    expect(customCable.socketId()).toBe('test-session-id')
  })

  it('handles authentication errors gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden'
    } as Response)

    let privateChannel = echoCable.privateChannel('test-channel')

    let errorReceived = false
    let errorData: any = null

    privateChannel.error((error: any) => {
      errorReceived = true
      errorData = error
    })

    // Wait for authentication error
    await new Promise(resolve => setTimeout(resolve, 1000))

    expect(errorReceived).toBe(true)
    expect(errorData).toBeInstanceOf(Error)
  })
})
