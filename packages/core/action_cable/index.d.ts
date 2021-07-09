import { Protocol, Consumer, ProcessedMessage } from '../protocol/index.js'
import { Message } from '../channel/index.js'
import { Logger } from '../logger/index.js'

export type Options = Partial<{
  logger: Logger
}>

export class ActionCableProtocol implements Protocol {
  readonly cable: Consumer

  constructor(cable: Consumer, opts?: Options)

  subscribe(identifier: string, params?: object): Promise<string>
  unsubscribe(identifier: string): Promise<void>
  perform(identifier: string, action: string, payload?: object): Promise<void>
  receive(msg: Message): ProcessedMessage | void
  recoverableClosure(err: Error): boolean
  reset(err: Error): void
}
