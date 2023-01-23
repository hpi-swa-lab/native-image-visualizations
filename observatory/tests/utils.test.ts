import { describe, expect, test } from '@jest/globals'
import * as utils from '../src/ts/utils'

describe('utils module', () => {
    test('adds 1 + 2 to equal 3', () => {
        expect(utils.sum(1, 2)).toBe(3)
    })
})
