import { Encoder } from '@anycable/core'

interface AnyObject {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  [key: string]: any
}

export interface MessageObject {
  command?: string
  type?: string
  message?: AnyObject
  identifier?: string
  reason?: string
  reconnect?: boolean
}

export class EnumWrapper {
  constructor(values: AnyObject)
  getIdByValue(value: string): number
  getValueById(id: number): string
}

export class ProtobufEncoder implements Encoder<MessageObject, Uint8Array> {
  encode(msg: MessageObject): Uint8Array
  decode(raw: Uint8Array): MessageObject | void
}
