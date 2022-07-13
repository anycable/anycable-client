# Change log

## master

- `core`: Make token refresher is not affected by connection failures.

Previosly, we stopped handling `token_expired` errors if the reconnection attempt made by the refresher failed.

- `core`: Do not emit 'close' for channels when cable is closed.

The `close` event should indicate unsubscription (initiated by a user). When the cable is closed, subscriptions are disconnected, not closed (since they got restored if cable is connected back).

## 0.4.0 (2022-07-12)

- `core`: Standardize `close` and `disconnect` events and the corresponding methods to always emit/return ReasonError instances (not just DisconnectEvents). Transport errors (e.g., connection failure) are now also wrapped into `DisconnectedError` with the reason `transport_close`. You can access the original error via `error.cause` property.

- `core`: Added `closed` state to indicate that a cable or a channel was intentionally disconnected (by user or by server) without further reconnections.

Now `disconnected` always implies reconnection (which might be done by a monitor).

- `core`: Make `cable.subscribe(channel)` optimistic (i.e., wait for the cable to be connected, ignore "disconnected" state).

This makes it possible to use `await cable.subscribe(channel)` and don't care about underlying cable state (unless it's closed manually or subscription is rejected).

The `channel.disconnect()` works similarly in a sense that it considers lack of connection as success, and tries to send the `unsubscribe` command otherwise.

## 0.3.5 (2022-07-02)

- `core`: Prevent unsubscribe/subscribe race conditions. ([@palkan][])

Since Action Cable protocol doesn't support `unsubscribe` acks, we need to hack around to make sure subsequent `subscribe` commands arrived at the server after the previous `unsubscribe` has been processed.

## 0.3.4 (2022-06-03)

- `core`: Add WebSocket options (e.g., headers) support. ([@palkan][])

## 0.3.3 (2022-05-24)

- `core`: Fixed channels caching for anonymous channels. ([@palkan][])

## 0.3.2 (2022-01-26)

- `web`: Fixed generating URL from meta tags when value includes only the path (e.g., `/cable`). ([@palkan][])

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

## 0.1.1 (2021-09-29)

- Added `actioncable-v1-protobuf` support and `@anycable/protobuf-encoder` package. ([@charlie-wasp][])

## 0.1.0 (2021-09-23)

- Added `tokenRefresher` option to `createCable` to handle `token_expired` disconnections. ([@palkan][])

- `core`: Fix unhandled Promise rejection in Monitor. ([@tienle][], [@gydroperit][], [@palkan][])

[@palkan]: https://github.com/palkan
[@tienle]: https://github.com/tienle
[@gydroperit]: https://github.com/gydroperit
[@charlie-wasp]: https://github.com/charlie-wasp
[@TheSeally]: https://github.com/TheSeally
[@lokkirill]: https://github.com/lokkirill
