# Change log

## master

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
