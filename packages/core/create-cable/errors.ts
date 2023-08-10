import { ActionCableExtendedProtocol } from '../action_cable_ext/index.js'
import { CreateOptions, createCable, createConsumer } from './index.js'

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

const options: Partial<CreateOptions<'actioncable-v1-json'>> = {
  protocol: 'actioncable-v1-json',
  // THROWS Type '{ pongs: true; }' is not assignable
  protocolOptions: { pongs: true }
}

const options2: Partial<CreateOptions<ActionCableExtendedProtocol>> = {
  protocol: new ActionCableExtendedProtocol(),
  // THROWS Type '{ pongs: true; }' is not assignable to type 'undefined'.
  protocolOptions: { pongs: true }
}

const extOptions: Partial<CreateOptions<'actioncable-v1-ext-json'>> = {
  protocol: 'actioncable-v1-ext-json',
  protocolOptions: { pongs: true, historyTimestamp: false }
}

createCable('ws://whatever.com', options)
