import { BaseLogger } from '../index.js'
import { TestLogger } from './testing'

describe('baseLogger', () => {
  it('requires writeLogEntry implementation', () => {
    let logger = new BaseLogger()

    expect(() => {
      logger.error('test')
    }).toThrow(/not implemented/i)
  })
})

describe('testLogger', () => {
  let logger: TestLogger

  beforeEach(() => {
    logger = new TestLogger('debug')
  })

  it('has warn level by default', () => {
    let l = new TestLogger()
    expect(l.level).toEqual('warn')
  })

  it('debug', () => {
    logger.debug('some', { foo: 'bar' })
    logger.debug('any')

    expect(logger.logs).toEqual([
      { level: 'debug', message: 'some', details: { foo: 'bar' } },
      { level: 'debug', message: 'any' }
    ])

    logger.level = 'info'

    logger.debug('more')

    expect(logger.logs).toHaveLength(2)
  })

  it('info', () => {
    logger.info('some', { foo: 'bar' })
    logger.info('any')

    expect(logger.logs).toEqual([
      { level: 'info', message: 'some', details: { foo: 'bar' } },
      { level: 'info', message: 'any' }
    ])

    logger.level = 'warn'

    logger.info('more')

    expect(logger.logs).toHaveLength(2)
  })

  it('warn', () => {
    logger.warn('some', { foo: 'bar' })
    logger.warn('any')

    expect(logger.logs).toEqual([
      { level: 'warn', message: 'some', details: { foo: 'bar' } },
      { level: 'warn', message: 'any' }
    ])

    logger.level = 'error'

    logger.warn('more')

    expect(logger.logs).toHaveLength(2)
  })

  it('error', () => {
    logger.error('some', { foo: 'bar' })
    logger.error('any')

    expect(logger.logs).toEqual([
      { level: 'error', message: 'some', details: { foo: 'bar' } },
      { level: 'error', message: 'any' }
    ])
  })
})
