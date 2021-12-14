import { stringifyParams } from '../stringify-params/index.js'

let keyGenerator = (identifier, params) => {
  if (params) {
    return `${identifier}/${stringifyParams(params)}`
  }

  return identifier
}

export class ChannelsCache {
  constructor() {
    this.store = {}
  }

  write(channel, identifier, params) {
    let key = keyGenerator(identifier, params)

    this.store[key] = channel
  }

  read(identifier, params) {
    let key = keyGenerator(identifier, params)

    return this.store[key]
  }

  delete(identifier, params) {
    let key = keyGenerator(identifier, params)

    if (this.store[key]) {
      delete this.store[key]
      return true
    }

    return false
  }
}
