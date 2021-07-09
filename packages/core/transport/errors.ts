import { Transport } from '../index'

class FakeTransport implements Transport<string> {
  // THROWS Property 'open' in type 'FakeTransport' is not assignable
  open(url: string) {}
  // THROWS Property 'send' in type 'FakeTransport' is not assignable to the same property in base type
  send(data: number) {}
  // THROWS Property 'close' in type 'FakeTransport' is not assignable
  close() {}
}
