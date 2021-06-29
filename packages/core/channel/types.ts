import { Channel } from './index.js'

class MockClient {
  subscribe(channel: string, params?: any): Promise<string> {
    return Promise.resolve(channel)
  }
  unsubscribe(sid: string): Promise<boolean> {
    return Promise.resolve(true)
  }
  perform(sid: string, action: string, payload?: any): Promise<any> {
    return Promise.resolve(payload)
  }
}

class TestChannel extends Channel<{ id: string }> {
  do(stuff: string): Promise<any> {
    return this.perform('do', { what: stuff })
  }
}

new TestChannel()

const ch = new TestChannel({ id: '123' })
await ch.connect(new MockClient())

export const identifier: string = ch.identifier

await ch.do('work')

ch.disconnect()
