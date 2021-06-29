import { Channel } from './index.js'

new Channel(
  // THROWS Argument of type
  42
)

export class IdChannel extends Channel<{ id: string }> {}

// THROWS Type 'number' is not assignable
new IdChannel({ id: 42 })
