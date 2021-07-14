import { Protocol, Message, MessageMeta } from '../index.js'
import { TestConsumer } from './testing'

class P implements Protocol {
  cable!: TestConsumer

  attached(cable: TestConsumer) {
    this.cable = cable
  }

  subscribe(identifier: string, params?: object) {
    return Promise.resolve('42')
  }

  unsubscribe(identifier: string) {
    return Promise.resolve()
  }

  perform(
    identifier: string,
    action: string,
    payload?: object
  ): Promise<[Message, MessageMeta?] | void> {
    if (action === 'call') {
      return Promise.resolve(['ok', { id: '2021' }])
    } else if (payload) {
      return Promise.resolve(['ko'])
    }

    return Promise.resolve()
  }

  receive(msg: Message) {
    if (msg === 'ok') {
      return { identifier: 'ok', message: { id: '2021' }, meta: { id: '431' } }
    } else {
      return { identifier: 'ko' }
    }
  }

  recoverableClosure() {
    return false
  }

  reset() {}
}
