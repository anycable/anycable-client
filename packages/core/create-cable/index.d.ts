import { Transport } from '../transport/index.js'
import { Logger, LogLevel } from '../logger/index.js'
import { Encoder } from '../encoder/index.js'
import { Monitor, ReconnectStrategy } from '../monitor/index.js'
import { Cable } from '../cable/index.js'
import { Protocol } from '../protocol/index.js'
import { Channel, Message, ChannelParamsMap } from '../channel/index.js'
import { Options } from '../action_cable/index.js'
import { ExtendedOptions } from '../action_cable_ext/index.js'
import { WebSocketAuthStrategy } from '../websocket/index.js'

export type ExtendedProtocolID =
  | 'actioncable-v1-ext-json'
  | 'actioncable-v1-ext-msgpack'
  | 'actioncable-v1-ext-protobuf'

export type ProtocolID =
  | 'actioncable-v1-json'
  | 'actioncable-v1-msgpack'
  | 'actioncable-v1-protobuf'
  | ExtendedProtocolID

export type TransportConfigurator = (
  transport: Transport,
  params: { initial: boolean }
) => Promise<void>
export type TokenRefresher = (transport: Transport) => Promise<void>

type ProtocolOptions<T extends Protocol | ProtocolID> = T extends Protocol
  ? never
  : T extends ExtendedProtocolID
  ? ExtendedOptions
  : Options

export interface CreateOptions<P extends ProtocolID | Protocol> {
  protocol: P
  subprotocol: string

  protocolOptions: ProtocolOptions<P>

  transport: Transport
  /* eslint-disable @typescript-eslint/no-explicit-any */
  websocketImplementation: any
  websocketFormat: string
  websocketOptions: object
  websocketAuthStrategy: WebSocketAuthStrategy

  fallbacks: Transport[]

  encoder: Encoder

  logger: Logger
  logLevel: LogLevel

  monitor: Monitor | false
  pingInterval: number

  lazy: boolean

  transportConfigurator: TransportConfigurator
  tokenRefresher: TokenRefresher

  reconnectStrategy: ReconnectStrategy
  maxMissingPings: number
  maxReconnectAttempts: number

  historyTimestamp: number | false

  concurrentSubscribes: boolean
  performFailures: 'throw' | 'warn' | 'ignore'

  auth: { token?: string; param?: string }
}

export const DEFAULT_OPTIONS: Partial<CreateOptions<ProtocolID | Protocol>>

export function createCable(
  url: string,
  opts?: Partial<CreateOptions<ProtocolID | Protocol>>
): Cable
export function createCable(
  opts?: Partial<CreateOptions<ProtocolID | Protocol>>
): Cable

export type ActionCableMixin<T extends Message> = Partial<{
  initialized: () => void
  connected: () => void
  rejected: () => void
  received: (data: T) => void
  disconnected: () => void
}>

export class ActionCableSubscription {
  channel: ActionCableChannel
  identifier: string

  perform(action: string, payload?: object): void
  send(payload: object): void
  unsubscribe(): void
}

export class ActionCableChannel extends Channel {
  subscription: ActionCableSubscription
}

export class ActionCableSubscriptions {
  create<M extends ActionCableMixin<T> = {}, T extends Message = Message>(
    params: ChannelParamsMap | string,
    mixin: ActionCableMixin<T>
  ): ActionCableSubscription & M
  create(params: ChannelParamsMap | string): ActionCableSubscription
  findAll(identifier: string): ActionCableSubscription[]
}

export class ActionCableConsumer {
  readonly cable: Cable
  readonly subscriptions: ActionCableSubscriptions
}

export function createConsumer(
  url: string,
  opts?: Partial<CreateOptions<ProtocolID | Protocol>>
): ActionCableConsumer
export function createConsumer(
  opts?: Partial<CreateOptions<ProtocolID | Protocol>>
): ActionCableConsumer
