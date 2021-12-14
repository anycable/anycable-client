import { Unsubscribe } from 'nanoevents'

import { ReasonError } from '../protocol/index.js'

export type Identifier = string

export type Message = object | string | number
export type MessageMeta = Partial<{
  id: string
}>

export interface Receiver {
  unsubscribe(id: Identifier): Promise<boolean>
  perform(
    id: Identifier,
    action: string,
    payload?: object
  ): Promise<Message | void>
}

export type ChannelParamsMap = { [token: string]: boolean | number | string }

export type ChannelState = 'disconnected' | 'connecting' | 'connected'

type DisconnectEvent = Partial<{
  reason: ReasonError
}>

export interface ChannelEvents<T> {
  connect: () => void
  disconnect: (event: DisconnectEvent) => void
  restore: () => void
  close: (event: DisconnectEvent) => void
  message: (msg: T, meta?: MessageMeta) => void
}

export class Channel<
  ParamsType extends ChannelParamsMap = {},
  MessageType = Message,
  EventsType extends ChannelEvents<MessageType> = ChannelEvents<MessageType>
> {
  static readonly identifier: string

  readonly params: ParamsType
  readonly identifier: string
  readonly state: ChannelState
  readonly id: Identifier

  constructor(...args: {} extends ParamsType ? [undefined?] : [ParamsType])

  connecting(receiver: Receiver): void
  connected(id: Identifier): void
  restored(): void
  disconnected(reason?: ReasonError): void

  disconnect(): Promise<boolean>
  close(reason?: ReasonError): void
  perform(action: string, payload?: object): Promise<Message | void>
  receive(msg: MessageType, meta?: MessageMeta): void

  on<E extends keyof EventsType>(event: E, callback: EventsType[E]): Unsubscribe
  once<E extends keyof EventsType>(
    event: E,
    callback: EventsType[E]
  ): Unsubscribe

  /* eslint-disable @typescript-eslint/no-explicit-any */
  protected emit<E extends keyof EventsType>(
    event: E,
    ...args: EventsType[E] extends (...сargs: any) => any
      ? Parameters<EventsType[E]>
      : never
  ): void
}
