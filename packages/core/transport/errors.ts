import { Transport, FallbackTransport } from '../index'

class FakeTransport implements Transport<string> {
  // THROWS Property 'open' in type 'FakeTransport' is not assignable
  open(url: string) {}
  // THROWS Property 'send' in type 'FakeTransport' is not assignable to the same property in base type
  send(data: number) {}
  // THROWS Property 'close' in type 'FakeTransport' is not assignable
  close() {}
}

class GoodTransport<T> implements Transport<T> {
  async open() {}
  send(data: T) {}
  async close() {}
  get url() {
    return ''
  }
  displayName() {
    return 'good'
  }
  setURL(url: string) {}
  setParam(key: string, value: string) {}
  on(event: string, callback: () => void) {
    return () => {}
  }
  once(event: string, callback: () => void) {
    return () => {}
  }
}

const fallback = new FallbackTransport<string | Uint8Array>([
  new GoodTransport<string>(),
  new GoodTransport<Uint8Array>(),
  // THROWS Type 'GoodTransport<number>' is not assignable to type 'Transport<string | Uint8Array>'.
  new GoodTransport<number>()
])
