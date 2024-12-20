import { Unsubscribe } from 'nanoevents'

import { ReasonError } from '../protocol/index.js'
import { Presence, PresenceEvent, PresenceInfo } from './presence.js'

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

export type InfoEvent = {
  type: string
  data?: object
}

export interface ChannelEvents<T, P = object | string> {
  connect: (event: ConnectEvent) => void
  disconnect: (event: ReasonError) => void
  close: (event?: ReasonError) => void
  message: (msg: T, meta?: MessageMeta) => void
  info: (event: InfoEvent) => void
  join: (event: PresenceEvent<P>) => void
  leave: (event: { id: string }) => void
  presence: (event: PresenceInfo<P>) => void
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export type ActionPayload = Record<string, any>

export interface ChannelActions {
  [key: string]: (...args: ActionPayload[]) => void
}

export class Channel<
  ParamsType extends ChannelParamsMap = {},
  MessageType extends Message = Message,
  EventsType extends ChannelEvents<MessageType> = ChannelEvents<MessageType>,
  ActionsType = any,
  PresenceType = object
> {
  static readonly identifier: string

  readonly params: ParamsType
  readonly channelId: string
  readonly state: ChannelState
  readonly identifier: Identifier
  readonly presence: Presence<PresenceType>

  constructor(...args: {} extends ParamsType ? [undefined?] : [ParamsType])

  attached(receiver: Receiver): boolean

  disconnect(): void
  perform<A extends keyof ActionsType>(
    action: A,
    ...payload: ActionsType extends ChannelActions
      ? [ActionPayload?]
      : ActionsType[A] extends (...arg: any) => void
      ? Parameters<ActionsType[A]>
      : []
  ): Promise<MessageType | void>
  send(payload: object): Promise<MessageType | void>
  receive(msg: MessageType, meta?: MessageMeta): void

  ensureSubscribed(): Promise<void>

  whisper(payload: MessageType): Promise<void>

  on<E extends keyof EventsType>(event: E, callback: EventsType[E]): Unsubscribe
  once<E extends keyof EventsType>(
    event: E,
    callback: EventsType[E]
  ): Unsubscribe

  /* eslint-disable @typescript-eslint/no-explicit-any */
  emit<E extends keyof EventsType>(
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
