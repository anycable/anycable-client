import {
  ActionCableConsumer,
  Cable,
  CreateOptions,
  Protocol,
  ProtocolID,
  TokenRefresher
} from '@anycable/core'

export {
  CreateOptions,
  Cable,
  ActionCableConsumer,
  TokenRefresher
} from '@anycable/core'

export {
  Channel,
  ChannelEvents,
  Message,
  MessageMeta,
  Presence,
  PresenceEvent
} from '@anycable/core'

export { Monitor } from './monitor/index.js'
export { Logger } from './logger/index.js'

export function createCable(
  url: string,
  opts?: Partial<CreateOptions<ProtocolID | Protocol>>
): Cable
export function createCable(
  opts?: Partial<CreateOptions<ProtocolID | Protocol>>
): Cable

export function createConsumer(
  url: string,
  opts?: Partial<CreateOptions<ProtocolID | Protocol>>
): ActionCableConsumer
export function createConsumer(
  opts?: Partial<CreateOptions<ProtocolID | Protocol>>
): ActionCableConsumer

export function fetchTokenFromHTML(
  opts?: Partial<{ url: string }>
): TokenRefresher
