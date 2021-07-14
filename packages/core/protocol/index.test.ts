import {
  SubscriptionRejectedError,
  DisconnectedError,
  CommandError
} from '../index.js'

describe('subscriptionRejectedError', () => {
  it('without reason', () => {
    let err = new SubscriptionRejectedError()
    expect(err.reason).toBeUndefined()
    expect(err.message).toEqual('Rejected')
  })

  it('with reason', () => {
    let err = new SubscriptionRejectedError('forbidden')
    expect(err.reason).toEqual('forbidden')
    expect(err.message).toEqual('Rejected')
    expect(err.name).toEqual('SubscriptionRejectedError')
  })
})

describe('disconnectedError', () => {
  it('without reason', () => {
    let err = new DisconnectedError()
    expect(err.reason).toBeUndefined()
    expect(err.message).toEqual('Disconnected')
  })

  it('with reason', () => {
    let err = new DisconnectedError('forbidden')
    expect(err.reason).toEqual('forbidden')
    expect(err.name).toEqual('DisconnectedError')
    expect(err.message).toEqual('Disconnected')
  })
})

describe('commandError', () => {
  it('has name', () => {
    let err = new CommandError('failed')
    expect(err.name).toEqual('CommandError')
    expect(err.message).toEqual('failed')
  })
})
