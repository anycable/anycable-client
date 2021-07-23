import { Transport } from '../transport/index.js'
import { Logger, LogLevel } from '../logger/index.js'
import { Encoder } from '../encoder/index.js'
import { Monitor } from '../monitor/index.js'
import { Cable } from '../cable/index.js'
import { Protocol } from '../protocol/index.js'

export type ProtocolID =
  | 'actioncable-v1-json'
  | 'actioncable-v1-msgpack'
  | 'actioncable-v1-protobuf'

export interface CreateOptions {
  protocol: ProtocolID | Protocol

  transport: Transport
  /* eslint-disable @typescript-eslint/no-explicit-any */
  websocketImplementation: any

  encoder: Encoder

  logger: Logger
  logLevel: LogLevel

  monitor: Monitor
  pingInterval: number

  lazy: boolean
}

export function createCable(url: string, opts?: Partial<CreateOptions>): Cable
export function createCable(opts?: Partial<CreateOptions>): Cable
