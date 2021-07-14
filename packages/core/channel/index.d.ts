import { Unsubscribe } from 'nanoevents'

export type Identifier = string

export type Message = object | string | number
export type MessageMeta = Partial<{
  id: string
}>

export interface Receiver {
  unsubscribe(id: Identifier): Promise<void>
  perform(
    id: Identifier,
    action: string,
    payload?: object
  ): Promise<Message | void>
}

export type ChannelParamsMap = { [token: string]: boolean | number | string }

export type ChannelState = 'disconnected' | 'connecting' | 'connected'

type DisconnectEvent = Partial<{
  reason: string | Error
}>

export interface ChannelEvents<MessageType> {
  connect: () => void
  disconnect: (event: DisconnectEvent) => void
  restore: () => void
  close: (event: DisconnectEvent) => void
  message: (msg: MessageType, meta?: MessageMeta) => void
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

  constructor(params?: ParamsType)

  connecting(receiver: Receiver): void
  connected(id: Identifier): void
  restored(): void
  disconnected(reason?: string | Error): void

  disconnect(): Promise<void>
  close(reason?: string | Error): void
  perform(action: string, payload?: MessageType): Promise<MessageType | void>
  receive(msg: MessageType, meta?: MessageMeta)

  on<E extends keyof EventsType>(event: E, callback: EventsType[E]): Unsubscribe
  once<E extends keyof EventsType>(
    event: E,
    callback: EventsType[E]
  ): Unsubscribe
  protected emit<K extends keyof EventsType>(
    event: K,
    ...args: Parameters<EventsType[K]>
  ): void
}
