# Change log

**NOTE:** This log only reflects important changes related to all packages. The version here indicates the `core` package version. For the full list of changes, please refer to the corresponding package changelogs.

## master

## 1.1.1 (2025-04-02)

- Added `reconnected` flag to Action Cable connected callback payload. ([@d4rky-pl
][])

## 1.1.0 (2025-02-19)

- Add `websocketAuthStrategy` option to `createCable` to specify how to pass a token for WebSocket connections (using a query param, a header, or a sub-protocol). ([@palkan][])

- Add `auth: {token: '...'}` option to `createCable` to pass the initial authentiation token. ([@palkan][])

- Add `transportConfigurator` parameter to `createCable` to perform arbitrary transport modifications (like, fetching the initial token) before opening a connection. ([@palkan][])

## 1.0.0 (2024-12-26)

- Add `channel.presence` API. ([@palkan][])

  See [docs](https://docs.anycable.io/edge/anycable-go/presence).

## 0.9.2 (2024-12-12)

- Add `performFailures: 'throw' | 'warn' | 'ignore'` option to `createCable()`. ([@palkan][])

## 0.9.1 (2024-07-31)

- Add `info` event to Cable and Channel. ([@palkan][])

  This event can be used to notify of some protocol-level events that happen under the hood and have no representation at the Channel API level. A example of such event is a stream history retrieval failure (`{type: "history_not_found"}`).

## 0.9.0 (2024-05-21)

- Types improvements. ([@cmdoptesc][])

- Node 18+ is required.

## 0.8.1 (2024-03-27)

- Added `channel.whisper(...)`. ([@palkan][])

  Clients can send transient publications to channels via whispering. NOTE: it must be supported by the server and enabled for the channel. See [docs](https://docs.anycable.io/edge/anycable-go/signed_streams#whispering).

## 0.8.0 (2024-03-14) 🥧

- Added AnyCable signed streams support. ([@palkan][])

  Two new methods have been added to connect to streams directly without any channels: `cable.streamFrom(name)` and `cable.streamFromSigned(signedName)`. See [signed streams docs](https://docs.anycable.io/edge/anycable-go/signed_streams).

## 0.7.12 (2024-01-08)

- Omit `undefined` in serialized channel identifiers. ([@ardecvz][])

## 0.7.7 (2023-09-21)

- Add ActionsType to `Channel` class. ([@palkan][])

  Now you can specify which actions can be _performed_ by the channel.

## 0.7.1 (2023-06-28)

- Add FallbackTransport and a new `@anycable/long-polling` package.

## 0.7.0 (2023-04-18)

- Add `actioncable-v1-ext-json` protocol support.

## 0.6.0 (2023-02-06)

- Dependencies upgrade and minor types changes.

## 0.5.0 (2022-07-21)

- `core`: **BREAKING** `channelsCache` is deprecated/removed in favour of support for using multiple channel instances for the same identifier.

Channels cache has been added as a workaround for automatically re-using the same channel instance to avoid double-subscrpition problems (since a single client may only have a single subscrpition for the specified identifier).

Not it's possible (and recommended) to create multiple channel instances, AnyCable client takes care of creating a single subscription under the hood. Each channel instance is independent, which means that, for example, calling `channel.disconnect()` removes this channels from the subscribers list and no messages are sent to this particular instance (which could lead to an unexpected behaviour when channels cache was used).

- `core`: **BREAKING** `cable.subscribe(channel)` is now **sync** and returns the passed channel itself, so you can chain the execution. The actual `subscribe` command is sent asynchrounously.

If you still want to wait for channel to be connected, you can use the new `ensureSubscribed` function:

```js
# Before
await cable.subscribe(channel)

# After
await cable.subscribe(channel).ensureSubscribed()
```

Similarly, `cable.subscribeTo(...)` is not longer async and returns the channel instance immediately. You can call `channel.ensureSubscribed()` to make sure the channel has been connected to the server.

The `channel.disconnect()` function is no longer async and has not return value. It records the **intention** to unsubscribe. The actual `unsubscribe` command is sent asynchrounously (if requried, i.e., if there are no other channel instances with the same identifier).

## 0.4.0 (2022-07-12)

- `core`: Standardize `close` and `disconnect` events and the corresponding methods to always emit/return ReasonError instances (not just DisconnectEvents). Transport errors (e.g., connection failure) are now also wrapped into `DisconnectedError` with the reason `transport_close`. You can access the original error via `error.cause` property.

- `core`: Added `closed` state to indicate that a cable or a channel was intentionally disconnected (by user or by server) without further reconnections.

Now `disconnected` always implies reconnection (which might be done by a monitor).

- `core`: Make `cable.subscribe(channel)` optimistic (i.e., wait for the cable to be connected, ignore "disconnected" state).

This makes it possible to use `await cable.subscribe(channel)` and don't care about underlying cable state (unless it's closed manually or subscription is rejected).

The `channel.disconnect()` works similarly in a sense that it considers lack of connection as success, and tries to send the `unsubscribe` command otherwise.

## 0.3.0 (2021-12-14)

- Added optional memoization to `cable.subscribeTo`. ([@palkan][])

- Added `cable.subscribeTo(channelClass, params)` support. ([@palkan][])

- Support multiple `cable.subscribe(channel)` and `cable.unsubscribe(identifier)`. ([@palkan][])

It is possible to reuse the same channel instance independently from different _components_.
Each component takes care of subscribing and unsubsribing; the actual subscription (or unsubscription) only happens once.

## 0.2.0 (2021-11-08)

- Added a cable implementation (`TestCable`) for unit testing purpose to `@anycable/core`. ([@TheSeally][])

## 0.1.1 (2021-09-29)

- Added `actioncable-v1-protobuf` support and `@anycable/protobuf-encoder` package. ([@charlie-wasp][])

## 0.1.0 (2021-09-23)

- Added `tokenRefresher` option to `createCable` to handle `token_expired` disconnections. ([@palkan][])

- Fix unhandled Promise rejection in Monitor. ([@tienle][], [@gydroperit][], [@palkan][])

[@palkan]: https://github.com/palkan
[@tienle]: https://github.com/tienle
[@gydroperit]: https://github.com/gydroperit
[@charlie-wasp]: https://github.com/charlie-wasp
[@TheSeally]: https://github.com/TheSeally
[@ardecvz]: https://github.com/ardecvz
[@cmdoptesc]: https://github.com/cmdoptesc
[@d4rky-pl]: https://github.com/d4rky-pl
