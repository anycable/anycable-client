import { CableOptions } from '@anycable/core'
import { Cable } from '@anycable/web'

export interface AuthOptions {
  headers?: Record<string, string>
}

export interface EchoCableOptions {
  cable?: Cable
  cableOptions?: Partial<CableOptions & { url: string }>
  authEndpoint?: string
  auth?: AuthOptions
  [key: string]: unknown
}

export declare class PublicChannel {
  listen(event: string, callback: Function): this
  listenForWhisper(event: string, callback: Function): this
  notification(callback: Function): this
  stopListening(event: string, callback?: Function): this
  stopListeningForWhisper(event: string, callback?: Function): this
  error(callback: Function): this
  subscribed(callback: Function): this
}

export declare class PrivateChannel extends PublicChannel {
  whisper(eventName: string, data: Record<string, unknown>): this
}

export declare class PresenceChannel extends PrivateChannel {
  getMembers(): Record<string, unknown>[]
  here(callback: Function): this
  joining(callback: Function): this
  leaving(callback: Function): this
}

export declare class EchoCable {
  cable: Cable
  channels: string[]
  constructor(options: EchoCableOptions)

  channel(name: string): PublicChannel
  privateChannel(name: string): PrivateChannel
  presenceChannel(name: string): PresenceChannel
  listen(name: string, event: string, callback: Function): void
  leave(name: string): void
  leaveChannel(name: string): void
  socketId(): string | undefined
  disconnect(): void
}

export default EchoCable
