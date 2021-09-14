import msgpack from '@ygoe/msgpack'

import { action_cable as protos } from './generated/message_pb.js'

const Message = protos.Message
const MessageType = protos.Type
const Command = protos.Command

export class ProtobufEncoder {
  encode(msg) {
    // convert enum value names to corresponding integers
    msg.command = Command[msg.command]
    msg.type = MessageType[msg.type]

    if (msg.message !== undefined) {
      msg.message = msgpack.serialize(msg.message)
    }

    let err = Message.verify(msg)

    if (err) {
      throw Error(err)
    }

    return Message.encode(msg).finish()
  }

  /* eslint-disable consistent-return */
  decode(data) {
    try {
      let decodedMessage = Message.decode(data)

      if (decodedMessage.type !== undefined) {
        let messageTypesById = Object.getPrototypeOf(MessageType)
        decodedMessage.type = messageTypesById[decodedMessage.type]
      }

      if (decodedMessage.message) {
        decodedMessage.message = msgpack.deserialize(decodedMessage.message)
      }

      return decodedMessage
    } catch {}
  }
}
