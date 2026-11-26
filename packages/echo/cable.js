import { createCable } from '@anycable/web'

import { PresenceChannel, PrivateChannel, PublicChannel } from './channels.js'
import { EventFormatter } from './event-formatter.js'

const DEFAULT_AUTH_ENDPOINT = '/broadcasting/auth'
const DEFAULT_NAMESPACE = 'App\\Events'

/**
 * Main EchoCable broadcaster implementation
 */
export class EchoCable {
  constructor(options) {
    this.options = {
      authEndpoint: DEFAULT_AUTH_ENDPOINT,
      namespace: DEFAULT_NAMESPACE,
      auth: {
        headers: {}
      },
      ...options
    }

    this.options.eventFormatter = new EventFormatter(this.options.namespace)

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

    this.wasConnected = this.cable.state === 'connected'
    this.closeError = undefined

    this.cable.on('connect', () => {
      this.wasConnected = true
      this.closeError = undefined
    })

    this.cable.on('close', err => {
      this.wasConnected = false
      this.closeError = err
    })
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
   * Get the connection status in Laravel Echo terms
   */
  connectionStatus() {
    switch (this.cable.state) {
      case 'connected':
        return 'connected'
      case 'connecting':
        return this.wasConnected ? 'reconnecting' : 'connecting'
      case 'disconnected':
        // The monitor reconnects the cable after a disconnect
        return this.cable.monitor ? 'reconnecting' : 'disconnected'
      case 'closed':
        // The server closed the connection and asked not to reconnect
        // (for example, unauthorized); a user disconnect has no error
        return this.closeError ? 'failed' : 'disconnected'
      default:
        return 'disconnected'
    }
  }

  /**
   * Call the callback with the new status on every connection change.
   * Returns a function that removes the callback.
   */
  onConnectionChange(callback) {
    let update = () => callback(this.connectionStatus())
    let unbinds = ['connect', 'disconnect', 'close'].map(event =>
      this.cable.on(event, update)
    )

    return () => {
      unbinds.forEach(unbind => unbind())
    }
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
