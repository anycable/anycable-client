import { MessageMeta, Message, Identifier } from '../channel/index.js'

export class ReasonError extends Error {
  readonly reason?: string

  constructor(msg?: string, reason?: string)
}

export class SubscriptionRejectedError extends ReasonError {}

export class DisconnectedError extends ReasonError {}

export class CommandError extends Error {}

export class StaleConnectionError extends Error {}

export interface Consumer {
  connected(): void
  restored(): void
  disconnected(reason?: ReasonError): void
  keepalive(msg?: Message): void
  close(reason?: string | ReasonError): void
  send(msg: object): void
}

export type ProcessedMessage = Partial<{
  identifier: Identifier
  message: Message
  meta: MessageMeta
}>

export interface Protocol {
  readonly cable: Consumer

  attached(cable: Consumer): void
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
