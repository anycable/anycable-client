# Change log

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
