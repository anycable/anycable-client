import { Encoder } from '../index'

class TextEncoder implements Encoder<number, string> {
  // THROWS Property 'encode' in type 'TextEncoder' is not assignable
  encode(msg: string) {
    return msg
  }

  // THROWS Property 'decode' in type 'TextEncoder' is not assignable
  decode(raw: string) {
    return raw
  }
}
