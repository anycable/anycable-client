import {
  Cable,
  Encoder,
  Transport,
  Logger,
  Monitor,
  LogLevel
} from '@anycable/core'

export { Channel } from '@anycable/core'

export type ProtocolID =
  | 'actioncable-v1-json'
  | 'actioncable-v1-msgpack'
  | 'actioncable-v1-protobuf'

export interface CreateOptions {
  protocol: ProtocolID

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

export const createCable: (url?: string, opts?: Partial<CreateOptions>) => Cable
