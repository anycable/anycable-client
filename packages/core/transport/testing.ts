import { createNanoEvents, Emitter, Unsubscribe } from 'nanoevents'

import { Transport, Env, TransportEvents } from './index'

type Events = TransportEvents<string | Uint8Array>

export class TestTransport implements Transport<string> {
  url: string
  emitter: Emitter<Events>
  state: Env
  opened: boolean
  sent: (string | Uint8Array)[]

  constructor(url: string = '') {
    this.url = url
    this.emitter = createNanoEvents()
    this.state = {}
    this.opened = false
    this.sent = []
  }

  displayName(): string {
    return 'TestTransport(' + this.url + ')'
  }

  setURL(url: string) {
    this.url = url
  }

  setParam(key: string, value: string) {
    this.state[key] = value
  }

  setToken(value: string, param: string = 'jid') {
    this.state[param] = value
  }

  open() {
    this.opened = true
    this.emit('open')
    return Promise.resolve()
  }

  send(data: string | Uint8Array) {
    this.sent.push(data)
  }

  receive(msg: string | Uint8Array) {
    this.emit('data', msg)
  }

  close() {
    this.opened = false
    this.emit('close')
    return Promise.resolve()
  }

  closed(reason: string) {
    this.opened = false
    this.emit('close', Error(reason))
  }

  on<E extends keyof Events>(event: E, callback: Events[E]): Unsubscribe {
    return this.emitter.on(event, callback)
  }

  once<E extends keyof Events>(event: E, callback: Events[E]): Unsubscribe {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    let unbind = this.emitter.on(event, (...args: any) => {
      unbind()
      callback(args)
    })
    return unbind
  }

  emit<K extends keyof Events>(event: K, ...args: Parameters<Events[K]>): void {
    this.emitter.emit(event, ...args)
  }
}
