import { TurboStreamSourceElement } from './stream_source_element.js'
import { TurboChannel } from './channel.js'

export const DEFAULT_SOCKET_HEADER = 'X-Socket-ID'

export function start(cable, opts = {}) {
  let tagName = opts.tagName || 'turbo-cable-stream-source'
  let channelClass = opts.channelClass || TurboChannel

  let C = class extends TurboStreamSourceElement {}

  C.cable = cable
  C.channelClass = channelClass

  if (customElements.get(tagName) === undefined) {
    customElements.define(tagName, C)
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
