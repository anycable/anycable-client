import { Hub } from '../index'

const hub = new Hub()
const subscription = hub.subscriptions.get('a')!

// THROWS Argument of type 'number' is not assignable
hub.subscriptions.get(1)

// THROWS Argument of type 'string' is not assignable
subscription.add('x')

// THROWS Argument of type 'number' is not assignable
hub.subscriptions.remove(0)

// THROWS Argument of type 'number' is not assignable
hub.transmit(12, {}, {})
