// Presence encapsulates the presence tracking logic for the channel.
export class Presence {
  constructor(channel) {
    this.channel = channel
    this.listeners = []
    this.watching = false
  }

  watch() {
    if (this.watching) return

    this.watching = true

    this.listeners.push(
      this.channel.on('join', msg => {
        if (!this._state) return

        this._state[msg.id] = msg.info
      }),
      this.channel.on('leave', msg => {
        if (!this._state) return

        delete this._state[msg.id]
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

    this.watching = false
  }

  async join(id, info) {
    if (this._info) return undefined

    this._info = { id, info }
    return this.channel.perform('$presence:join', this._info)
  }

  async leave() {
    if (!this._info) return undefined

    let res = await this.channel.perform('$presence:leave', {
      id: this._info.id
    })

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

      this._state = presence.records.reduce((acc, { id, info }) => {
        acc[id] = info
        return acc
      }, {})

      return this._state
    } finally {
      delete this._promise
    }
  }
}
