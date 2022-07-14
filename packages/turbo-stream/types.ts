import { createCable } from '@anycable/core'

import { TurboChannel, start } from './index'

let element = new HTMLElement()

new TurboChannel(element, 'TestChannel')

new TurboChannel(element, 'TestChannel', { stream: 'test', user_id: 1 })

let cable = createCable()

start(cable, { tagName: 'turbo-stream', channelClass: TurboChannel })

class CustomChannel extends TurboChannel {}

start(cable, { tagName: 'turbo-stream', channelClass: CustomChannel })
