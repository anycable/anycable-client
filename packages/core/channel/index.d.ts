import { Unsubscribe } from 'nanoevents'

export type Message = object | string
export type MessageMeta = {
  id: string
}

export type ReceiveCallback = (msg: Message, meta: MessageMeta) => void

export interface Line {
  send(data: { action: string; payload?: Message }): Promise<?Message>
  receive(callback: ReceiveCallback): void
  close(): Promise<void>
}

export interface Receiver {
  subscribe(channel: string, params?: object): Promise<Line>
}

export type ChannelParamsMap = { [token: string]: boolean | number | string }

export interface ChannelEvents {
  start: () => void
  stop: () => void
  data: (msg: Message, meta?: MessageMeta) => void
}

declare class Channel<
  ParamsType extends ChannelParamsMap = {},
  EventsType extends ChannelEvents = ChannelEvents
> {
  static readonly identifier: string

  readonly params: ParamsType
  readonly connected: boolean
  readonly line: Line

  constructor(params?: ParamsType)

  connect(receiver: Receiver): Promise<void>
  disconnect(): Promise<void>
  perform(action: string, payload?: Message): Promise<?Message>
  protected receive(msg: Message, meta?: MessageMeta)

  on<E extends keyof EventsType>(
    event: E,
    callback: ChannelEvents[E]
  ): Unsubscribe
  once<E extends keyof EventsType>(
    event: E,
    callback: ChannelEvents[E]
  ): Unsubscribe
  protected emit<K extends keyof EventsType>(
    event: K,
    ...args: Parameters<EventsType[K]>
  ): void
}
