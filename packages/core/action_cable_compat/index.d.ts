import { Channel, Message, ChannelParamsMap } from '../channel/index.js'
import { Cable } from '../cable/index.js'

export type ActionCableMixin<T extends Message> = Partial<{
  initialized: () => void
  connected: () => void
  rejected: () => void
  received: (data: T) => void
  disconnected: () => void
  [key: string]: unknown
}>

export class ActionCableSubscription {
  channel: ActionCableChannel
  identifier: string

  perform(action: string, payload?: object): void
  send(payload: object): void
  whisper(payload: object): Promise<void>
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

  send(data: object): void
  connect(): Promise<void>
  disconnect(): void
  ensureActiveConnection(): Promise<void>
}
