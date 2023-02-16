import { TurboStreamSourceElement } from './stream_source_element.js'
import { TurboChannel } from './channel.js'

export function start(cable, opts = {}) {
  let tagName = opts.tagName || 'turbo-cable-stream-source'
  let channelClass = opts.channelClass || TurboChannel

  let C = class extends TurboStreamSourceElement {}

  C.cable = cable
  C.channelClass = channelClass

  customElements.define(tagName, C)
}
