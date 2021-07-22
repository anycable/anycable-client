import { Unsubscribe } from 'nanoevents'

import { CableEvents } from '../cable/index.js'
import { Logger } from '../logger/index.js'

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
  connect(): void
  close(): void
  disconnected(err: string | Error): void

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

  readonly target: Monitorable

  constructor(target: Monitorable, opts: MonitorOptions)
  reconnectNow(): boolean
  dispose(): void
}
