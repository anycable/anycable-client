import { Channel } from '../../channel/index.js'

type PerformedAction = { action: string; payload: object }

export class TestCable {
  outgoing: PerformedAction[]

  connect(): Promise<void>
  subscribe<T extends Channel>(channel: T): T
  unsubscribe(channel: Channel): void
  perform(channel: Channel, action: string, payload?: object): Promise<void>
}
