import { beforeEach } from '@jest/globals'
import { forest, forestFactory } from './data/forest'

beforeEach(() => {
    Object.assign(forest, forestFactory())
})
