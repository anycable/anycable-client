import { createNanoEvents } from 'nanoevents'

import { NoopLogger } from '../logger/index.js'

export class FallbackTransport {
  constructor(transports, opts = {}) {
    this.transports = transports
    this.transport = null
    this.emitter = createNanoEvents()
    this.unbind = []

    this.logger = opts.logger || new NoopLogger()
  }

  displayName() {
    return 'fallbacked transport'
  }

  async open() {
    for (let i = 0; i < this.transports.length; i++) {
      let transport = this.transports[i]
      try {
        this.transport = transport
        this.resetListeners()
        this.logger.debug(`Trying to connect via ${transport.displayName()}`)
        await transport.open()
        this.logger.debug(`Connected via ${transport.displayName()}`)
        return
      } catch (e) {
        this.logger.debug(
          `Failed to connect via ${transport.displayName()}: ${e.message}`
        )
      }
    }

    this.transport = null
    this.resetListeners()
    throw new Error(`Couldn't connect via any available transport`)
  }

  send(data) {
    if (!this.transport) {
      throw new Error('No transport is open')
    }

    this.transport.send(data)
  }

  async close() {
    if (!this.transport) {
      throw new Error('No transport is open')
    }

    await this.transport.close()
    this.transport = null
  }

  setURL() {
    throw new Error('Not implemented. Set URL for each transport separately')
  }

  setParam(key, val) {
    this.transports.forEach(transport => {
      transport.setParam(key, val)
    })
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

  get url() {
    if (!this.transport) return ''

    return this.transport.url
  }

  resetListeners() {
    this.unbind.forEach(clbk => clbk())
    this.unbind.length = 0

    if (!this.transport) return

    this.unbind.push(
      this.transport.on('open', () => {
        this.emitter.emit('open')
      }),
      this.transport.on('data', data => {
        this.emitter.emit('data', data)
      }),
      this.transport.on('close', ev => {
        this.emitter.emit('close', ev)
      }),
      this.transport.on('error', ev => {
        this.emitter.emit('error', ev)
      })
    )
  }
}
