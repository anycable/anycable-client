import { Channel } from '../../channel/index.js'
import { TestCable } from './index.js'

class TestChannel extends Channel<{ id: string }> {
  static identifier = 'test'
}

describe('Test Channel', () => {
  let channel: Channel
  let cable: TestCable

  beforeEach(() => {
    cable = new TestCable()
    channel = new TestChannel({ id: '1' })
    cable.subscribe(channel)
  })

  it('should throw error when perform from unexisting channel', async () => {
    let newChannel = new TestChannel({ id: '2' })
    newChannel.attached(cable)
    newChannel.connected()

    await cable.perform(newChannel, 'speak').catch(err => {
      expect(err.message).toContain('Channel not found')
    })
  })

  it('perform an action without payload', async () => {
    await channel.perform('speak')

    expect(cable.outgoing).toEqual([{ action: 'speak', payload: {} }])
  })

  it('perform an action with payload', async () => {
    let firstMessage = { message: 'hello' }
    let secondMessage = { message: 'bye' }

    await channel.perform('speak', firstMessage)
    await channel.perform('ask', secondMessage)

    expect(cable.outgoing).toEqual([
      { action: 'speak', payload: firstMessage },
      { action: 'ask', payload: secondMessage }
    ])
  })

  it('disconnects when leave', async () => {
    await channel.disconnect()

    expect(channel.state).toEqual('closed')
  })

  it('disconnects when not subscribed', async () => {
    let newChannel = new TestChannel({ id: '2' })
    newChannel.attached(cable)
    newChannel.connected()

    await newChannel.disconnect().catch(err => {
      expect(err.message).toContain('Channel not found')
    })
  })
})
