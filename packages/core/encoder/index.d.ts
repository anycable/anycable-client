export interface Encoder<MessageType = object, WireType = string> {
  encode(msg: MessageType): Promise<WireType>
  decode(raw: WireType): Promise<MessageType>
}
