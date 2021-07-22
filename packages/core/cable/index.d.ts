import { Unsubscribe } from 'nanoevents'
import { Channel, Message, MessageMeta, Identifier } from '../channel/index.js'
import { Transport } from '../transport/index.js'
import { Protocol } from '../protocol/index.js'
import { Hub } from '../hub/index.js'
import { Encoder } from '../encoder/index.js'
import { Logger } from '../logger/index.js'
import { Monitor } from '../monitor/index.js'

type DisconnectEvent = Partial<{
  reason: string | Error
}>

export interface CableEvents {
  connect: () => void
  disconnect: (event?: DisconnectEvent) => void
  close: (event?: DisconnectEvent) => void
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
  subscribe(channel: Channel): Promise<Identifier>
  unsubscribe(id: Identifier): Promise<void>
  perform(
    id: Identifier,
    action: string,
    payload?: object
  ): Promise<Message | void>
  disconnect(): void
  close(reason?: string | Error): void

  connected(): void
  restored(): void
  disconnected(reason?: string | Error): void

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
