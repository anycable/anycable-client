import { Channel, ChannelParamsMap } from '../channel/index.js'

export class ChannelsCache {
  read(identifier: string, params?: ChannelParamsMap): Channel | undefined
  write(channel: Channel, identifier: string, params?: ChannelParamsMap): void
  delete(identifier: string, params?: ChannelParamsMap): boolean
}
