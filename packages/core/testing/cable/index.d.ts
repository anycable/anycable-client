import { Channel, Identifier } from '../../channel/index.js'

type PerformedAction = { action: string; payload: object }

export class TestCable {
  outgoing: PerformedAction[]

  connect(): Promise<void>
  subscribe(channel: Channel): Promise<Identifier>
  unsubscribe(channel: Channel): Promise<void>
  perform(channel: Channel, action: string, payload?: object): Promise<void>
}
