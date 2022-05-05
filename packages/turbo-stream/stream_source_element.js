import { connectStreamSource, disconnectStreamSource } from '@hotwired/turbo'

export class TurboStreamSourceElement extends HTMLElement {
  static cable

  async connectedCallback() {
    connectStreamSource(this)

    let channel = this.getAttribute('channel')
    let signedStreamName = this.getAttribute('signed-stream-name')

    this.subscription = await this.constructor.cable.subscribeTo(channel, {
      signed_stream_name: signedStreamName
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
    let event = new MessageEvent('message', { data })
    return this.dispatchEvent(event)
  }
}
