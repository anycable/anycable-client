/*
Use this example to communicate with the BenchmarkChannel from the terminal.

BenchmarkChannel MUST implement `#echo` action.
Existing implementations: `anyt --only-rails`, gobench (from anycable-go), websocket-shootout

NOTE: Run with modules support enabled:

  node --experimental-vm-modules examples/benchmark_channel.js
*/
import WebSocket from 'ws'
import { exit } from 'process'
import { createCable, Channel } from '@anycable/core'

import { Logger } from '../packages/web/logger/index.js'

let logger = new Logger('debug')
let url = process.env.URL || 'ws://localhost:8080/cable'

let cable = createCable(url, {
  websocketImplementation: WebSocket,
  logger
})

export class BenchmarkChannel extends Channel {
  static identifier = 'BenchmarkChannel'

  echo(data) {
    this.perform('echo', { data })
  }
}

let channel = new BenchmarkChannel()

await cable.subscribe(channel)

let echoPromise = new Promise((resolve, reject) => {
  setTimeout(() => reject(Error('Timed out to receive message')), 1000)

  channel.on('message', msg => {
    if (msg.data === 'hello') {
      resolve()
    } else {
      reject(Error(`Unexpected message: ${msg}`))
    }
  })
})

channel.echo('hello')

try {
  await echoPromise
} catch (err) {
  logger.error(err)
  exit(1)
}

logger.info('Success!')
exit(0)
