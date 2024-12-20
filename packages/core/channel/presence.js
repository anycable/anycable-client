// Presence encapsulates the presence tracking logic for the channel.
export class Presence {
  constructor(channel) {
    this.channel = channel
    this.listeners = []
  }

  watch() {
    this.listeners.push(
      this.channel.on('presence', msg => {
        if (msg.type === 'info') {
          if (!this._state) {
            this._state = this.stateFromInfo(msg)
          }
          return
        }

        if (!this._state) return

        if (msg.type === 'join') {
          this._state[msg.id] = msg.info
        } else if (msg.type === 'leave') {
          delete this._state[msg.id]
        }
      })
    )
  }

  // Reset the state to make sure the fresh one is
  // requested the next time info() is called
  reset() {
    delete this._state
  }

  dispose() {
    delete this._info
    delete this._state

    this.listeners.forEach(listener => listener())
    this.listeners.length = 0
  }

  async join(id, info) {
    if (this._info) return undefined

    this._info = { id, info }
    return this.channel.perform('$presence:join', this._info)
  }

  async leave() {
    if (!this._info) return undefined

    let res = await this.channel.perform('$presence:leave')

    delete this._info

    return res
  }

  async info() {
    if (this._state) return this._state

    if (!this._promise) {
      this._promise = this._sync()
    }

    await this._promise

    return this._state
  }

  async _sync() {
    this.watch()

    try {
      let presence = await this.channel.perform('$presence:info', {})

      this._state = this.stateFromInfo(presence)

      return this._state
    } finally {
      delete this._promise
    }
  }

  stateFromInfo(presence) {
    return presence.records.reduce((acc, { id, info }) => {
      acc[id] = info
      return acc
    }, {})
  }
}
