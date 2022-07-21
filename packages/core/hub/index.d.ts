import {
  Channel,
  Identifier,
  Message,
  MessageMeta,
  ChannelState
} from '../channel/index.js'
import { ReasonError } from '../protocol/index.js'

type subscriptionState = 'subscribed' | 'unsubscribed'

export class Subscriptions {
  all(): Subscription[]
  fetch(id: string): Subscription
  get(id: string): Subscription | undefined
  remove(id: string): void
}

export class Subscription {
  get intent(): subscriptionState
  get state(): ChannelState
  get id(): string
  get remoteId(): Identifier

  get channels(): Channel[]

  add(channel: Channel): void
  remove(channel: Channel): void

  notify(event: 'connecting' | 'connected' | 'restored'): void
  notify(event: 'closed' | 'disconnected', err: ReasonError): void

  pending(state: subscriptionState, promise: Promise<void>): void
  pending(state: subscriptionState): Promise<void>

  hasPending(state: subscriptionState): boolean
}

export class Hub {
  get subscriptions(): Subscriptions
  get channels(): Channel[]
  get size(): number

  subscribe(id: string, remoteId: string): void
  unsubscribe(id: string): void
  transmit(remoteId: string, msg: Message, meta: MessageMeta): void
  close(): void
}
