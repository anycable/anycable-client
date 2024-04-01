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
ch.on('connect', (event: { restore: boolean }) => {
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

interface ChannelActions {
  sendMessage: (data: { message: string }) => void
  ping: () => void
}

export class AnotherTypedChannel extends Channel<
  {},
  { tupe: number },
  CustomEvents,
  ChannelActions
> {
  trigger() {
    this.emit('custom')
    // THROWS Argument of type
    this.emit('kustom')

    // Should not throw
    this.perform('sendMessage', { message: 'hello' })

    this.perform('ping')

    // THROWS Type 'number' is not assignable to type 'string'
    this.perform('sendMessage', { message: 42 })

    // THROWS Argument of type
    this.perform('newMessage', { message: 'hello' })

    // THROWS Expected 1 arguments, but got 2
    this.perform('ping', { time: 42 })
  }
}

let che: Channel
che = new AnotherTypedChannel()

export class WhisperingChannel extends Channel<
  {},
  { event: 'typing' | 'cursor'; payload: any }
> {}

let wch = new WhisperingChannel()
wch.whisper({ event: 'cursor', payload: { x: 1, y: 2 } })

// THROWS Argument of type
wch.whisper('hello')

// THROWS Type '"greeting"' is not assignable
wch.whisper({ event: 'greeting', payload: 'hello' })
