import { TurboStreamSourceElement } from './stream_source_element.js'

export function start(cable, opts = {}) {
  let tagName = opts.tagName || 'turbo-cable-stream-source'

  if (!cable) {
    throw Error(`A cable instance must be provided`)
  }

  TurboStreamSourceElement.cable = cable

  customElements.define(tagName, TurboStreamSourceElement)
}
