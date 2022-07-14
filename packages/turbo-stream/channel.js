import { Channel } from '@anycable/core'

export class TurboChannel extends Channel {
  static identifier = '__turbo__'

  constructor(element, identifier, params) {
    super(params)
    this.element = element
    this.identifier = identifier
  }

  set identifier(val) {
    this._identifier = val
  }

  get identifier() {
    return this._identifier
  }
}
