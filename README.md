[![npm version](https://badge.fury.io/js/%40anycable%2Fcore.svg)](https://badge.fury.io/js/%40anycable%2Fcore)
[![Test](https://github.com/anycable/anycable-client/workflows/Test/badge.svg)](https://github.com/anycable/anycable-client/actions)

# AnyCable JavaScript Client

[AnyCable][anycable] brings performance and scalability to real-time applications built with Ruby and Rails. It uses [Action Cable protocol][protocol] and its extensions for client-server communication.

This repository contains JavaScript packages to build AnyCable clients.

## Motivation

There are multiple reasons that forced us to implement an alternative client library for Action Cable / AnyCable:

- [AnyCable Pro][pro] features support (e.g., binary formats).
- Multi-platform out-of-the-box (web, workers, React Native).
- TypeScript support.
- Revisited client-side APIs.
- Future protocol extensions/modifications support.

## Usage: Web

> See the [demo application](https://github.com/anycable/anycable_rails_demo/pull/21) using AnyCable web client

### Install

```sh
npm install @anycable/web

# or

yarn add @anycable/web
```

### Initialization

First, you need to create a _client_ (or _consumer_ as it's called in Action Cable):

```js
// cable.js
import { createCable } from '@anycable/web'

export default createCable()
```

By default, the connection URL is looked up in meta tags (`action-cable-url` or `cable-url`), and if none found, fallbacks to `/cable`. You can also specify the URL explicitly:

```js
createCable('ws://cable.example.com/my_cable')
```

### Channels

AnyCable client provide multiple ways to subscribe to channels: class-based subscriptions and _headless_ subscriptions.

#### Class-based subscriptions

Class-based APIs allows provides an abstraction layer to hide implementation details of subscriptions.
You can add additional API methods, dispatch custom events, etc.

Let's consider an example:

```js
import { Channel } from '@anycable/web'

// channels/chat.js
export default class ChatChannel extends Channel {
  // Unique channel identifier (channel class for Action Cable)
  static identifier = 'ChatChannel'

  async speak(message) {
    return this.perform('speak', { message })
  }

  receive(message) {
    if (message.type === 'typing') {
      // Emit custom event when message type is 'typing'
      return this.emit('typing', message)
    }

    // Fallback to the default behaviour
    super.receive(message)
  }
}
```

```js
import cable from 'cable'
import { ChatChannel } from 'channels/chat'

// Build an instance of a ChatChannel class.
const channel = new ChatChannel({ roomId: '42' })

// Subscribe to the server channel via the client.
await cable.subscribe(channel)

// Perform an action
// NOTE: Action Cable doesn't implement a full-featured RPC with ACK messages,
// so return value is always undefined
let _ = await channel.speak('Hello')

// Handle incoming messages
channel.on('message', msg => console.log(`${msg.name}: ${msg.text}`))

// Handle custom typing messages
channel.on('typing', msg => console.log(`User ${msg.name} is typing`))

// Or subscription close events
channel.on('close', () => console.log('Disconnected from chat'))

// Or temporary disconnect
channel.on('disconnect', () => console.log('No chat connection'))

// Unsubscribe from the channel (results in a 'close' event)
channel.disconnect()
```

#### Headless subscriptions

_⏳ Coming soon_

_Headless_ subscriptions are very similar to Action Cable client-side subscriptions except from the fact that no mixins are allowed (you classes in case you need them).

Let's rewrite the same example using headless subscriptions:

```js
import cable from 'cable'

const subscription = await cable.subscribeTo('ChatChannel', { roomId: '42' })

const _ = await channel.perform('speak', { msg: 'Hello' })

channel.on('message', msg => {
  if (msg.type === 'typing') {
    console.log(`User ${msg.name} is typing`)
  } else {
    console.log(`${msg.name}: ${msg.text}`)
  }
})
```

### TypeScript support

You can make your channels more strict by adding type constraints for parameters, incoming message types and custom events:

```ts
// ChatChannel.ts
import { Channel, ChannelEvents } from '@anycable/web'

type Params = {
  roomId: string | number
}

type TypingMessage = {
  type: 'typing'
  username: string
}

type ChatMessage = {
  type: 'message'
  username: string
  userId: string
}

type Message = TypingMessage | ChatMessage

interface Events extends ChannelEvents<Message> {
  typing: (msg: TypingMessage) => void
}

export class ChatChannel extends Channel<Params,Message,Events> {
  static identifier = 'ChatChannel'

  receive(message: Message) {
    if (message.type === 'typing') {
      return this.emit('typing', message)
    }

    super.receive(message)
  }
}
```

Now this typings information would help you to provide params or subscribe to events:

```ts
let channel: ChatChannel

channel = new ChatChannel({roomId: '2021'}) //=> OK

channel = new ChatChannel({room_id: '2021'}) //=> NOT OK: incorrect params key
channel = new ChatChannel() //=> NOT OK: missing params

channel.on('typing', (msg: TypingMessage) => {}) //=> OK

channel.on('typing', (msg: string) => {}) //=> NOT OK: 'msg' type mismatch
channel.on('types', (msg: TypingMessage) => {}) //=> NOT OK: unknown event
```

### Supported protocols

_⏳ Coming soon_

By default, when you call `createCable()` we use the `actioncable-v1-json` protocol (supported by Action Cable).

You can also use Msgpack and Protobuf protocols supported by [AnyCable Pro][pro]:

```js
// cable.js
import { createCable, MsgpackEncoder } from '@anycable/web'

export default createCable({protocol: 'actioncable-v1-msgpack', encoder: new MsgpackEncoder()})

// or for protobuf
import { createCable, ProtobufEncoder } from '@anycable/web'

export default createCable({protocol: 'actioncable-v1-protobuf', encoder: new ProtobufEncoder()})
```

### Testing

TBD

### Babel/Browserlist configuration

This library uses ECMAScript 6 features (such as native classes), and thus, is not compatible with ES5 (for example, IE11 is not supported out-of-the-box).

You should either configure Babel to transform the lib's source code or do not compile into ES5 (that could be done by specifying the following Browserlist query: `["defaults", "not IE 11"]`).

[anycable]: https://anycable.io
[protocol]: https://docs.anycable.io/misc/action_cable_protocol
[pro]: https://anycable.io/#pro
