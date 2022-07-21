import { Unsubscribe } from 'nanoevents'

import {
  Channel,
  Message,
  ChannelParamsMap,
  Identifier
} from '../channel/index.js'
import { Transport } from '../transport/index.js'
import { Protocol, ReasonError } from '../protocol/index.js'
import { Hub } from '../hub/index.js'
import { Encoder } from '../encoder/index.js'
import { Logger } from '../logger/index.js'
import { Monitor } from '../monitor/index.js'

type ConnectEvent = Partial<{
  restored: boolean
  reconnect: boolean
}>

export interface CableEvents {
  connect: (event: ConnectEvent) => void
  disconnect: (event: ReasonError) => void
  close: (event?: ReasonError) => void
  keepalive: (msg?: Message) => void
}

export type CableOptions = {
  transport: Transport
  protocol: Protocol
  encoder: Encoder
  logger?: Logger
  lazy?: boolean
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

  readonly state: CableState

  constructor(opts: CableOptions)

  connect(): Promise<void>
  subscribe<T extends Channel>(channel: T): T
  unsubscribe(channel: Channel): void
  perform(
    identifier: Identifier,
    action: string,
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
}

export class NoConnectionError extends Error {}
