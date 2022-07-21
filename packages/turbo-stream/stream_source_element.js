import { connectStreamSource, disconnectStreamSource } from '@hotwired/turbo'

import snakeize from './snakeize.js'
import { isPreview } from './turbo.js'

export class TurboStreamSourceElement extends HTMLElement {
  static cable
  static channelClass

  async connectedCallback() {
    connectStreamSource(this)

    if (isPreview()) return

    let cable = this.constructor.cable
    let ChannelClass = this.constructor.channelClass

    let channelName = this.getAttribute('channel')
    let signedStreamName = this.getAttribute('signed-stream-name')
    let params = snakeize({ ...this.dataset })

    this.channel = new ChannelClass(this, channelName, {
      signed_stream_name: signedStreamName,
      ...params
    })

    this.unbindOnMessage = this.channel.on(
      'message',
      this.dispatchMessageEvent.bind(this)
    )

    try {
      cable.subscribe(this.channel)
      await this.channel.ensureSubscribed()
    } catch (err) {
      cable.logger.warn(err)
    }
  }

  disconnectedCallback() {
    disconnectStreamSource(this)
    if (this.channel) {
      this.unbindOnMessage()
      this.channel.disconnect()
    }
  }

  dispatchMessageEvent(data) {
    let event = new MessageEvent('message', { data })
    return this.dispatchEvent(event)
  }
}
