import { Unsubscribe } from 'nanoevents'

import { ReasonError } from '../protocol/index.js'

export type Identifier = string

export type Message = object | string | number
export type MessageMeta = Partial<{
  id: string
}>

export interface Receiver {
  unsubscribe(channel: Channel): void
  perform(
    identifier: Identifier,
    action?: string,
    payload?: object
  ): Promise<Message | void>
}

export type ChannelParamsMap = { [token: string]: boolean | number | string }

export type ChannelState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'closed'

type ConnectEvent = Partial<{
  restored: boolean
  reconnect: boolean
}>

export interface ChannelEvents<T> {
  connect: (event: ConnectEvent) => void
  disconnect: (event: ReasonError) => void
  close: (event?: ReasonError) => void
  message: (msg: T, meta?: MessageMeta) => void
}

export class Channel<
  ParamsType extends ChannelParamsMap = {},
  MessageType = Message,
  EventsType extends ChannelEvents<MessageType> = ChannelEvents<MessageType>
> {
  static readonly identifier: string

  readonly params: ParamsType
  readonly channelId: string
  readonly state: ChannelState
  readonly identifier: Identifier

  constructor(...args: {} extends ParamsType ? [undefined?] : [ParamsType])

  attached(receiver: Receiver): boolean

  disconnect(): void
  perform(action: string, payload?: object): Promise<Message | void>
  send(payload: object): Promise<Message | void>
  receive(msg: MessageType, meta?: MessageMeta): void

  ensureSubscribed(): Promise<void>

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

  connecting(): void
  connected(): void
  restored(): void
  disconnected(reason?: ReasonError): void
  closed(reason?: ReasonError): void
}
