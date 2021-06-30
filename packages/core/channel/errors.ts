import { Channel } from './index.js'
import { ConnectorCallback, Pipe } from '../index'

class Connector {
  subscribe(
    data: { channel: string; params: any },
    callback: ConnectorCallback
  ): Promise<Pipe> {
    return Promise.resolve({
      close: () => Promise.resolve(),
      send: () => Promise.resolve(null)
    })
  }
}

const connector = new Connector()

new Channel(
  // THROWS Argument of type
  42
)

export class IdChannel extends Channel<{ id: string }> {}

// THROWS Type 'number' is not assignable
new IdChannel(connector, { id: 42 })

const ch = new Channel(connector)

// THROWS Argument of type
ch.on('start', (event: object) => {
  event
})
// THROWS Argument of type
ch.on('stop', (event: object) => {
  event
})
// THROWS Argument of type
ch.on('data', (msg: object, meta: object) => {
  meta
})
// THROWS Argument of type
ch.on('duta', (msg: object) => true)
