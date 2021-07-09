import { Unsubscribe } from 'nanoevents'

export interface TransportEvents<T> {
  open: () => void
  close: () => void
  data: (payload: T) => void
}

export interface Transport<PayloadType, OptionsType = {}> {
  constructor(url: string): void
  constructor(url: string, params: OptionsType): void

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
  protected emit<K extends keyof TransportEvents<PayloadType>>(
    event: K,
    ...args: Parameters<TransportEvents<PayloadType>[K]>
  ): void
}
