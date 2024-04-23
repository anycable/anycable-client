import { Monitor as BaseMonitor, DisconnectedError } from '@anycable/core'

export class Monitor extends BaseMonitor {
  initActivityListeners(): void
  disconnect(err: DisconnectedError): void
}
