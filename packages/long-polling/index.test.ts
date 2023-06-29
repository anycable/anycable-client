import fetch from 'node-fetch'

import { LongPollingTransport } from './index.js'

describe('LongPollingTransport', () => {
  let t: LongPollingTransport

  beforeEach(() => {
    t = new LongPollingTransport('http://example.com', {
      fetchImplementation: fetch
    })
  })

  it('displayName', () => {
    expect(t.displayName()).toMatch('LongPolling')
  })

  it('requires implementation', () => {
    ;(global as any).fetch = undefined
    expect(() => new LongPollingTransport('https://')).toThrow(
      'No fetch support'
    )
  })

  it('use global implementation when available', async () => {
    if (!(global as any).fetch) {
      ;(global as any).fetch = () => {
        throw new Error('Fake fetch')
      }
    }
    expect(() => new LongPollingTransport('http://')).not.toThrow()
    let transport = new LongPollingTransport('http://')

    await expect(transport.open()).rejects.toEqual(Error('Fake fetch'))
  })

  it('setParam', () => {
    t.setParam('key', 'value')

    expect(t.url).toBe('http://example.com/?key=value')
  })

  it('setParam + existing url query params', () => {
    t.setURL('http://example.cable/ws?token=xxx')
    t.setParam('key', 'value')

    expect(t.url).toBe('http://example.cable/ws?token=xxx&key=value')
  })

  it('send when not connected', () => {
    expect(() => {
      t.send('test')
    }).toThrow(/no connection/i)
  })
})
