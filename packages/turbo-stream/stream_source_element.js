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

    this.listeners = []

    this.channel = new ChannelClass(this, channelName, {
      signed_stream_name: signedStreamName,
      ...params
    })

    this.listeners.push(
      this.channel.on('connect', () => this.setAttribute('connected', ''))
    )

    this.listeners.push(
      this.channel.on('disconnect', () => this.removeAttribute('connected'))
    )

    this.listeners.push(
      this.channel.on('message', this.dispatchMessageEvent.bind(this))
    )

    cable.subscribe(this.channel)
  }

  disconnectedCallback() {
    disconnectStreamSource(this)
    if (this.channel) {
      for (let listener of this.listeners) {
        listener()
      }
      this.listeners.length = 0
      this.channel.disconnect()
    }
  }

  dispatchMessageEvent(data) {
    let event = new MessageEvent('message', { data })
    return this.dispatchEvent(event)
  }
}
