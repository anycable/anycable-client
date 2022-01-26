/* eslint-disable consistent-return */

export class JSONEncoder {
  encode(msg) {
    return JSON.stringify(msg)
  }

  decode(raw) {
    try {
      return JSON.parse(raw)
    } catch (_e) {}
  }
}
