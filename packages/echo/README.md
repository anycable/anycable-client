[![npm version](https://badge.fury.io/js/%40anycable%2Fecho.svg)](https://badge.fury.io/js/%40anycable%2Fecho)

# AnyCable Echo

AnyCable adapter for [Laravel Echo][].

## Usage

Configure your global Echo object as follows to use AnyCable _cable_ instance under the hood. The minimal configuration is as follows:

```js
import { EchoCable } from '@anycable/echo';

window.Echo = new Echo({
  broadcaster: EchoCable
});
```

By default, AnyCable looks up a connection URL in the `<meta name="cable-url">` tag. You can also provide the URL explicitily as well as other options supported by AnyCable:

```js
import { EchoCable } from '@anycable/echo';

window.Echo = new Echo({
  broadcaster: EchoCable,
  // AnyCable client configuration
  cableOptions: {
    url: "ws://<your-anycable-host:port/cable",
    protocol: "actioncable-v1-ext-json" // this version supports presence and streams history
  },
  // other options
  auth: {
    headers: {
      'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
    },
  },
});
```

That's it! Now you can use your Echo instance as before.

And don't forget to switch to [AnyCable broadcasting adapter][anycable-laravel] at the server side.

You can also pass an already created cable instance as an option instead of `cableOptions` (for example, if you want to reuse the connection outside of Echo):

```js
import { createCable } from '@anycable/web';
import { EchoCable } from '@anycable/echo';

// First, create a cable instance and configure it as you need
const cable = createCable();

// Then, pass a cable broadcaster as a broadcaster option to the Echo constructor.
// Note that no other WebSocket configuration is requried—you must only configure the cable instance.
window.Echo = new Echo({
  broadcaster: Echo,
  cable,
});
```

[Laravel Echo]: https://github.com/laravel/echo
[anycable-laravel]: https://github.com/anycable/anycable-laravel
