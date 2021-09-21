import {
  ReasonError,
  SubscriptionRejectedError,
  DisconnectedError,
  CommandError
} from '../index.js'
import { StaleConnectionError } from './index.js'

describe('ReasonError', () => {
  it('has reasons and message', () => {
    let err = new ReasonError('failure', 'just because')
    expect(err.reason).toEqual('just because')
    expect(err.message).toEqual('failure')
  })
})

describe('SubscriptionRejectedError', () => {
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

describe('DisconnectedError', () => {
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

describe('CommandError', () => {
  it('has name', () => {
    let err = new CommandError('failed')
    expect(err.name).toEqual('CommandError')
    expect(err.message).toEqual('failed')
  })
})

describe('StaleConnnectionError', () => {
  it('has name', () => {
    let err = new StaleConnectionError('stale')
    expect(err.name).toEqual('StaleConnectionError')
    expect(err.message).toEqual('stale')
  })
})
