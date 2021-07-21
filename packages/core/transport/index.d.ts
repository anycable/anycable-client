import { Unsubscribe } from 'nanoevents'

export type TransportEvents<T> = {
  open: () => void
  close: (err?: Error) => void
  error: (err: Error) => void
  data: (payload: T) => void
}

export interface Env {
  [index: string]: string
}

export interface Transport<PayloadType = string> {
  open(): Promise<void>
  send(data: PayloadType): void
  close(): Promise<void>

  set(key: string, value: string): void

  on<E extends keyof TransportEvents<PayloadType>>(
    event: E,
    callback: TransportEvents<PayloadType>[E]
  ): Unsubscribe
  once<E extends keyof TransportEvents<PayloadType>>(
    event: E,
    callback: TransportEvents<PayloadType>[E]
  ): Unsubscribe
}
