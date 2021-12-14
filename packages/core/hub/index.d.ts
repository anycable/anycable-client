import { Channel, Message, MessageMeta } from '../channel/index.js'

export class Entry<T = string> {
  pending(promise?: Promise<T>): Promise<T>
  isPending(): boolean

  mark(): void
  unmark(): void

  isFree(): boolean
}

export class Hub {
  entryFor(channel: Channel): Entry
  add(id: string, channel: Channel): void
  remove(id: string): Channel | void
  get(id: string): Channel | void
  transmit(id: string, msg: Message, meta: MessageMeta): void
  close(): void

  get channels(): Channel[]
  get size(): number
}
