import { Unsubscribe } from 'nanoevents'

export type Message = object | string
export type Meta = {
  id: string
}

export type ConnectorCallback = (msg: Message, meta: Meta) => void

export interface Pipe {
  send(data: { action: string; payload?: Message }): Promise<?Message>
  close(): Promise<void>
}

export interface Connector {
  subscribe(
    data: { channel: string; params?: object },
    callback: ConnectorCallback
  ): Promise<Pipe>
}

export type ParamsMap = { [token: string]: boolean | number | string }

export interface Events {
  start: () => void
  stop: () => void
  data: (msg: Message, meta?: Meta) => void
}

declare class Channel<
  ParamsType extends ParamsMap = {},
  EventsType extends Events = Events
> {
  static readonly identifier: string

  readonly params: ParamsType
  readonly connected: boolean
  readonly pipe: Pipe

  constructor(connector: Connector, params?: ParamsType)

  connect(): Promise<void>
  disconnect(): Promise<void>
  perform(action: string, payload?: Message): Promise<?Message>

  handleIncoming(msg: Message, meta?: Meta)

  on<E extends keyof EventsType>(event: E, callback: Events[E]): Unsubscribe
  once<E extends keyof EventsType>(event: E, callback: Events[E]): Unsubscribe
  protected emit<K extends keyof EventsType>(
    event: K,
    ...args: Parameters<EventsType[K]>
  ): void
}
