import { ProtobufEncoder } from './'
import { action_cable as protos } from './generated/message_pb.js'
import { TestTransport } from '../core/transport/testing'
import { createCable } from '../core/create-cable'
import { Channel } from '../core/channel'

const Message = protos.Message
const MessageType = protos.Type
const Command = protos.Command

const transport = new TestTransport('ws:///')
const encoder = new ProtobufEncoder()

let cable = createCable({
  transport,
  protocol: 'actioncable-v1-protobuf',
  encoder
})

class TestChannel extends Channel<{ id: string }> {
  static identifier = 'test'
}

let subscribeAndSendPromise: Promise<any>
let channel: TestChannel
const payload = { foo: 1, bar: 'baz' }
const action = 'test'
const identifier = JSON.stringify({ channel: 'test', id: '21' })

describe('encode', () => {
  it('raises error on invalid input', () => {
    expect(() => {
      encoder.encode({ identifier: 1 })
    }).toThrow('identifier: string expected')
  })
})

describe('protobuf message encoding/decoding', () => {
  beforeEach(() => {
    channel = new TestChannel({ id: '21' })

    cable.connect()
    cable.connected()

    subscribeAndSendPromise = cable.subscribe(channel).then(() => {
      return channel.perform(action, payload)
    })

    cable.protocol.receive({ type: 'confirm_subscription', identifier })
  })

  it('encodes message properly', async () => {
    await subscribeAndSendPromise

    let sentMessage = transport.sent[1]

    expect(sentMessage).toBeInstanceOf(Buffer)

    let decoded = Message.decode(<Buffer>sentMessage)

    // testing that we have only expected properties
    expect(Object.keys(decoded)).toEqual(['command', 'identifier', 'data'])

    expect(decoded.command).toBe(Command.message)
    expect(decoded.identifier).toBe(identifier)

    // We use parse here to not depend on keys order
    expect(JSON.parse(decoded.data)).toEqual({ action, ...payload })
  })

  it('decodes message properly', done => {
    let messageBody = { text: 'Lorem ipsum', author: 'John' }

    channel.on('message', msg => {
      try {
        expect(msg).toEqual(messageBody)
        done()
      } catch (err) {
        done(err)
      }
    })

    subscribeAndSendPromise.then(() => {
      let encodedMessage = encoder.encode({
        identifier,
        type: 'no_type',
        message: messageBody
      })

      // imitate message from the server
      transport.receive(encodedMessage)
    })
  })
})
