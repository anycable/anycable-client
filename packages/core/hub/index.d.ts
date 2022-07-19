import {
  Channel,
  Message,
  MessageMeta,
  ChannelParamsMap
} from '../channel/index.js'

export class Subscription {
  readonly id: string
  readonly channel: string
  readonly params: ChannelParamsMap
  readonly remoteId: string
}

type unsubscribeRequest = Promise<void>

export class Unsubscribes {
  add(id: string, promise: unsubscribeRequest): void
  remove(id: string): void
  get(id: string): unsubscribeRequest | void
}

export class Hub {
  add(id: string, channel: Channel): void
  remove(id: string): void
  findSubscription(id: string): Subscription | void
  subscribe(id: string, remoteId: string): void
  transmit(id: string, msg: Message, meta: MessageMeta): void
  close(): void

  channelsFor(id: string): Channel[]
  removeChannel(channel: Channel): string

  get unsubscribes(): Unsubscribes
  get channels(): Channel[]
  get activeChannels(): Channel[]
  get pendingChannels(): Channel[]

  get subscriptions(): Subscription[]
  get activeSubscriptions(): Subscription[]
  get pendingSubscriptions(): Subscription[]

  get size(): number
}
