import { jest } from '@jest/globals'

import { FallbackTransport } from '../index.js'
import { TestTransport } from './testing'
import { TestLogger } from '../logger/testing'

describe('FallbackTransport', () => {
  let transport: FallbackTransport

  let a: TestTransport
  let b: TestTransport

  beforeEach(() => {
    a = new TestTransport('a')
    b = new TestTransport('b')

    transport = new FallbackTransport([a, b])
  })

  it('uses the first transport and sends via it if available', async () => {
    await transport.open()
    expect(a.opened).toBe(true)
    expect(b.opened).toBe(false)

    // check that the transport sends via the first transport
    transport.send('hello')
    expect(a.sent).toEqual(['hello'])
    expect(b.sent).toEqual([])

    await transport.close()
    expect(a.opened).toBe(false)
    expect(b.opened).toBe(false)
  })

  it('uses the second transport if the first fails', async () => {
    a.open = () => Promise.reject(Error('failed'))
    await transport.open()
    expect(a.opened).toBe(false)
    expect(b.opened).toBe(true)

    // check that the transport sends via the first transport
    transport.send('hello')
    expect(b.sent).toEqual(['hello'])
    expect(a.sent).toEqual([])

    await transport.close()
    expect(a.opened).toBe(false)
    expect(b.opened).toBe(false)
  })

  it('rejects if all transports fail to connect', async () => {
    a.open = () => Promise.reject(Error('failed'))
    b.open = () => Promise.reject(Error('failed'))

    await expect(transport.open()).rejects.toThrow(/Couldn't connect/)
  })

  it('tries to use the first one on reconnect', async () => {
    await transport.open()
    expect(a.opened).toBe(true)
    expect(b.opened).toBe(false)

    await transport.close()
    expect(a.opened).toBe(false)
    expect(b.opened).toBe(false)

    let origOpen = a.open
    a.open = () => Promise.reject(Error('failed'))

    await transport.open()
    expect(a.opened).toBe(false)
    expect(b.opened).toBe(true)

    await transport.close()
    expect(a.opened).toBe(false)
    expect(b.opened).toBe(false)

    a.open = origOpen

    await transport.open()
    expect(a.opened).toBe(true)
    expect(b.opened).toBe(false)
  })

  it('setUrl fails', () => {
    expect(() => {
      transport.setURL('hello')
    }).toThrow(/Not implemented/)
  })

  it('sets params for all transports', () => {
    transport.setParam('hello', 'world')
    expect(a.state).toEqual({ hello: 'world' })
    expect(b.state).toEqual({ hello: 'world' })
  })

  it('sets tokens for all transports', () => {
    transport.setToken('secret')
    expect(a.state.jid).toEqual('secret')
    expect(b.state.jid).toEqual('secret')
  })

  it('delegates events to active transport', async () => {
    let open = jest.fn()
    let close = jest.fn()
    let data = jest.fn()
    let error = jest.fn()

    transport.on('open', open)
    transport.on('close', close)
    transport.on('data', data)
    transport.once('error', error)

    await transport.open()

    a.emit('open')
    expect(open).toHaveBeenCalled()

    a.emit('close', Error('network error'))
    expect(close).toHaveBeenCalledWith(Error('network error'))

    a.emit('data', 'hello')
    expect(data).toHaveBeenCalledWith('hello')

    a.emit('error', Error('test'))
    expect(error).toHaveBeenCalledWith(Error('test'))
  })

  it('displayName', () => {
    expect(transport.displayName()).toBe('fallbacked transport')
  })

  it('url', async () => {
    expect(transport.url).toEqual('')

    await transport.open()

    expect(transport.url).toEqual('a')
  })

  it('send when no active transport', () => {
    expect(() => {
      transport.send('hello')
    }).toThrow(/No transport is open/)
  })

  it('close when no transport', async () => {
    await expect(transport.close()).rejects.toThrow(/No transport is open/)
  })

  describe('with logger', () => {
    let logger: TestLogger

    beforeEach(() => {
      logger = new TestLogger('debug')
      transport = new FallbackTransport([a, b], { logger })
    })

    it('logs failed transports', async () => {
      a.open = () => Promise.reject(Error('errorza!'))
      await transport.open()
      expect(logger.logs.map(item => [item.level, item.message])).toEqual([
        ['debug', 'Trying to connect via TestTransport(a)'],
        ['debug', 'Failed to connect via TestTransport(a): errorza!'],
        ['debug', 'Trying to connect via TestTransport(b)'],
        ['debug', 'Connected via TestTransport(b)']
      ])
    })
  })
})
