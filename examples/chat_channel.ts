import { Channel, ChannelEvents } from '../packages/core/index.js'

type Params = {
  roomId: string | number
}

type TypingMessage = {
  type: 'typing'
  username: string
}

type ChatMessage = {
  type: 'message'
  username: string
  userId: string
}

type Message = TypingMessage | ChatMessage

interface Events extends ChannelEvents<Message> {
  typing: (msg: TypingMessage) => void
}

export class ChatChannel extends Channel<Params, Message, Events> {
  static identifier = 'ChatChannel'

  receive(message: Message): void {
    if (message.type === 'typing') {
      this.emit('typing', message)
      return
    }

    super.receive(message)
  }
}
