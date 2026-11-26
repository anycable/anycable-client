import { Monitor as BaseMonitor, DisconnectedError } from '@anycable/core'

export class Monitor extends BaseMonitor {
  initListeners() {
    super.initListeners()

    this.initActivityListeners()

    this.unbind.push(
      this.target.on('connect', () => this.initActivityListeners())
    )
    this.unbind.push(
      this.target.on('disconnect', () => this.initActivityListeners())
    )
    this.unbind.push(
      this.target.on('close', () => this.removeActivityListeners())
    )
    this.unbind.push(() => this.removeActivityListeners())
  }

  removeActivityListeners() {
    if (this.activityUnbind) {
      this.activityUnbind()
      this.activityUnbind = null
    }
  }

  initActivityListeners() {
    if (this.activityUnbind) return

    if (
      typeof document !== 'undefined' &&
      typeof window !== 'undefined' &&
      document.addEventListener &&
      window.addEventListener
    ) {
      let visibility = () => {
        if (!document.hidden) {
          if (this.reconnectNow()) {
            this.logger.debug('Trigger reconnect due to visibility change')
          }
        }
      }
      let connect = event => {
        if (this.reconnectNow()) {
          this.logger.debug('Trigger reconnect', { event })
        }
      }
      let disconnectFrozen = () =>
        this.disconnect(new DisconnectedError('page_frozen'))

      document.addEventListener('visibilitychange', visibility, false)
      window.addEventListener('focus', connect, false)
      window.addEventListener('online', connect, false)
      window.addEventListener('resume', connect, false)
      window.addEventListener('freeze', disconnectFrozen, false)

      this.activityUnbind = () => {
        document.removeEventListener('visibilitychange', visibility, false)
        window.removeEventListener('focus', connect, false)
        window.removeEventListener('online', connect, false)
        window.removeEventListener('resume', connect, false)
        window.removeEventListener('freeze', disconnectFrozen, false)
      }
    }
  }

  disconnect(err) {
    if (this.state === 'disconnected' || this.state === 'closed') return

    this.logger.info('Disconnecting', { reason: err.message })

    this.cancelReconnect()
    this.stopPolling()

    this.state = 'pending_disconnect'
    this.target.disconnected(err)
  }
}
