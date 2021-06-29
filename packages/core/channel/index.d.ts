export interface Connector {
  subscribe(data: { channel: string; params?: object }): Promise<string>
  unsubscribe(sid: string): Promise<boolean>
  perform(sid: string, action: string, payload?: object): Promise<object>
}

export type ParamsMap = { [token: string]: boolean | number | string }

export type PerformPayload = object | string

declare class Channel<ParamsType extends ParamsMap = {}> {
  static readonly identifier: string

  readonly identifier: string
  readonly params: ParamsType

  constructor(params?: ParamsType)

  connect(connector: Connector): Promise<boolean>
  disconnect(): Promise<boolean>
  perform(action: string, payload?: PerformPayload): Promise<PerformPayload>
}
