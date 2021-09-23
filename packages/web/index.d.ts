import {
  CreateOptions,
  Cable,
  ActionCableConsumer,
  TokenRefresher
} from '@anycable/core'

export { Channel } from '@anycable/core'

export { Monitor } from './monitor/index.js'
export { Logger } from './logger/index.js'

export function createCable(url: string, opts?: Partial<CreateOptions>): Cable
export function createCable(opts?: Partial<CreateOptions>): Cable

export function createConsumer(
  url: string,
  opts?: Partial<CreateOptions>
): ActionCableConsumer
export function createConsumer(
  opts?: Partial<CreateOptions>
): ActionCableConsumer

export function fetchTokenFromHTML(
  opts?: Partial<{ url: string }>
): TokenRefresher
