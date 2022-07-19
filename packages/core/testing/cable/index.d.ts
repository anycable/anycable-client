import { Channel, Identifier } from '../../channel/index.js'

type PerformedAction = { action: string; payload: object }

export class TestCable {
  outgoing: PerformedAction[]

  connect(): Promise<void>
  subscribe<T extends Channel>(channel: T): T
  unsubscribe(channel: Channel): void
  perform(
    identifier: Identifier,
    action: string,
    payload?: object
  ): Promise<void>
}
