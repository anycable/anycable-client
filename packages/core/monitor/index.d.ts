import { Unsubscribe } from 'nanoevents'

import { CableEvents } from '../cable/index.js'
import { Logger } from '../logger/index.js'
import { ReasonError } from '../protocol/index.js'

export type ReconnectStrategy = (attempts: number) => number
export interface MonitorOptions {
  pingInterval: number
  maxMissingPings?: number
  maxReconnectAttempts?: number
  reconnectStrategy?: ReconnectStrategy
  logger?: Logger
}

export const backoffWithJitter: (
  interval: number,
  opts?: Partial<{
    backoffRate: number
    jitterRatio: number
    maxInterval: number
  }>
) => ReconnectStrategy

export interface Monitorable {
  connect(): Promise<void>
  close(): void
  disconnected(err: ReasonError): void

  on<E extends keyof CableEvents>(
    event: E,
    callback: CableEvents[E]
  ): Unsubscribe
}

export class Monitor {
  readonly state:
    | 'pending_connect'
    | 'connected'
    | 'pending_disconnect'
    | 'pending_reconnect'
    | 'disconnected'

  readonly target?: Monitorable

  constructor(opts: MonitorOptions)
  watch(target: Monitorable): void
  reconnectNow(): boolean
  dispose(): void
}
