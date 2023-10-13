# Change log

## master

- Add `requestSocketIDHeader` option to automatically add `X-Socket-ID` header with the current session ID to Turbo requests. ([@palkan][])

## 0.3.1 (2023-02-15)

- Add `connected` state to stream source element. ([@palkan][])

Backport of [turbo-rails#430](https://github.com/hotwired/turbo-rails/pull/430).

## 0.3.0 (2023-02-06)

- Upgrade to `@anycable/web` v0.6.0.

## 0.1.0 (2022-07-14)

- Major refactoring: use channel classes (allow custom), ignore Turbo cached pages, avoid waiting for subscribe (to unsubscribe on element disconnect). ([@palkan][])

[@palkan]: https://github.com/palkan
