import msgpack from '@ygoe/msgpack'

import { action_cable as protos } from './generated/message_pb.js'
import { EnumWrapper } from './enum_wrapper.js'

const Message = protos.Message
const Reply = protos.Reply
const MessageType = new EnumWrapper(protos.Type)
const Command = new EnumWrapper(protos.Command)

export class ProtobufEncoder {
  encode(msg) {
    // convert enum value names to corresponding integers
    msg.command = Command.getIdByValue(msg.command)
    msg.type = MessageType.getIdByValue(msg.type)

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
      let decodedMessage = this.decodeReply(data)

      // We can't skip check for presence here, since enums always have
      // zero value by default in protobuf, even if nothing was passed
      decodedMessage.type = MessageType.getValueById(decodedMessage.type)
      decodedMessage.command = Command.getValueById(decodedMessage.command)

      if (decodedMessage.message && decodedMessage.message.length > 0) {
        decodedMessage.message = msgpack.deserialize(decodedMessage.message)
      }

      return decodedMessage
    } catch (_e) {}
  }

  decodeReply(data) {
    return Message.decode(data)
  }
}

export class ProtobufEncoderV2 extends ProtobufEncoder {
  decodeReply(data) {
    let decoded = Reply.decode(data)
    return decoded
  }
}
