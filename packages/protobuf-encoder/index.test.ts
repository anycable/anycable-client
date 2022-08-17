import msgpack from '@ygoe/msgpack'

import { ProtobufEncoder, MessageObject } from './'
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
      // We ignore TypeScript here to pass a property
      // with a wrong type in order to break encoding
      // @ts-ignore
      encoder.encode({ identifier: 1 })
    }).toThrow('identifier: string expected')
  })

  describe('enum encoding', () => {
    it('sets enum values to 0, if no values provided', () => {
      let encoded = encoder.encode({})
      let decoded = Message.decode(encoded)

      // Zero is default value for enums by Protobuf protocol
      expect(decoded.command).toBe(0)
      expect(decoded.type).toBe(0)
    })

    it('converts enum values to ids', () => {
      let encoded = encoder.encode({
        command: 'message',
        // normally `type` and `command` aren't used together,
        // here we just want to test everything at once
        type: 'no_type'
      })

      let decoded = Message.decode(encoded)

      expect(decoded.command).toEqual(3)
      expect(decoded.type).toEqual(0)
    })
  })

  describe('message field encoding', () => {
    it('encodes message, using msgpack', () => {
      let payload = { foo: 'bar', bar: 123 }
      let encoded = encoder.encode({ message: payload })
      let decoded = Message.decode(encoded)

      expect(msgpack.deserialize(decoded.message)).toEqual(payload)
    })
  })
})

describe('decode', () => {
  describe('enum decoding', () => {
    it('converts enum ids to string names', () => {
      // normally `type` and `command` aren't used together,
      // here we just want to test everything at once
      let encoded = Message.encode({ command: 3, type: 3 }).finish()
      let decoded = encoder.decode(encoded) as MessageObject

      expect(decoded).toBeDefined()
      expect(decoded.type).toEqual('ping')
      expect(decoded.command).toEqual('message')
    })

    it('sets defaults, if no values provided', () => {
      let encoded = Message.encode({}).finish()
      let decoded = encoder.decode(encoded) as MessageObject

      expect(decoded).toBeDefined()
      expect(decoded.type).toEqual('no_type')
      expect(decoded.command).toEqual('unknown_command')
    })
  })

  describe('message field decoding', () => {
    it('decodes message, using msgpack', () => {
      let payload = { foo: 'bar', bar: 123 }
      let encoded = Message.encode({
        message: msgpack.serialize(payload)
      }).finish()
      let decoded = encoder.decode(encoded) as MessageObject

      expect(decoded.message).toEqual(payload)
    })
  })
})

describe('protobuf message e2e sending', () => {
  beforeEach(async () => {
    channel = new TestChannel({ id: '21' })

    cable.connect()
    cable.connected()

    cable.subscribe(channel)

    subscribeAndSendPromise = channel.perform(action, payload)
    await Promise.resolve()

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
