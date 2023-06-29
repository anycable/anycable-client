import { Unsubscribe } from 'nanoevents'
import { Transport } from '@anycable/core'

type LongPollingOptions = Partial<{
  // For how long (in ms) to wait before sending a new request
  cooldownPeriod: number
  // For how long to buffer outgoing commands (in ms) before sending them to the server
  sendBuffer: number
  // Interval for emulated ping events. Must correspond to monitor's ping interval
  pingInterval: number
  // Credentials for underlying fetch
  credentials: 'omit' | 'same-origin' | 'include'
  /* eslint-disable @typescript-eslint/no-explicit-any */
  fetchImplementation: any
}>

export class LongPollingTransport implements Transport<string> {
  readonly url: string
  readonly connected: boolean

  constructor(url: string, opts?: LongPollingOptions)

  open(): Promise<void>
  send(data: string): void
  close(): Promise<void>

  displayName(): string

  setURL(url: string): void
  setParam(key: string, value: string): void

  on<E extends keyof TransportEvents<string>>(
    event: E,
    callback: TransportEvents<string>[E]
  ): Unsubscribe
  once<E extends keyof TransportEvents<string>>(
    event: E,
    callback: TransportEvents<string>[E]
  ): Unsubscribe
}
