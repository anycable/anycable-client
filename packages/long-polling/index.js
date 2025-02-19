import { createNanoEvents } from 'nanoevents'

export class LongPollingTransport {
  constructor(url, opts = {}) {
    this.url = url
    this.cooldown = opts.cooldownPeriod || 500
    this.sendBuffer = opts.sendBuffer || 500
    this.pingInterval = opts.pingInterval || 3000

    this.fetchCredentials = opts.credentials || 'same-origin'

    this.connected = false
    this.emitter = createNanoEvents()

    this.poll = this.poll.bind(this)
    this.flushBuffer = this.flushBuffer.bind(this)
    this.emulatePing = this.emulatePing.bind(this)

    // Buffer for outgoing messages
    this.buffer = []

    let fetchFn = opts.fetchImplementation

    if (fetchFn) {
      this.fetch = fetchFn
    } else if (typeof fetch !== 'undefined') {
      this.fetch = (...args) => fetch(...args)
    } else {
      throw new Error('No fetch support')
    }
  }

  displayName() {
    return 'LongPolling(' + this.url + ')'
  }

  async open() {
    try {
      let response = await this.fetch(this.url, {
        method: 'POST',
        credentials: this.fetchCredentials
      })

      if (response.ok) {
        this.connected = true
        this.emitter.emit('open')

        await this.processResponse(response)

        this.sessionID = response.headers.get('x-anycable-poll-id')

        this._pollTimer = setTimeout(this.poll, this.cooldown)
        this._pingTimer = setInterval(this.emulatePing, this.pingInterval)
      } else {
        if (response.status === 401) {
          await this.processResponse(response)
        }

        throw new Error(`Unexpected status code: ${response.status}`)
      }
    } catch (error) {
      this.emitter.emit('close', error)
      throw error
    }
  }

  async poll() {
    delete this._pollTimer

    if (this._sendTimer) {
      clearTimeout(this._sendTimer)
      delete this._sendTimer
    }

    try {
      let body

      if (this.buffer.length > 0) {
        body = this.buffer.join('\n')
        this.buffer.length = 0
      }

      this.abortController = new AbortController()

      let headers = {}
      headers['X-Anycable-Poll-ID'] = this.sessionID

      let response = await this.fetch(this.url, {
        method: 'POST',
        credentials: this.fetchCredentials,
        body,
        signal: this.abortController.signal,
        headers
      })

      delete this.abortController

      if (response.ok) {
        await this.processResponse(response)

        // Only continue polling if we're still connected, i.e. no close() was called
        if (this.connected) {
          this._pollTimer = setTimeout(this.poll, this.cooldown)
        }
      } else {
        if (response.status === 401) {
          await this.processResponse(response)
        }

        throw new Error(`Unexpected status code: ${response.status}`)
      }
    } catch (error) {
      delete this.abortController

      if (error.name === 'AbortError') {
        // Ignore
      } else {
        this.onclose(error)
      }
    }
  }

  setURL(url) {
    this.url = url
  }

  setParam(key, val) {
    let url = new URL(this.url)
    url.searchParams.set(key, val)
    let newURL = `${url.protocol}//${url.host}${url.pathname}?${url.searchParams}`
    this.setURL(newURL)
  }

  setToken(val, name = 'jid') {
    this.setParam(name, val)
  }

  send(data) {
    if (!this.connected) {
      throw Error('No connection')
    } else {
      this.buffer.push(data)

      if (!this._sendTimer) {
        this._sendTimer = setTimeout(this.flushBuffer, this.sendBuffer)
      }
    }
  }

  async close() {
    if (this.connected) {
      this.onclose()
    }
  }

  on(event, callback) {
    return this.emitter.on(event, callback)
  }

  once(event, callback) {
    let unbind = this.emitter.on(event, (...args) => {
      unbind()
      callback(...args)
    })
    return unbind
  }

  async processResponse(response) {
    let data = await response.text()
    let lines = data.split('\n')
    for (let line of lines) {
      if (line) {
        this.emitter.emit('data', line)
      }
    }
  }

  flushBuffer() {
    delete this._sendTimer

    // No longer interested in sending commands
    if (!this.connected) return

    // Reset poll timer, we will perform poll earlier
    if (this._pollTimer) {
      clearTimeout(this._pollTimer)
      delete this._pollTimer
    }

    // abort an in-flight request if any
    if (this.abortController) {
      this.abortController.abort()
    }

    this.poll()
  }

  onclose() {
    if (this._pollTimer) {
      clearTimeout(this._pollTimer)
      delete this._pollTimer
    }

    if (this._sendTimer) {
      clearTimeout(this._sendTimer)
      delete this._sendTimer
    }

    if (this._pingTimer) {
      clearInterval(this._pingTimer)
      delete this._pingTimer
    }

    // abort an in-flight request if any
    if (this.abortController) {
      this.abortController.abort()
    }

    delete this.sessionID
    this.connected = false
    this.emitter.emit('close')
  }

  emulatePing() {
    // This is a hack to emulater server-to-client pings
    // and make monitor work correcly with long-polling
    this.emitter.emit(
      'data',
      `{"type":"ping","source":"long polling transport emulation"}`
    )
  }
}
