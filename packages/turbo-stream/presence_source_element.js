import { connectStreamSource, disconnectStreamSource } from '@hotwired/turbo'

import { isPreview } from './turbo.js'

export class TurboPresenceSourceElement extends HTMLElement {
  static cable
  static delayedUnsubscribe

  async connectedCallback() {
    connectStreamSource(this)

    if (isPreview()) return

    let cable = this.constructor.cable
    let signedStreamName = this.getAttribute('signed-stream-name')

    this.presenceId = this.getAttribute('presence-id')
    if (!this.presenceId) {
      throw new Error('Presence source must have a presence-id attribute')
    }

    this.joinTemplate = this.querySelector('template')
    if (!this.joinTemplate) throw new Error('No join action template defined')

    this.ignoreSelf = this.hasAttribute('ignore-self')
    this.presenceInitialized = false

    this.listeners = []

    this.channel = cable.streamFromSigned(signedStreamName)

    this.listeners.push(
      this.channel.on('connect', () => {
        this.setAttribute('connected', '')
        this.initializePresence()
      })
    )

    this.listeners.push(
      this.channel.on('disconnect', () => this.removeAttribute('connected'))
    )

    this.listeners.push(
      this.channel.on('presence', this.handlePresenceEvent.bind(this))
    )
  }

  disconnectedCallback() {
    disconnectStreamSource(this)
    if (this.channel) {
      for (let listener of this.listeners) {
        listener()
      }
      this.listeners.length = 0

      let ch = this.channel
      let delay = this.constructor.delayedUnsubscribe || 500

      if (delay) {
        setTimeout(() => ch.disconnect(), delay)
      } else {
        ch.disconnect()
      }
    }
  }

  async initializePresence() {
    let tempDiv = document.createElement('div')
    tempDiv.appendChild(this.joinTemplate.content.cloneNode(true))
    let html = tempDiv.innerHTML.trim()

    this.channel.presence.join(this.presenceId, { html })

    await this.invalidatePresence()

    let presence = await this.channel.presence.info()

    this.presenceInitialized = true

    for (let id in presence) {
      this.handlePresenceEvent({
        type: 'join',
        id,
        info: { html: presence[id].html }
      })
    }
  }

  async invalidatePresence() {
    let presence = await this.channel.presence.info()

    if (this.ignoreSelf) delete presence[this.presenceId]

    this.updateCounter(Object.keys(presence).length)
  }

  handlePresenceEvent(data) {
    if (!this.presenceInitialized) return

    // ignore self presence events
    if (this.ignoreSelf && data.id === this.presenceId) return

    if (data.type === 'join') {
      let event = new MessageEvent('message', { data: data.info.html })
      this.dispatchEvent(event)
    }

    // TODO: support arbitrary leave actions
    if (data.type === 'leave') {
      let el = document.getElementById(data.id)
      if (el) {
        el.remove()
      }
    }

    this.invalidatePresence()
  }

  updateCounter(value) {
    if (value) {
      this.setAttribute('present', '')
    } else {
      this.removeAttribute('present')
    }

    let counter = this.querySelector('[data-presence-counter]')

    if (counter) {
      counter.textContent = value
    }
  }
}
