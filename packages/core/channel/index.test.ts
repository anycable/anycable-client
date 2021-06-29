import { Channel } from '../index.js'
import { jest } from '@jest/globals'

class Connector {
  subscribe(data: { channel: string; params: any }): Promise<string> {
    return Promise.resolve(data.channel)
  }

  unsubscribe(sid: string): Promise<boolean> {
    return Promise.resolve(true)
  }

  perform(sid: string, action: string, payload?: any): Promise<any> {
    if (!payload) {
      payload = {}
    }

    payload.action = action

    return Promise.resolve(payload)
  }
}

class TestChannel extends Channel<{ id: string }> {
  static identifier = 'test'
}

let channel: TestChannel
let client: Connector

beforeEach(() => {
  channel = new TestChannel({ id: '2021' })
  client = new Connector()
})

it('freezes params', () => {
  expect(() => (channel.params.id = 'bar')).toThrow(
    /Cannot assign to read only property/
  )
})

it('connects', async () => {
  jest.spyOn(client, 'subscribe').mockImplementation(({ channel, params }) => {
    expect(channel).toEqual('test')
    expect(params).toMatchObject({ id: '2021' })

    return Promise.resolve('tid')
  })

  await channel.connect(client)

  expect(channel.identifier).toEqual('tid')
})

it('connect rejection', async () => {
  jest.spyOn(client, 'subscribe').mockImplementation(({ channel, params }) => {
    expect(channel).toEqual('test')
    expect(params).toMatchObject({ id: '2021' })

    return Promise.reject('Forbidden')
  })

  try {
    await channel.connect(client)
    fail('No exception was thrown')
  } catch (e) {
    expect(e).toEqual('Forbidden')
  }

  expect(channel.identifier).toBeUndefined()
})

it('double connect', async () => {
  await channel.connect(client)

  try {
    await channel.connect(client)
    fail('No exception was thrown')
  } catch (e) {
    expect(e).toEqual('Already connected')
  }
})

it('performs action with payload', async () => {
  await channel.connect(client)

  jest.spyOn(client, 'perform').mockImplementation((sid, action, payload) => {
    expect(sid).toEqual(channel.identifier)
    expect(action).toEqual('do')
    expect(payload).toMatchObject({ foo: 'bar' })

    return Promise.resolve(undefined)
  })

  let res = await channel.perform('do', { foo: 'bar' })
  expect(res).toBeUndefined()
})

it('performs action without payload', async () => {
  await channel.connect(client)

  jest.spyOn(client, 'perform').mockImplementation((sid, action, payload) => {
    expect(sid).toEqual(channel.identifier)
    expect(action).toEqual('do')
    expect(payload).toBeUndefined()

    return Promise.resolve(undefined)
  })

  let res = await channel.perform('do')
  expect(res).toBeUndefined()
})

it('performs without connect', async () => {
  try {
    await channel.perform('do', { foo: 'bar' })
    fail('No exception was thrown')
  } catch (e) {
    expect(e).toMatch(/must be connected/i)
  }
})

it('performs right after connect', async () => {
  channel.connect(client)
  let res = await channel.perform('do', { foo: 'bar' })
  expect(res).toMatchObject({ foo: 'bar', action: 'do' })
})

it('disconnects', async () => {
  await channel.connect(client)

  jest.spyOn(client, 'unsubscribe').mockImplementation(sid => {
    expect(sid).toEqual(channel.identifier)

    return Promise.resolve(true)
  })

  await channel.disconnect()

  expect(channel.identifier).toBeUndefined()
})

it('disconnect without connect', async () => {
  try {
    await channel.disconnect()
    fail('No exception was thrown')
  } catch (e) {
    expect(e).toMatch(/must be connected/i)
  }
})

it('disconnect right after connect', async () => {
  channel.connect(client)
  await channel.disconnect()

  expect(channel.identifier).toBeUndefined()
})
