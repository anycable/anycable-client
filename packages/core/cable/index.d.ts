import { Unsubscribe } from 'nanoevents'

import {
  Channel,
  Message,
  Identifier,
  ChannelParamsMap
} from '../channel/index.js'
import { Transport } from '../transport/index.js'
import { Protocol, ReasonError } from '../protocol/index.js'
import { Hub } from '../hub/index.js'
import { Encoder } from '../encoder/index.js'
import { Logger } from '../logger/index.js'
import { Monitor } from '../monitor/index.js'

type DisconnectEvent = Partial<{
  reason: string
}>

export interface CableEvents {
  connect: () => void
  disconnect: (event: DisconnectEvent) => void
  close: (event: DisconnectEvent) => void
  keepalive: (msg?: Message) => void
}

export interface Cache<T> {
  read(identifier: string, params?: ChannelParamsMap): T | undefined
  write(channel: T, identifier: string, params?: ChannelParamsMap): void
  delete(identifier: string, params?: ChannelParamsMap): boolean
}

export type CableOptions = {
  transport: Transport
  protocol: Protocol
  encoder: Encoder
  logger?: Logger
  lazy?: boolean
  channelsCache?: Cache<Channel>
}

export type CableState = 'idle' | 'disconnected' | 'connecting' | 'connected'

export class GhostChannel extends Channel {}

export class Cable {
  transport: Transport
  hub: Hub
  protocol: Protocol
  encoder: Encoder
  logger: Logger
  monitor?: Monitor
  cache?: Cache<Channel>

  readonly state: CableState

  constructor(opts: CableOptions)

  connect(): Promise<void>
  subscribe(channel: Channel): Promise<Identifier>
  unsubscribe(id: Identifier): Promise<boolean>
  perform(
    id: Identifier,
    action: string,
    payload?: object
  ): Promise<Message | void>
  disconnect(): void
  close(reason?: string | ReasonError): void

  subscribeTo(channel: string, params?: ChannelParamsMap): Promise<GhostChannel>
  subscribeTo<P extends ChannelParamsMap, T extends Channel<P>>(
    channel: {
      new (...args: {} extends P ? [undefined?] : [P]): T
    },
    ...args: {} extends P ? [undefined?] : [P]
  ): Promise<T>

  connected(): void
  restored(): void
  disconnected(reason?: ReasonError): void

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
}

export class NoConnectionError extends Error {}
