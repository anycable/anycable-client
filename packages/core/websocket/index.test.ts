import { WebSocketTransport } from '../index.js'

it('requires implementation', () => {
  ;(global as any).WebSocket = undefined
  expect(() => new WebSocketTransport('ws://')).toThrow('No WebSocket support')
})

it('use global implementation when available', () => {
  if (!(global as any).WebSocket) {
    ;(global as any).WebSocket = Object
  }
  expect(() => new WebSocketTransport('ws://')).not.toThrow()
})

it('setParam', () => {
  let t = new WebSocketTransport('wss://example.cable/ws')
  t.setParam('key', 'value')

  expect(t.url).toBe('wss://example.cable/ws?key=value')
})

it('setParam + existing url query params', () => {
  let t = new WebSocketTransport('ws://example.cable/ws?token=xxx')
  t.setParam('key', 'value')

  expect(t.url).toBe('ws://example.cable/ws?token=xxx&key=value')
})

it('setParam + overwrite query param', () => {
  let t = new WebSocketTransport('ws://example.cable/ws?token=xxx')
  t.setParam('token', 'yyy')

  expect(t.url).toBe('ws://example.cable/ws?token=yyy')
})

it('send when not connected', () => {
  let t = new WebSocketTransport('ws://')

  expect(() => {
    t.send('test')
  }).toThrow(/not connected/i)
})
it('close when not connected', () => {
  let t = new WebSocketTransport('ws://')

  expect(() => t.close()).not.toThrow()
})

it('setURL', () => {
  let t = new WebSocketTransport('ws://')

  t.setURL('wss://')
  expect(t.url).toEqual('wss://')
})
