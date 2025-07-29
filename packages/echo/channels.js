/**
 * Base channel class for AnyCable Echo channels
 */
export class PublicChannel {
  constructor(cable, name, options) {
    this.cable = cable
    this.name = name
    this.options = options
    this.subscription = null
    this.listeners = new Map()
    this.subscribed_callbacks = []
    this.error_callbacks = []

    this.subscribe()
  }

  /**
   * Subscribe to the channel
   */
  async subscribe() {
    try {
      this.subscription = await this.createStreamSubscription(this.name)
    } catch (error) {
      this.cable.logger.error('failed to create a subscription:', error)
      this.error_callbacks.forEach(callback => callback(error))
      return
    }

    this.subscription.on('connect', () => {
      this.subscribed_callbacks.forEach(callback => callback())
    })

    this.subscription.on('disconnect', error => {
      this.error_callbacks.forEach(callback => callback(error))
    })

    this.subscription.on('message', data => {
      this.handleMessage(data)
    })
  }

  async createStreamSubscription(name) {
    return this.cable.streamFrom(name)
  }

  /**
   * Handle incoming messages.
   *
   * Messages are expected to be in the form: `{"event": "<string>", "data": <object>}
   */
  handleMessage(msg) {
    let { event, data } = msg
    if (!event) return

    let listeners = this.listeners.get(event)

    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data)
        } catch (e) {
          this.cable.error('error in event listener:', e)
        }
      })
    }
  }

  /**
   * Listen for an event on the channel
   */
  listen(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }

    this.listeners.get(event).push(callback)
    return this
  }

  /**
   * Listen for whisper events (client events)
   */
  listenForWhisper(event, callback) {
    return this.listen('client-' + event, callback)
  }

  /**
   * Listen for Laravel notifications
   */
  notification(callback) {
    return this.listen(
      'Illuminate\\Notifications\\Events\\BroadcastNotificationCreated',
      callback
    )
  }

  /**
   * Stop listening for an event
   */
  stopListening(event, callback) {
    let listeners = this.listeners.get(event)

    if (listeners) {
      if (callback) {
        let index = listeners.indexOf(callback)
        if (index > -1) {
          listeners.splice(index, 1)
        }
      } else {
        this.listeners.set(event, [])
      }
    }

    return this
  }

  /**
   * Stop listening for whisper events
   */
  stopListeningForWhisper(event, callback) {
    return this.stopListening('client-' + event, callback)
  }

  /**
   * Register a callback for successful subscription
   */
  subscribed(callback) {
    this.subscribed_callbacks.push(callback)

    // If already connected, call immediately
    if (this.subscription && this.subscription.state === 'connected') {
      callback()
    }

    return this
  }

  /**
   * Register a callback for errors
   */
  error(callback) {
    this.error_callbacks.push(callback)
    return this
  }

  /**
   * Unsubscribe from the channel
   */
  unsubscribe() {
    if (this.subscription) {
      this.subscription.disconnect()
      this.subscription = null
    }

    this.listeners.clear()
    this.subscribed_callbacks = []
    this.error_callbacks = []
  }
}

/**
 * Private channel implementation with Laravel authentication
 */
export class PrivateChannel extends PublicChannel {
  constructor(cable, name, options) {
    super(cable, name, options)
    this.isAuthenticated = false
    this.authData = null
  }

  /**
   * Create a signed stream subscription
   */
  async createStreamSubscription(name) {
    this.authData = await this.authenticate(name)
    this.isAuthenticated = true

    if (this.authData.signed_stream_name) {
      return this.cable.streamFromSigned(this.authData.signed_stream_name)
    } else {
      throw new Error('no signed stream name in auth response')
    }
  }

  /**
   * Authenticate with Laravel broadcasting endpoint
   */
  async authenticate(name) {
    let authEndpoint = this.options.authEndpoint
    let headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(this.options.auth?.headers || {})
    }

    let body = {
      socket_id: this.cable.sessionId || 'anycable-session',
      channel_name: name
    }

    let response = await fetch(authEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      credentials: 'same-origin'
    })

    if (!response.ok) {
      throw new Error(
        `Authentication failed: ${response.status} ${response.statusText}`
      )
    }

    let data = await response.json()
    return data
  }

  /**
   * Send a whisper event to other clients
   */
  whisper(eventName, data) {
    if (this.subscription && this.isAuthenticated) {
      this.subscription.whisper({
        event: `client-${eventName}`,
        data
      })
    }

    return this
  }
}

export class PresenceChannel extends PrivateChannel {
  constructor(cable, name, options) {
    super(cable, name, options)
    this.members = new Map()
    this.me = null
  }

  /**
   * Create a signed stream subscription and join the presence set
   */
  async createStreamSubscription(name) {
    let subscription = await super.createStreamSubscription(name)

    if (!this.authData) {
      throw new Error(
        'user presence data is missing in the authorization response'
      )
    }

    this.me = this.authData.presence

    subscription.presence.join(this.me.id.toString(), this.me)
    // trigger initial presence set request
    subscription.presence.info()

    subscription.on('presence', ev => {
      let { type, info, id, records } = ev

      if (type === 'join') {
        this.members.set(id, info)
        this.triggerPresenceEvent('joining', info)
      }

      if (type === 'leave') {
        let userInfo = this.members.get(id)
        if (userInfo) {
          this.members.delete(id)
          this.triggerPresenceEvent('leaving', userInfo)
        }
      }

      if (type === 'info') {
        this.members.clear()

        records.forEach(entry => {
          this.members.set(entry.id, entry.info)
        })

        this.triggerPresenceEvent('here', Array.from(this.members.values()))
      }
    })

    return subscription
  }

  /**
   * Trigger presence-specific events
   */
  triggerPresenceEvent(event, data) {
    let listeners = this.listeners.get(event)
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data)
        } catch (e) {
          this.cable.logger.error('error in presence event listener:', e)
        }
      })
    }
  }

  /**
   * Get current members
   */
  getMembers() {
    return Array.from(this.members.values())
  }

  /**
   * Listen for users joining
   */
  here(callback) {
    return this.listen('here', callback)
  }

  /**
   * Listen for users joining
   */
  joining(callback) {
    return this.listen('joining', callback)
  }

  /**
   * Listen for users leaving
   */
  leaving(callback) {
    return this.listen('leaving', callback)
  }
}
