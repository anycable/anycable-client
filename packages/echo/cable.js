import { createCable } from '@anycable/web'

import { PresenceChannel, PrivateChannel, PublicChannel } from './channels.js'

const DEFAULT_AUTH_ENDPOINT = '/broadcasting/auth'

/**
 * Main EchoCable broadcaster implementation
 */
export class EchoCable {
  constructor(options) {
    this.options = {
      authEndpoint: DEFAULT_AUTH_ENDPOINT,
      auth: {
        headers: {}
      },
      ...options
    }

    let url = options.cableOptions?.url

    this.cable =
      options.cable ||
      createCable(url, {
        protocol: 'actioncable-v1-ext-json',
        ...options.cableOptions
      })
    this.channels = {}

    if (!this.cable) {
      throw new Error('AnyCable cable instance is required')
    }
  }

  /**
   * Get a public channel instance by name
   */
  channel(name) {
    if (!this.channels[name]) {
      this.channels[name] = new PublicChannel(this.cable, name, this.options)
    }

    return this.channels[name]
  }

  /**
   * Get a private channel instance by name
   */
  privateChannel(name) {
    let channelName = `private-${name}`

    if (!this.channels[channelName]) {
      this.channels[channelName] = new PrivateChannel(
        this.cable,
        channelName,
        this.options
      )
    }

    return this.channels[channelName]
  }

  /**
   * Get a presence channel instance by name
   */
  presenceChannel(name) {
    let channelName = `presence-${name}`

    if (!this.channels[channelName]) {
      this.channels[channelName] = new PresenceChannel(
        this.cable,
        channelName,
        this.options
      )
    }

    return this.channels[channelName]
  }

  /**
   * Listen for an event on a channel
   */
  listen(name, event, callback) {
    return this.channel(name).listen(event, callback)
  }

  /**
   * Leave a channel and its variants
   */
  leave(name) {
    let channels = [name, `private-${name}`, `presence-${name}`]

    channels.forEach(channelName => {
      this.leaveChannel(channelName)
    })
  }

  /**
   * Leave a specific channel
   */
  leaveChannel(name) {
    if (this.channels[name]) {
      this.channels[name].unsubscribe()
      delete this.channels[name]
    }
  }

  /**
   * Get the socket ID
   */
  socketId() {
    return this.cable.sessionId
  }

  /**
   * Disconnect from AnyCable
   */
  disconnect() {
    Object.keys(this.channels).forEach(name => {
      this.leaveChannel(name)
    })

    if (this.cable.disconnect) {
      this.cable.disconnect()
    }
  }
}
