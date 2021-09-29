import { Encoder } from '@anycable/core'

export interface MessageObject {
  command?: string
  type?: string
  message?: object
  identifier?: string
  reason?: string
  reconnect?: boolean
}

export class EnumWrapper {
  constructor(values: object)
  getIdByValue(value: string): number
  getValueById(id: number): string
}

export class ProtobufEncoder implements Encoder<MessageObject, Uint8Array> {
  encode(msg: MessageObject): Uint8Array
  decode(raw: Uint8Array): MessageObject | void
}
