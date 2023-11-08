# Change log

## master

- Fix subscription state tracking when recovered. ([@palkan][])

- Treat any incoming message as keepalive. ([@palkan][])

  See the corresponding [Rails PR](https://github.com/rails/rails/pull/49168).

## 0.7.9 (2023-10-13)

- Set `cable.sessionId` when using Action Cable (base) protocol. ([@palkan][])

## 0.7.8 (2023-09-21)

- Fix default ActionsType type (any). ([@palkan][])

## 0.7.7 (2023-09-21)

- Add ActionsType to `Channel` class. ([@palkan][])

  Now you can specify which actions can be _performed_ by the channel.

## 0.7.6 (2023-08-17)

- Add `concurrentSubscribes: false` option to prevent sending multiple `subscribe` commands concurrently.

## 0.7.5 (2023-08-10)

- Recognize `actioncable-v1-ext-msgpack` and `actioncable-v1-ext-protobuf` protocols.

- Fix re-subscription attempt to include history request.

## 0.7.4 (2023-08-10)

- Add PONGs support to the extended protocol and allow passing protocol options via `protocolOptions`.

## 0.7.3 (2023-08-09)

- Handle WebSocket error messages on close gracefully.

## 0.7.2 (2023-08-07)

- Remove stale WS connection event listeners on close.

## 0.7.1 (2023-06-28)

- Add FallbackTransport.

## 0.7.0 (2023-04-18)

- Add `actioncable-v1-ext-json` protocol support.

## 0.6.0 (2023-02-06)

- Dependencies upgrade and minor types changes.

## 0.5.7 (2022-08-31)

- Treat stale connection as disconnect error.

## 0.5.6 (2022-08-16)

- Reduce the number of commands when subscribe/unsubscribe is called many times on the same subscription.

New _command-locking_ mechanism prevents from `subscribe-unsubscribe-subscribe-...` cycles by dropping the unnecessary calls.
For example, calling `subscribe-unsubsribe-subscribe` would only result into a single `subscribe` command being sent to the server.

## 0.5.5 (2022-08-16)

- Fixed protocol race conditions.

Fixes [#20](https://github.com/anycable/anycable-client/issues/20).

## ~~0.5.3~~ 0.5.4 (2022-08-16)

- Add `Channel.send` function.

- Use custom object as Action Cable subscription instead of a channel instance.

That prevents from potential incompatible extensions (e.g., `graphql-ruby` sets the `closed` property thus overriding the `closed()` function).

## 0.5.2 (2022-08-16)

- Fix monitor triggering reconnect when cable was closed by user.

## 0.5.0 (2022-07-21)

- **BREAKING** `channelsCache` is deprecated/removed in favour of support for using multiple channel instances for the same identifier.

Channels cache has been added as a workaround for automatically re-using the same channel instance to avoid double-subscrpition problems (since a single client may only have a single subscrpition for the specified identifier).

Not it's possible (and recommended) to create multiple channel instances, AnyCable client takes care of creating a single subscription under the hood. Each channel instance is independent, which means that, for example, calling `channel.disconnect()` removes this channels from the subscribers list and no messages are sent to this particular instance (which could lead to an unexpected behaviour when channels cache was used).

- **BREAKING** `cable.subscribe(channel)` is now **sync** and returns the passed channel itself, so you can chain the execution. The actual `subscribe` command is sent asynchrounously.

If you still want to wait for channel to be connected, you can use the new `ensureSubscribed` function:

```js
# Before
await cable.subscribe(channel)

# After
await cable.subscribe(channel).ensureSubscribed()
```

Similarly, `cable.subscribeTo(...)` is not longer async and returns the channel instance immediately. You can call `channel.ensureSubscribed()` to make sure the channel has been connected to the server.

The `channel.disconnect()` function is no longer async and has not return value. It records the **intention** to unsubscribe. The actual `unsubscribe` command is sent asynchrounously (if requried, i.e., if there are no other channel instances with the same identifier).

## 0.4.1 (2022-07-13)

- Make token refresher is not affected by connection failures.

Previosly, we stopped handling `token_expired` errors if the reconnection attempt made by the refresher failed.

- Do not emit 'close' for channels when cable is closed.

The `close` event should indicate unsubscription (initiated by a user). When the cable is closed, subscriptions are disconnected, not closed (since they got restored if cable is connected back).

## 0.4.0 (2022-07-12)

- Standardize `close` and `disconnect` events and the corresponding methods to always emit/return ReasonError instances (not just DisconnectEvents). Transport errors (e.g., connection failure) are now also wrapped into `DisconnectedError` with the reason `transport_close`. You can access the original error via `error.cause` property.

- Added `closed` state to indicate that a cable or a channel was intentionally disconnected (by user or by server) without further reconnections.

Now `disconnected` always implies reconnection (which might be done by a monitor).

- Make `cable.subscribe(channel)` optimistic (i.e., wait for the cable to be connected, ignore "disconnected" state).

This makes it possible to use `await cable.subscribe(channel)` and don't care about underlying cable state (unless it's closed manually or subscription is rejected).

The `channel.disconnect()` works similarly in a sense that it considers lack of connection as success, and tries to send the `unsubscribe` command otherwise.

## 0.3.5 (2022-07-02)

- Prevent unsubscribe/subscribe race conditions. ([@palkan][])

Since Action Cable protocol doesn't support `unsubscribe` acks, we need to hack around to make sure subsequent `subscribe` commands arrived at the server after the previous `unsubscribe` has been processed.

## 0.3.4 (2022-06-03)

- Add WebSocket options (e.g., headers) support. ([@palkan][])

## 0.3.3 (2022-05-24)

- Fixed channels caching for anonymous channels. ([@palkan][])

## 0.3.1 (2022-01-26)

- Fixed subscriptions cache by switching to a WeakMap. ([@palkan][], [@lokkirill][])

## 0.3.0 (2021-12-14)

- Added optional memoization to `cable.subscribeTo`. ([@palkan][])

- Added `cable.subscribeTo(channelClass, params)` support. ([@palkan][])

- Support multiple `cable.subscribe(channel)` and `cable.unsubscribe(identifier)`. ([@palkan][])

It is possible to reuse the same channel instance independently from different _components_.
Each component takes care of subscribing and unsubsribing; the actual subscription (or unsubscription) only happens once.

## 0.2.0 (2021-11-08)

- Added a cable implementation (`TestCable`) for unit testing purpose to `@anycable/core`. ([@TheSeally][])

## 0.1.0 (2021-09-23)

- Added `tokenRefresher` option to `createCable` to handle `token_expired` disconnections. ([@palkan][])

- Fix unhandled Promise rejection in Monitor. ([@tienle][], [@gydroperit][], [@palkan][])

[@palkan]: https://github.com/palkan
[@tienle]: https://github.com/tienle
[@gydroperit]: https://github.com/gydroperit
[@TheSeally]: https://github.com/TheSeally
[@lokkirill]: https://github.com/lokkirill
