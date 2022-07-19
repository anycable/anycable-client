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
- [Testability](#testing)
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
cable.subscribe(channel)

// Wait for subscription confirmation or rejection
await channel.subscribed()

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

**IMPORTANT:** `cable.subscribe(channel)` is optimistic: it doesn't require the cable to be connected, and waits for it to connect before performing a subscription request. Even if the cable got disconnected before subscription was confirmed or rejected, a new attempt is made as soon as the connectivity restored.

Calling `channel.disconnect()` removes the _subscription_ for this channel right away and send `unsubscribe` request asynchrounously; if there is no connectivity, we asume that the server takes care of peforming unsubscribe tasks, so we don't need to retry them.

#### Headless subscriptions

_Headless_ subscriptions are very similar to Action Cable client-side subscriptions except from the fact that no mixins are allowed (you classes in case you need them).

Let's rewrite the same example using headless subscriptions:

```js
import cable from 'cable'

const subscription = await cable.subscribeTo('ChatChannel', { roomId: '42' })

const _ = await subscription.perform('speak', { msg: 'Hello' })

subscription.on('message', msg => {
  if (msg.type === 'typing') {
    console.log(`User ${msg.name} is typing`)
  } else {
    console.log(`${msg.name}: ${msg.text}`)
  }
})
```

#### Action Cable compatibility mode

We provide an Action Cable compatible APIs for smoother migrations.

All you need is to change the imports:

```diff
- import { createConsumer } from "@rails/actioncable";
+ import { createConsumer } from "@anycable/web";

 // createConsumer accepts all the options available to createCable
 export default createConsumer();
```

Then you can use `consumer.subscriptions.create` as before (under the hood a headless channel would be create).

### Lifecycle events

Both cables and channels allow you to subscribe to various lifecycle events for better observability.

Learn more from the dedicated [documentation](./docs/lifecycle.md).

### Handling connection failures, or automatic reconnects

AnyCable client provides automatic reconnection on network failure out-of-the-box. Under the hood, it uses the exponential backoff with jitter algorithm to make reconnection attempts non-deterministic (and, thus, prevent thundering herd attacks on the server). You can read more about it in the [blog post](https://evilmartians.com/chronicles/introducing-anycable-javascript-and-typescript-client#connect-reconnect-and-a-bit-of-mathematica).

The component responsible for reconnection is called _Monitor_, and it's created automatically, if you use the `createCable` (or `createConsumer`) function.

Sometimes it might be useful to disable reconnection. In that case, you MUST pass the `monitor: false` to the `createCable` function:

```js
cable = createCable({monitor: false})
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

By default, when you call `createCable()` we use the `actioncable-v1-json` protocol (supported by Action Cable).

You can also use Msgpack and Protobuf (_soon_) protocols supported by [AnyCable Pro][pro]:

```js
// cable.js
import { createCable } from '@anycable/web'
import { MsgpackEncoder } from '@anycable/msgpack-encoder'

export default createCable({protocol: 'actioncable-v1-msgpack', encoder: new MsgpackEncoder()})

// or for protobuf
import { createCable } from '@anycable/web'
import { ProtobufEncoder } from '@anycable/protobuf-encoder'

export default createCable({protocol: 'actioncable-v1-protobuf', encoder: new ProtobufEncoder()})
```

**NOTE:** You MUST install the corresponding encoder package yourself, e.g., `yarn add @anycable/msgpack-encoder` or `yarn add @anycable/protobuf-encoder`.

### Refreshing authentication tokens

If you use a token-based authentication with expirable tokens (e.g., like [AnyCable PRO JWT identification](https://docs.anycable.io/anycable-go/jwt_identification)), you need a mechanism to refresh tokens for a long-lived clients (to let them reconnect in case of a connection failure).

AnyCable client can help you to make this process as simple as possible: just provide a function, which could retrieve a new token and update the connection url. AnyCable will take care of everything else (tracking expiration and reconnecting). Here is an example:

```js
// cable.js
import { createCable } from '@anycable/web'

export default createCable({
  tokenRefresher: async transport => {
    let response = await fetch('/token.json')
    let data = await response.json()

    // Update URL for the underlying transport
    transport.setURL('ws://example.com/cable?token=' + data['token'])
  }
})
```

For browser usage, we provide a built-in helper method, which allows you to extract a new connection URL from an HTML page (requested via `fetch`):

```js
// cable.js
import { createCable, fetchTokenFromHTML } from '@anycable/web'

// By default, the current page is loaded in the background,
// and the action-cable-url (or cable-url) meta tag is used to update
// the connection url
export default createCable({tokenRefresher: fetchTokenFromHTML()})

// You can also specify an alternative URL
export default createCable({
  tokenRefresher: fetchTokenFromHTML({ url: '/custom-token-refresh-endpoint' })
})
```

**NOTE:** the `tokenRefresher` only activates when a server sends a disconnection message with reason `token_expired` (i.e., `{"type":"disconnect","reason":"token_expired","reconnect":false}`).

**NODE:** the `fetchTokenFromHTML` performs an HTTP request with a specific header attached (`X-ANYCABLE-OPERATION=token-refresh`), which you could use to minimize the amount of HTML to return in response.

### Hotwire (Turbo Streams) support

To use AnyCable client with [Turbo Streams][turbo-streams], we provide a tiny plugin—`@anycable/turbo-stream`. It allows you to configure a Cable instance yourself to use with Turbo Stream source elements:

```js
import { start } from "@anycable/turbo-stream"
import cable from "cable"
// Explicitly activate stream source elements
start(cable)
```

Read more in the package's [Readme](./packages/turbo-stream/README.md).

### Testing

For testing your channel you can use test cable implementation from `@anycable/core/testing`.

By using test cable implementation you can test channel's output actions. All actions store in cable `outgoing` property.
Also test implementation helps to test channel `disconnect` event.

For example we have the following channel implementation.

```js
import { Channel } from "@anycable/core";

class ChatChannel extends Channel {
  static identifier = "ChatChannel";

  async speak(message) {
    return this.perform("speak", { message });
  }

  async leave() {
    // some custom logic
    return this.disconnect();
  }
}
```

We can test it like this (using `Jest`):

```js
import { Channel } from './channel.js'
import { TestCable } from '@anycable/core/testing'

describe('ChatChannel', () => {
  let channel: Channel
  let cable: TestCable

  beforeEach(() => {
    cable = new TestCable()
    channel = new Channel()
    cable.subscribe(channel)
  })

  it('perform an speak action', async () => {
    await channel.speak('hello')
    await channel.speak('bye')

    expect(cable.outgoing).toEqual([
      { action: 'speak', payload: { message: 'hello' } },
      { action: 'speak', payload: { message: 'bye' } }
    ])
  })

  it('disconnects when leave', async () => {
    await channel.leave()

    expect(channel.state).toEqual('closed')
  })
})
```

### Babel/Browserlist configuration

This library uses ECMAScript 6 features (such as native classes), and thus, is not compatible with ES5 (for example, IE11 is not supported out-of-the-box).

You should either configure Babel to transform the lib's source code or do not compile into ES5 (that could be done by specifying the following Browserlist query: `["defaults", "not IE 11"]`).

## Usage: Node.js

Currently, we do not provide a dedicated Node.js package. You can use `@anycable/core` with Node.js:

```js
// WebSocket implementation compatible with the web WebSocket API is required
import WebSocket from 'ws'
import { createCable } from '@anycable/core'

// NOTE: Passing url is required
let cable = createCable(url, {
  websocketImplementation: WebSocket
})

// You can also pass additional connections options,
// supported by ws via the websocketOptions
let cableWithHeader = createCable(url, {
  websocketImplementation: WebSocket,
  websocketOptions: { headers: { 'x-token': 'secret' }}
})
```

**IMPORTANT:** We use ES modules, hence setting `NODE_OPTIONS='--experimental-vm-modules'` is currently required.

See also `examples/benchmark_channel.js`.

## Usage: React Native

Currently, we do not provide a dedicated React Native package. You can use `@anycable/core` just like with Node.js:

```js
import { createCable } from '@anycable/core'

// NOTE: Passing url is required
let cable = createCable(url)

// You can also pass additional connections options,
// such as headers, via the websocketOptions
let cableWithHeader = createCable(url, {
  websocketOptions: { headers: { 'x-token': 'secret' }}
})
```

## Duplicating or reusing channel instances?

It is safe to call `cable.subscribe(channel)` multiple times—only a single subscription (from the protocol point of view) is made, i.e., this action is idempotent. At the same time, it's safe to have multuple channel instances with the same identifiers client-side—only a single _real_ subscription would be made.

Let's consider an example. Suppose you have two _components_ relying on the same channel:

```js
// component-one.js
import cable from 'cable'
import { NotificationsChannel } from 'channels/notifications_channel'

// Build an instance of a NotificationChannel class.
const channel = new NotificationChannel()

// Subscribe to the server channel via the client.
cable.subscribe(channel)

channel.on('message', msg => console.log("component one received message", `${msg.name}: ${msg.text}`))

// component-two.js
import cable from 'cable'
import { NotificationsChannel } from 'channels/notifications_channel'

// Build an instance of a NotificationChannel class.
const channel = new NotificationChannel()

// Subscribe to the server channel via the client.
cable.subscribe(channel)

channel.on('message', msg => console.log("component two received message", `${msg.name}: ${msg.text}`))
```

The code above would work as expected: both channel instances would receive updates from the server. Calling `channel.disconnect()` would detach this particular channel from the cable, but wouldn't perform the actual `unsubscribe` command (from the server perspective) unless that's the last channel with this identifier.

Alternatively, you may consider extracting a channel instance to a separate module and reuse it:

```js
// channels/notifications_channel.js
import { Channel } from '@anycable/core'
import 'cable' from 'cable'

export class NotificationsChannel extends Channel {
  // ...
}

let instance

export function createChannel() {
  if (!instance) {
    instance = new NotificationChannel()
    cable.subscribe(channel)
  }

  return instance
}

// component-one.js
import cable from 'cable'
import { createChannel } from 'channels/notifications_channel'

const channel = createChannel()

channel.on('message', msg => console.log("component one received message", `${msg.name}: ${msg.text}`))

// component-two.js
import cable from 'cable'
import { createChannel } from 'channels/notifications_channel'

const channel = createChannel()

channel.on('message', msg => console.log("component two received message", `${msg.name}: ${msg.text}`))
```

Which way to choose is up to the developer. From the library point of view, both are viable and supported.

## Further reading

- [Architecture](./docs/architecture.md)

[anycable]: https://anycable.io
[protocol]: https://docs.anycable.io/misc/action_cable_protocol
[pro]: https://anycable.io/#pro
[turbo-streams]: https://turbo.hotwired.dev/reference/streams
