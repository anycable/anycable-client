import { Hub } from '../index'
import { Channel } from '../index'

const channel = new Channel()
const hub = new Hub()

// THROWS Argument of type 'number' is not assignable
hub.add(12, channel)

// THROWS Argument of type '{}' is not assignable
hub.add('12', {})

// THROWS Argument of type 'number' is not assignable
hub.remove(0)

// THROWS Argument of type 'number' is not assignable
hub.transmit(12, {}, {})
