import { Channel } from '@anycable/core'

export class TurboChannel extends Channel {
  static identifier = '__turbo__'

  constructor(element, channelId, params) {
    super(params)
    this.element = element
    this.channelId = channelId
  }

  set channelId(val) {
    this._channelId = val
  }

  get channelId() {
    return this._channelId
  }
}
