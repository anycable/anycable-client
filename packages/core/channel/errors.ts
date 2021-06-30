import { Channel } from './index.js'
import { ReceiveCallback, Line } from '../index'

class Cable {
  subscribe(channel: string, params?: object): Promise<Line> {
    return Promise.resolve({
      close: () => Promise.resolve(),
      send: () => Promise.resolve(null),
      receive: (cb: ReceiveCallback) => {}
    })
  }
}

const cable = new Cable()

new Channel(
  // THROWS Argument of type
  42
)

export class IdChannel extends Channel<{ id: string }> {}

// THROWS Type 'number' is not assignable
new IdChannel({ id: 42 })

const ch = new Channel()

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
