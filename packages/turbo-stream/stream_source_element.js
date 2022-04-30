import { connectStreamSource, disconnectStreamSource } from '@hotwired/turbo'

export class TurboStreamSourceElement extends HTMLElement {
  static cable

  async connectedCallback() {
    connectStreamSource(this)

    const channel = this.getAttribute('channel')
    const signed_stream_name = this.getAttribute('signed-stream-name')

    this.subscription = await this.constructor.cable.subscribeTo(channel, {
      signed_stream_name
    })

    this.unbindOnMessage = this.subscription.on(
      'message',
      this.dispatchMessageEvent.bind(this)
    )
  }

  disconnectedCallback() {
    disconnectStreamSource(this)
    if (this.subscription) {
      this.unbindOnMessage()
      this.subscription.unsubscribe()
    }
  }

  dispatchMessageEvent(data) {
    const event = new MessageEvent('message', { data })
    return this.dispatchEvent(event)
  }
}
