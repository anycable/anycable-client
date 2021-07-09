import { BaseLogger } from '../index'

const logger = new BaseLogger()

// THROWS Argument of type '"fatal"' is not assignable
logger.log('fatal', 'hello')
