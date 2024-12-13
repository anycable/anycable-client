import { Unsubscribe } from 'nanoevents'

import {
  Channel,
  Message,
  ChannelParamsMap,
  Identifier,
  ChannelEvents
} from '../channel/index.js'
import { Transport } from '../transport/index.js'
import { Protocol, ReasonError } from '../protocol/index.js'
import { Hub, HubOptions } from '../hub/index.js'
import { Encoder } from '../encoder/index.js'
import { Logger } from '../logger/index.js'
import { Monitor } from '../monitor/index.js'

type ConnectEvent = Partial<{
  restored: boolean
  reconnect: boolean
}>

export type InfoEvent = {
  type: string
  identifier?: Identifier
  data?: object
}

export interface CableEvents {
  connect: (event: ConnectEvent) => void
  disconnect: (event: ReasonError) => void
  close: (event?: ReasonError) => void
  keepalive: (msg?: Message) => void
  info: (event: InfoEvent) => void
}

export type CableOptions = {
  transport: Transport
  protocol: Protocol
  encoder: Encoder
  logger?: Logger
  lazy?: boolean
  hubOptions?: HubOptions
  performFailures?: 'throw' | 'warn' | 'ignore'
}

export type CableState =
  | 'idle'
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'closed'

export class GhostChannel extends Channel {}

export const PUBSUB_CHANNEL: string

type PubSubChannelParams =
  | { stream_name: string }
  | { signed_stream_name: string }

export class PubSubChannel extends Channel<
  PubSubChannelParams,
  Message,
  ChannelEvents<Message>,
  never
> {}

export class Cable {
  transport: Transport
  hub: Hub
  protocol: Protocol
  encoder: Encoder
  logger: Logger
  monitor?: Monitor

  readonly state: CableState
  readonly sessionId: string | undefined

  constructor(opts: CableOptions)

  connect(): Promise<void>
  subscribe<T extends Channel>(channel: T): T
  unsubscribe(channel: Channel): void
  perform(
    identifier: Identifier,
    action?: string,
    payload?: object
  ): Promise<Message | void>
  disconnect(): void

  subscribeTo(channel: string, params?: ChannelParamsMap): GhostChannel
  subscribeTo<P extends ChannelParamsMap, T extends Channel<P>>(
    channel: {
      new (...args: {} extends P ? [undefined?] : [P]): T
    },
    ...args: {} extends P ? [undefined?] : [P]
  ): T

  streamFrom(name: string): PubSubChannel
  streamFromSigned(signedName: string): PubSubChannel

  keepalive(msg?: Message): void

  send(msg: object): void

  on<E extends keyof CableEvents>(
    event: E,
    callback: CableEvents[E]
  ): Unsubscribe
  once<E extends keyof CableEvents>(
    event: E,
    callback: CableEvents[E]
  ): Unsubscribe

  connected(): void
  restored(remoteIds: string[]): void
  disconnected(reason?: ReasonError): void
  closed(reason?: string | ReasonError): void
  notify(event: string, data?: object): void
  notify(event: string, identifier?: Identifier, data?: object): void

  setSessionId(sid: string): void
}

export class NoConnectionError extends Error {}
