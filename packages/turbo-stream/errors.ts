import { createCable } from '@anycable/core'
import { TurboChannel, start } from './index'

// THROWS Expected 2-3 arguments, but got 1
new TurboChannel('TestChannel')

let element = new HTMLElement()

// THROWS Argument of type
new TurboChannel(element, 'TestChannel', 'stream_name')

let cable = createCable()

// THROWS Argument of type
start(cable, { tag: 'turbo-stream' })

// THROWS Argument of type
start(cable, { tagName: 'turbo-stream', channel: TurboChannel })

start(cable, {
  tagName: 'turbo-stream',
  // THROWS Property 'prototype' is missing in type 'TurboChannel'
  channelClass: new TurboChannel(element, 'TestChannel')
})
