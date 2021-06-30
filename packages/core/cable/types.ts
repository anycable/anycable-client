import { Cable } from './index.js'
import { Channel } from '../channel/index.js'

const cable = new Cable('ws://demo.anycable.io/cable')

const ch = new Channel()
// ch.connect(cable)
