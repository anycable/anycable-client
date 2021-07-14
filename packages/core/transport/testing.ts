import { createNanoEvents, Emitter, Unsubscribe } from 'nanoevents'

import { Transport, Env, TransportEvents } from './index'

type Events = TransportEvents<string>

export class TestTransport implements Transport<string> {
  emitter: Emitter<Events>
  state: Env
  opened: boolean
  sent: string[]

  constructor() {
    this.emitter = createNanoEvents()
    this.state = {}
    this.opened = false
    this.sent = []
  }

  set(key: string, value: string) {
    this.state[key] = value
  }

  open() {
    this.opened = true
    this.emit('open')
    return Promise.resolve()
  }

  send(data: string) {
    this.sent.push(data)
  }

  receive(msg: string) {
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
