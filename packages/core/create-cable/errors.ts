import { createConsumer } from './index.js'

interface MyMessage {
  payload: {
    whatever: number
    i_want: string
  }
}

// app code
let consumer = createConsumer('ws://whatever.com')
const received = (_message: MyMessage) => {}

const receivedIncompatible = (_message: boolean) => {}

consumer.subscriptions.create('TestChannel', { received })

// THROWS Type '(_message: boolean) => void' is not assignable to type '(data: Message) => void'
consumer.subscriptions.create('TestChannel', { received: receivedIncompatible })
