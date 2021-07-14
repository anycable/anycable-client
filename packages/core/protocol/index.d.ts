import { MessageMeta, Message, Identifier } from '../channel/index.js'

export interface Consumer {
  connected(): void
  restored(): void
  disconnected(reason?: string): void
  keepalive(msg?: Message): void
  close(reason?: string): void
  send(msg: object): void
}

export type ProcessedMessage = Partial<{
  identifier: Identifier
  message: Message
  meta: MessageMeta
}>

export interface Protocol {
  readonly cable: Consumer

  subscribe(identifier: string, params?: object): Promise<string>
  unsubscribe(identifier: string): Promise<void>
  perform(
    identifier: string,
    action: string,
    payload?: object
  ): Promise<Message | void>
  receive(msg: Message): ProcessedMessage | void
  recoverableClosure(err?: Error): boolean
  reset(err: Error): void
}

export class SubscriptionRejectedError extends Error {
  readonly reason?: string

  constructor(reason?: string)
}

export class DisconnectedError extends Error {
  readonly reason?: string

  constructor(reason?: string)
}

export class CommandError extends Error {}
