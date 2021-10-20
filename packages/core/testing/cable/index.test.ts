import { Channel } from '../../channel/index.js'
import { TestCable } from './index.js'

describe('Test Channel', () => {
  let channel: Channel
  let cable: TestCable

  beforeEach(() => {
    cable = new TestCable()
    channel = new Channel()
    cable.subscribe(channel)
  })

  it('should throw error when unsubscribe from unexisting channel', async () => {
    let unexistingId = '1'

    return cable.unsubscribe(unexistingId).catch(err => {
      expect(err.message).toEqual(`Channel not found: ${unexistingId}`)
    })
  })

  it('should throw error when perform from unexisting channel', async () => {
    let unexistingId = '1'

    return cable.perform(unexistingId, 'speak').catch(err => {
      expect(err.message).toEqual(`Channel not found: ${unexistingId}`)
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

    expect(channel.state).toEqual('disconnected')
  })
})
