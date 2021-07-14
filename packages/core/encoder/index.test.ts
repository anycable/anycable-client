import { Encoder, JSONEncoder } from '../index.js'

let encoder: Encoder

beforeEach(() => {
  encoder = new JSONEncoder()
})

it('encode', () => {
  expect(encoder.encode({ a: 'b' })).toEqual('{"a":"b"}')
})

it('decode', () => {
  expect(encoder.decode('{"a":"b"}')).toEqual({ a: 'b' })
})

it('decode invalid', () => {
  expect(encoder.decode('{"a":"b"')).toBeUndefined()
})
