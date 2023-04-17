import { createNanoEvents } from 'nanoevents'

export class WebSocketTransport {
  constructor(url, opts = {}) {
    this.url = url

    let Impl = opts.websocketImplementation

    if (Impl) {
      this.Impl = Impl
    } else if (typeof WebSocket !== 'undefined') {
      this.Impl = WebSocket
    } else {
      throw new Error('No WebSocket support')
    }

    this.connected = false
    this.emitter = createNanoEvents()

    let { format, subprotocol } = opts

    this.format = format || 'text'
    this.connectionOptions = opts.websocketOptions
    this.subprotocol = subprotocol
  }

  open() {
    if (this.connectionOptions) {
      this.ws = new this.Impl(
        this.url,
        this.subprotocol,
        this.connectionOptions
      )
    } else {
      this.ws = new this.Impl(this.url, this.subprotocol)
    }
    this.ws.binaryType = 'arraybuffer'
    this.initListeners()

    return new Promise((resolve, reject) => {
      let unbind = []

      unbind.push(
        this.once('open', () => {
          unbind.forEach(clbk => clbk())
          resolve()
        })
      )

      unbind.push(
        this.once('close', () => {
          unbind.forEach(clbk => clbk())
          reject(Error('WS connection closed'))
        })
      )
    })
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

  send(data) {
    if (!this.ws || !this.connected) {
      throw Error('WebSocket is not connected')
    } else {
      this.ws.send(data)
    }
  }

  close() {
    if (this.ws && this.connected) {
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

  initListeners() {
    this.ws.onerror = event => {
      this.emitter.emit('error', event.error || new Error('WS Error'))
    }

    this.ws.onclose = () => {
      this.onclose()
    }

    this.ws.onmessage = event => {
      let data = event.data
      if (this.format === 'binary') {
        data = new Uint8Array(data)
      }

      this.emitter.emit('data', data)
    }

    this.ws.onopen = () => {
      this.connected = true
      this.emitter.emit('open')
    }
  }

  onclose() {
    this.ws.onclose = undefined
    this.ws.close()
    delete this.ws
    this.connected = false

    this.emitter.emit('close')
  }
}
