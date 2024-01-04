import { stringifyParams } from '../index.js'

it('sorts keys', () => {
  expect(stringifyParams({ x: 1, b: 'foo' })).toEqual('{"b":"foo","x":1}')
  expect(stringifyParams({ b: 'foo', x: 1 })).toEqual('{"b":"foo","x":1}')
})

it('handles nulls and undefined', () => {
  expect(stringifyParams(null)).toEqual('')
  expect(stringifyParams(undefined)).toEqual('')
})

it('omits undefined and handles null within params', () => {
  expect(stringifyParams({ x: undefined, b: null })).toEqual('{"b":null}')
})
