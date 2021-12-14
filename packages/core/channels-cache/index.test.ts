import { Channel, ChannelsCache } from '../index.js'

class TestChannel extends Channel {}

let channel: TestChannel
let cache: ChannelsCache

beforeEach(() => {
  channel = new TestChannel()
  cache = new ChannelsCache()
})

it('caches without params', () => {
  expect(cache.read('test')).toBeUndefined()

  cache.write(channel, 'test')

  expect(cache.read('test')).toEqual(channel)
})

it('caches with params', () => {
  expect(cache.read('test', { foo: 'bar', a: 1 })).toBeUndefined()

  cache.write(channel, 'test', { foo: 'bar', a: 1 })

  expect(cache.read('test', { a: 1, foo: 'bar' })).toEqual(channel)

  expect(cache.read('test', { foo: 'bar' })).toBeUndefined()
  expect(cache.read('test', { a: 2, foo: 'bar' })).toBeUndefined()

  let another = new TestChannel()

  cache.write(another, 'test', { foo: 'bar', a: 2 })
  expect(cache.read('test', { a: 2, foo: 'bar' })).toEqual(another)
})

it('delete from cache', () => {
  cache.write(channel, 'test', { foo: 'bar', a: 1 })
  expect(cache.read('test', { a: 1, foo: 'bar' })).toEqual(channel)

  expect(cache.delete('test', { a: 1, foo: 'bar' })).toEqual(true)
  expect(cache.read('test', { a: 1, foo: 'bar' })).toBeUndefined()

  expect(cache.delete('test', { a: 1, foo: 'bar' })).toEqual(false)
})
