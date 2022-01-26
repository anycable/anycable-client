import msgpack from '@ygoe/msgpack'

export class MsgpackEncoder {
  encode(msg) {
    return msgpack.encode(msg)
  }

  /* eslint-disable consistent-return */
  decode(data) {
    try {
      return msgpack.decode(data)
    } catch (_e) {}
  }
}
