import { Channel, Cable } from '@anycable/core'

export type ChannelParamsMap = { [token: string]: boolean | number | string }

export class TurboChannel extends Channel {
  readonly element: HTMLElement
  readonly identifier: string

  constructor(element: HTMLElement, channel: string, params?: ChannelParamsMap)
}

export interface StartOptions {
  tagName: string
  channelClass: typeof TurboChannel
}

export function start(cable: Cable, opts?: Partial<StartOptions>): void
