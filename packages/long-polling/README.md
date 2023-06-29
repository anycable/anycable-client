[![npm version](https://badge.fury.io/js/%40anycable%2Flong-polling.svg)](https://badge.fury.io/js/%40anycable%2Flong-polling)

# AnyCable Long Polling Transport

This package provides a long polling transport implementation for AnyCable.

Why long-polling in 202x? Even though WebSockets are widely supported, they still can be blocked by corporate firewalls and proxies. Long polling is a simplest alternative for such cases.

**NOTE**: Server-side long-polling support is a part of AnyCable PRO.

## Usage

Long polling is consisered to be a fallback transport, so you need to configure it as follows:

```js
import { createCable } from '@anycable/web'
import { LongPollingTransport } from '@anycable/long-polling'

// Create a transport object and pass the URL to the AnyCable server's long polling endpoint
const lp = new LongPollingTransport('http://my.anycable.host/lp')

// Pass the transport to the createCable or createConsumer function via the `fallbacks` option
export default createCable({fallbacks: [lp]})
```

### Using long polling as a primary transport

You can use long polling as a primary transport by specifying it via the `transport` option:

```js
import { createCable } from '@anycable/web'
import { LongPollingTransport } from '@anycable/long-polling'

const transport = new LongPollingTransport('http://my.anycable.host/lp')

export default createCable({transport})
```

### Available options

You can pass the following options to the `LongPollingTransport` constructor (all options are optional, defaults are shown below):

```js
new LongPollingTransport(
  url,
  {
    cooldownPeriod: 500, // For how long (in ms) to wait before sending a new request
    sendBuffer: 500, // For how long to buffer outgoing commands (in ms) before sending them to the server
    pingInterval: 30000, // How often (in ms) to emit emulated ping messages (to make connection monitor think that the connection is alive)
    credentials: 'same-origin', // Underlying fetch credentials
    fetchImplementation: fetch, // A fetch-compatible implementation (e.g. node-fetch)
  }
)
```

**IMPORTANT:** When using `headers` as authentication method, we omit client's credentials when performing HTTP requests (`credential: "omit"` in `fetch`). When using `cookies`, we send cookies with the request (using `credentials: "include"` configuration). Keep this in mind if your clients authentication relies on cookies.

## Legacy browsers support

This package uses [fetch](https://developer.mozilla.org/en-US/docs/Web/API/fetch) to perform requests and [AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) to cancel in-flight requests when necessary. Both APIs are not supported in legacy browsers (e.g., Internet Explorer). You must configure polyfills for them yourself. We recommend using [whatwg-fetch](https://github.com/github/fetch) and [abortcontroller-polyfill](https://github.com/mo/abortcontroller-polyfill) packages.

See also [anycable-browser-playground](https://github.com/anycable/anycable-browser-playground) project for a working example.
