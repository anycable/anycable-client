import { Encoder } from '@anycable/core'

export class ProtobufEncoder implements Encoder<object, Uint8Array> {
  encode(msg: object): Uint8Array
  decode(raw: Uint8Array): object | void
}
