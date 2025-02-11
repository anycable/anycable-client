import { TurboStreamSourceElement } from './stream_source_element.js'
import { TurboPresenceSourceElement } from './presence_source_element.js'
import { TurboChannel } from './channel.js'

export const DEFAULT_SOCKET_HEADER = 'X-Socket-ID'

export function start(cable, opts = {}) {
  let tagName = opts.tagName || 'turbo-cable-stream-source'
  let channelClass = opts.channelClass || TurboChannel
  let delayedUnsubscribe = opts.delayedUnsubscribe || 0
  let enablePresence = opts.presence || false
  let presenceTagName = opts.presenceTagName || 'turbo-cable-presence-source'

  if (delayedUnsubscribe === true) delayedUnsubscribe = 300

  let C = class extends TurboStreamSourceElement {}

  C.cable = cable
  C.channelClass = channelClass
  C.delayedUnsubscribe = delayedUnsubscribe

  if (customElements.get(tagName) === undefined) {
    customElements.define(tagName, C)
  }

  if (enablePresence) {
    let P = class extends TurboPresenceSourceElement {}

    P.cable = cable
    P.delayedUnsubscribe = delayedUnsubscribe

    if (customElements.get(presenceTagName) === undefined) {
      customElements.define(presenceTagName, P)
    }
  }

  if (opts.requestSocketIDHeader) {
    let headerName =
      opts.requestSocketIDHeader === true
        ? DEFAULT_SOCKET_HEADER
        : opts.requestSocketIDHeader

    document.addEventListener('turbo:before-fetch-request', event => {
      if (cable.sessionId && !event.detail.fetchOptions.headers[headerName]) {
        event.detail.fetchOptions.headers[headerName] = cable.sessionId
      }
    })
  }
}
