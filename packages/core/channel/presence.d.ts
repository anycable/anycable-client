export type PresenceEvent<T> = {
  id: string
  info: T
}

export type PresenceInfo<T> = {
  total: number
  records: PresenceEvent<T>[]
}

export type PresenceState<T> = {
  [key: string]: T
}

export type PresenceChannel<T> = {
  on(event: string, callback: (msg: PresenceEvent<T>) => void): () => void
  perform(action: string, data: object): Promise<PresenceInfo<T>>
}

export class Presence<T> {
  constructor(channel: PresenceChannel<T>)
  reset(): void
  dispose(): void
  join(id: string | number, info: string | object): Promise<void>
  leave(): Promise<void>
  info(): Promise<PresenceState<T> | undefined>
}
