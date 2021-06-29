import { Client } from './index.js'
import { Channel } from '../channel/index.js'

const client = new Client('ws://demo.anycable.io/cable')

const ch = new Channel()
// ch.connect(client)
