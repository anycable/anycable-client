[![Test](https://github.com/anycable/anycable-client/workflows/Test/badge.svg)](https://github.com/anycable/anycable-client/actions)

# AnyCable JavaScript Client

[AnyCable][anycable] brings performance and scalability to real-time applications built with Ruby and Rails. It uses [Action Cable protocol][protocol] and its extensions for client-server communication.

This repository contains JavaScript packages to build AnyCable clients.

## Motivation

There are multiple reasons that forced us to implement an alternative client library for Action Cable / AnyCable:

- [AnyCable Pro][pro] features support (e.g., binary formats).
- Multi-platform out-of-the-box (web, workers, React Native).
- Future protocol extensions/modifications support.
- Revisited client-side APIs.

## Installation

TBD

## Usage

### Initialization

First, you need to create a _client_ (or _consumer_ as it's called in Action Cable):

```js
// anycable.js
import { createClient } from 'anycable'

export default createClient()
```

By default, the connection URL is looked up in meta tags (`action-cable-url` or `cable-url`), and if none found, fallbacks to `/cable`. You can also specify the URL explicitly:

```js
createClient('ws://cable.example.com/my_cable')
```

### Channels

AnyCable client provide multiple ways to subscribe to channels: class-based subscriptions and _headless_ subscriptions.

#### Class-based subscriptions

Class-based APIs allows provides an abstraction layer to hide implementaion details of subscriptions.
You can add additional API methods, dispatch custom events, etc.

Let's consider an example:

```js
// channels/chat.js
export default class ChatChannel {
  // Unique channel identifier (channel class for Action Cable)
  static identifier = 'ChatChannel'

  async speak(message) {
    return this.perform('speak', { message })
  }

  handleIncoming(message) {
    if (message.type === 'typing') {
      // Emit custom event when message type is 'typing'
      return this.emit('typing', message)
    }

    super.handleIncoming(message)
  }
}
```

```js
import client from 'anycable'
import { ChatChannel } from 'channels/chat'

// Build an instance of a ChatChannel class.
const channel = new ChatChannel({ roomId: '42' })

// Subscribe to the server channel via the client.
await channel.connect(client)

// Perform an action
// NOTE: Action Cable doesn't implement a full-featured RPC with ACK messages,
// so return value is always undefined
const _ = await channel.speak('Hello')

// Handle incoming messages
channel.on('data', msg => console.log(`${msg.name}: ${msg.text}`))

// Handle custom typing messages
channel.on('typing', msg => console.log(`User ${msg.name} is typing`))

// Or subscription close events
channel.on('stop', () => console.log('Disconnected from chat'))

// Unsubscribe from the channel
channel.disconnect()
```

_TBD (testing class-based channels with a mock client)_

#### Headless subscriptions

_Headless_ subscriptions are very similar to Action Cable client-side subsriptions except from the fact that no mixins are allowed (you classes in case you need them).

Let's rewrite the same example using headless subscriptions:

```js
import client from 'anycable'

const subscription = await client.subscribeTo('ChatChannel', { roomId: '42' })

const _ = await channel.perform('speak', { msg: 'Hello' })

channel.on('data', msg => {
  if (msg.type === 'typing') {
    console.log(`User ${msg.name} is typing`)
  } else {
    console.log(`${msg.name}: ${msg.text}`)
  }
})
```

[anycable]: https://anycable.io
[protocol]: https://docs.anycable.io/misc/action_cable_protocol
[pro]: https://anycable.io/#pro
