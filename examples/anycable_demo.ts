import { createCable, Channel } from '../packages/web/index.js'

let cable = createCable()

type operation = 'deleted' | 'updated' | 'created'
type params = { id: string; workspace: string }
type message = { type: operation; completed?: boolean; html?: string }

export class ListChannel extends Channel<params, message> {
  static identifier = 'ListChannel'
}

let channel = new ListChannel({ id: '42', workspace: 'demo' })

await cable.subscribe(channel)

channel.on('message', msg => {
  if (msg.type === 'created') {
    // do smth
  }
})
