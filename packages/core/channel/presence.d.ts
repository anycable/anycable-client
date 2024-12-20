export type PresenceChangeEvent<T> = {
  type?: 'join' | 'leave'
  id: string
  info?: T
}

export type PresenceInfoEvent<T> = {
  type: 'info'
  total: number
  records: PresenceChangeEvent<T>[]
}

export type PresenceErrorEvent = {
  type: 'error'
}

export type PresenceEvent<T> =
  | PresenceChangeEvent<T>
  | PresenceInfoEvent<T>
  | PresenceErrorEvent

export type PresenceState<T> = {
  [key: string]: T
}

export type PresenceChannel<T> = {
  on(event: string, callback: (msg: PresenceEvent<T>) => void): () => void
  perform(action: string, data: object): Promise<PresenceInfoEvent<T>>
}

export class Presence<T> {
  constructor(channel: PresenceChannel<T>)
  reset(): void
  dispose(): void
  join(id: string | number, info: string | object): Promise<void>
  leave(): Promise<void>
  info(): Promise<PresenceState<T> | undefined>
}
