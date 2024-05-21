# Change log

## master

## 0.6.0

- Require `@anycable/core` ^0.9.0.

## 0.5.0

- Require `@anycable/core` ^0.8.0.

- Only define custom element if it doesn't exist. ([@omarluq][])

## 0.4.0

- Add `requestSocketIDHeader` option to automatically add `X-Socket-ID` header with the current session ID to Turbo requests. ([@palkan][])

## 0.3.1 (2023-02-15)

- Add `connected` state to stream source element. ([@palkan][])

Backport of [turbo-rails#430](https://github.com/hotwired/turbo-rails/pull/430).

## 0.3.0 (2023-02-06)

- Upgrade to `@anycable/web` v0.6.0.

## 0.1.0 (2022-07-14)

- Major refactoring: use channel classes (allow custom), ignore Turbo cached pages, avoid waiting for subscribe (to unsubscribe on element disconnect). ([@palkan][])

[@palkan]: https://github.com/palkan
[@omarluq]: https://github.com/omarluq
