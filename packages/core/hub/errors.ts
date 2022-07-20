import { Hub } from '../index'

const hub = new Hub()
const subscription = hub.subscriptions.fetch('a')

// THROWS Argument of type 'number' is not assignable
hub.subscriptions.fetch(1)

// THROWS Argument of type '{}' is not assignable
subscription.add('x')

// THROWS Argument of type 'number' is not assignable
hub.subscriptions.remove(0)

// THROWS Argument of type 'number' is not assignable
hub.transmit(12, {}, {})
