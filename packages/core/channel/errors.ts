import { Channel, Message, MessageMeta, ChannelEvents } from '../index'

class Cable {
  unsubscribe(id: string): Promise<void> {
    return Promise.resolve()
  }

  perform(
    id: string,
    action: string,
    payload: object
  ): Promise<[Message, MessageMeta] | void> {
    return Promise.resolve()
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

// THROWS Expected 1 arguments, but got 0
new IdChannel()

const ch = new Channel()

// THROWS Argument of type
ch.on('connect', (event: object) => {
  event
})

// THROWS Argument of type
ch.on('disconnect', (event: string) => {
  event
})

// THROWS Argument of type
ch.on('message', (msg: object, meta: object) => {
  meta
})

// THROWS Argument of type '"data"' is not assignable to parameter of type 'keyof ChannelEvents<Message>'
ch.on('data', (msg: object) => true)

interface CustomEvents extends ChannelEvents<{ tupe: number }> {
  custom: () => void
}

// THROWS Type 'CustomEvents' does not satisfy the constraint 'ChannelEvents<{ type: string; }>'
export class TypedChannel extends Channel<{}, { type: string }, CustomEvents> {}

export class AnotherTypedChannel extends Channel<
  {},
  { tupe: number },
  CustomEvents
> {
  trigger() {
    this.emit('custom')
    // THROWS Argument of type
    this.emit('kustom')
  }
}
