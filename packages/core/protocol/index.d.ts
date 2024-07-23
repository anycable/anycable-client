import { MessageMeta, Message, Identifier } from '../channel/index.js'

export class ReasonError extends Error {
  readonly reason?: string
  readonly cause?: Error

  constructor(msg?: string | Error, reason?: string)
}

export class SubscriptionRejectedError extends ReasonError {
  constructor(msg?: string)
}

export class SubscriptionTimeoutError extends ReasonError {
  constructor(msg?: string)
}

export class DisconnectedError extends ReasonError {
  constructor(reason?: string)
  constructor(cause: Error, reason?: string)
}

export class CommandError extends ReasonError {
  constructor(msg?: string)
}

export class StaleConnectionError extends ReasonError {
  constructor(msg?: string)
}

export interface Consumer {
  setSessionId(sessionId: string): void
  connected(): void
  restored(remoteIds: string[]): void
  disconnected(reason?: ReasonError): void
  closed(reason?: string | ReasonError): void
  keepalive(msg?: Message): void
  send(msg: object): void
  notify(event: string, identifier?: Identifier, data?: object): void
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
  reset(err?: ReasonError): void
}
