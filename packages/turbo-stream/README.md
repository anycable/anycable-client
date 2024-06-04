[![npm version](https://badge.fury.io/js/%40anycable%2Fturbo-stream.svg)](https://badge.fury.io/js/%40anycable%2Fturbo-stream)

# AnyCable Turbo Streams

This package provides AnyCable client integration for [Turbo Streams][turbo-streams].

The default `@hotwired/turbo-rails` package doesn't allow you to replace the default Action Cable client with a custom consumer implementation.

> 🎥 You can learn more about the motivation behind the custom Turbo Streams integration from the AnyCasts episode ["Using anycable-client to auto-refresh tokens"](https://anycable.io/blog/anycasts-using-anycable-client/)

**NOTE:** Make sure you're not importing `@hotwired/turbo-rails` or use a custom tag name: Hotwire's package registers the custom element implicitly and it's not possible to override it.

## Usage

Assuming that you have a `cable` instance defined somewhere, to activate Turbo Streams elements you need to add the following code:

```js
import { start } from "@anycable/turbo-stream"
// This is your cable instance
import cable from "cable"
// Explicitly activate stream source elements
start(cable)
```

This approach let you control when (and how) to start streaming from the `<turbo-cable-stream-source>` HTML elements.

**No server-side changes required**. We support all standard functionality: passing a custom channel class and subscription params.

## Compatibility with `@hotwired/turbo-rails`

Our integration aims to be API compatible with the official packages, which means, HTML elements and their attributes are recognized and interpreted the same way as with `@hotwired/turbo-rails`.

One subtle but important difference is that **`@anycable/turbo-stream` does not activate stream elements added to temporary Turbo cache pages**. This way we avoid unnecessary subscriptions/unsubscriptions and potential race conditions.

## Advanced configuration

### Delayed unsubscribe

When using Turbo Drive for navigation, it's common to have a stream source element attached to the same stream to appear in both old and new HTML. In order to avoid re-subscription to the underlying stream, we can keep the subscription during navigation by postponing the `unsubscribe` call (or more precisely, `channel.disconnect()`). Thus, we can avoid unnecessary Action Cable commands and avoid losing messages arrived in-between resubscription. You must opt-in to use this features:

```js
import { start } from "@anycable/turbo-stream"
import cable from "cable"

start(cable, { delayedUnsubscribe: true }) // default is 300ms

start(cable, { delayedUnsubscribe: 1000 }) // Custom number of milliseconds
```

### Attaching `X-Socket-ID` header to Turbo requests

You can automatically add a header to all Turbo requests with the current socket session ID. This can be used to perform **broadcasts to others** (see [Rails integration docs](https://docs.anycable.io/rails/getting_started?id=action-cable-extensions)):

```js
import { start } from "@anycable/turbo-stream"
import cable from "cable"

start(cable, { requestSocketIDHeader: true })

// You can also specify a custom header name
// start(cable, { requestSocketIDHeader: 'X-My-Socket-ID' })
```

### Custom channel classes

You define a custom JS channel class for Turbo Streams subscriptions:

```js
import { TurboChannel } from "@anycable/turbo-stream"

class CustomTurboChannel extends TurboChannel {
  // Constructor receives the current HTML element (turbo-cable-stream-source),
  // a channel name (Turbo::StreamsChannel) by default and subscription params
  constructor(element, channelName, params) {
    // You can override the server-side channel name
    super(element, 'MyTurboChannel', params)
    // Additional state configuration goes here
    this.totalActions = 0
  }

  // You can override receive function to intercept actions
  receive(message) {
    this.totalActions++

    // Ignore every second message
    if (this.totalActions % 2 === 0) return

    // Fallback to the default behaviour,
    // which sends the action to Turbo
    super.receive(message)
  }
}
```

Another example is a channel which logs all the actions before executing them:

```js
class LogChannel extends TurboChannel {
  receive(message) {
    console.log("TURBO ACTION", message)
    super.receive(message)
  }
}

start(cable, {channelClass: LogChannel})
```

### Custom tags

You can use a custom tag name for Turbo Streams source elements. One use case is to use different JS channels for different tags:

```js
// Assuming you have some special channel class
import { TurboPresenceChannel } from './channel.js'
import { start } from "@anycable/turbo-stream"

import cable from "cable"

// Default behaviour
start(cable)

// Custom behaviour
start(cable, { tagName: 'turbo-presence-source', channelClass: TurboPresenceChannel })
```

**NOTE:** You need to create a custom Rails helper to render custom elements. For example:

```ruby
def turbo_presence_stream_from(*streamables, **attributes)
  attributes[:channel] = attributes[:channel]&.to_s || "Turbo::StreamsChannel"
  attributes[:"signed-stream-name"] = Turbo::StreamsChannel.signed_stream_name(streamables)

  tag.turbo_presence_source(**attributes)
end
```

[turbo-streams]: https://turbo.hotwired.dev/reference/streams
