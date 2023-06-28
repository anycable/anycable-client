import { Unsubscribe } from 'nanoevents'
import WebSocket from 'ws'

import { Transport, TransportEvents } from '../transport/index.js'

type WebSocketPayload = string | Uint8Array

export type WebSocketOpts = Partial<{
  /* eslint-disable @typescript-eslint/no-explicit-any */
  websocketImplementation: any
  websocketOptions: object
  subprotocol: string
  format: 'text' | 'binary'
}>

export class WebSocketTransport<
  WS = WebSocket,
  DataType extends WebSocketPayload = WebSocketPayload
> implements Transport<DataType>
{
  readonly ws?: WS
  readonly url: string
  readonly connected: boolean
  constructor(url: string, opts?: WebSocketOpts)

  open(): Promise<void>
  send(data: DataType): void
  close(): Promise<void>

  setURL(url: string): void
  setParam(key: string, value: string): void

  displayName(): string

  on<E extends keyof TransportEvents<DataType>>(
    event: E,
    callback: TransportEvents<DataType>[E]
  ): Unsubscribe
  once<E extends keyof TransportEvents<DataType>>(
    event: E,
    callback: TransportEvents<DataType>[E]
  ): Unsubscribe
}
