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

it('set', () => {
  let t = new WebSocketTransport('ws://')
  t.setParam('key', 'value')
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
