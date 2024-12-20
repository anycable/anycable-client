import {
  Channel,
  Identifier,
  Message,
  MessageMeta,
  ChannelState
} from '../channel/index.js'
import { ReasonError } from '../protocol/index.js'

type subscriptionState = 'subscribed' | 'unsubscribed'

type CreateSubscriptionOptions = {
  subscribe: (sub: Subscription) => Promise<void>
  unsubscribe: (sub: Subscription) => Promise<void>
}

export class Subscriptions {
  all(): Subscription[]
  create(id: string, opts: CreateSubscriptionOptions): Subscription
  get(id: string): Subscription | undefined
  remove(id: string): void
}

type subscriptionLock = {
  release: () => void
  canceled: boolean
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
  notify(event: 'disconnected', err: ReasonError): void
  notify(event: 'closed', err?: ReasonError): void

  ensureSubscribed(): void
  ensureResubscribed(): void
  maybeUnsubscribe(): void
  close(err?: ReasonError): void

  acquire(state: subscriptionState): Promise<subscriptionLock>
  pending(state: subscriptionState): Promise<void>
}

export type HubOptions = Partial<{
  concurrentSubscribes: boolean
}>

export class Hub {
  get subscriptions(): Subscriptions
  get channels(): Channel[]
  get size(): number

  constructor(opts?: HubOptions)

  subscribe(id: string, remoteId: string): void
  unsubscribe(id: string): void
  transmit(remoteId: string, msg: Message, meta: MessageMeta): void
  notify(remoteId: string, event: string, msg: Message): void
  close(): void
}
