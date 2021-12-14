import { Transport } from '../transport/index.js'
import { Logger, LogLevel } from '../logger/index.js'
import { Encoder } from '../encoder/index.js'
import { Monitor } from '../monitor/index.js'
import { Cable, Cache } from '../cable/index.js'
import { Protocol } from '../protocol/index.js'
import { Channel, Message, ChannelParamsMap } from '../channel/index.js'

export type ProtocolID =
  | 'actioncable-v1-json'
  | 'actioncable-v1-msgpack'
  | 'actioncable-v1-protobuf'

export type TokenRefresher = (transport: Transport) => Promise<void>

export interface CreateOptions {
  protocol: ProtocolID | Protocol

  transport: Transport
  /* eslint-disable @typescript-eslint/no-explicit-any */
  websocketImplementation: any

  encoder: Encoder

  logger: Logger
  logLevel: LogLevel

  monitor: Monitor | false
  pingInterval: number

  lazy: boolean

  tokenRefresher: TokenRefresher

  channelsCache: Cache<Channel>
}

export const DEFAULT_OPTIONS: Partial<CreateOptions>

export function createCable(url: string, opts?: Partial<CreateOptions>): Cable
export function createCable(opts?: Partial<CreateOptions>): Cable

export type ActionCableMixin = Partial<{
  initialized: () => void
  connected: () => void
  rejected: () => void
  received: (data: Message) => void
  disconnected: () => void
}>

export class ActionCableChannel extends Channel {
  unsubscribe(): void
}

export class ActionCableSubscriptions {
  create<M extends ActionCableMixin>(
    params: ChannelParamsMap | string,
    mixin: ActionCableMixin
  ): ActionCableChannel & M
}

export class ActionCableConsumer {
  readonly cable: Cable
  readonly subscriptions: ActionCableSubscriptions
}

export function createConsumer(
  url: string,
  opts?: Partial<CreateOptions>
): ActionCableConsumer
export function createConsumer(
  opts?: Partial<CreateOptions>
): ActionCableConsumer
