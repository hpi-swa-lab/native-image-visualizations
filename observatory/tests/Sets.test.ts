import { describe, expect, test } from '@jest/globals'
import { forest } from './data/forest'
import { mergeTrees } from './../src/ts/GraphOperations/TreeMerger'
import { UniverseIndex } from '../src/ts/SharedTypes/Indices'
import { toVennPartitions } from '../src/ts/Math/Sets'

describe('Sets', () => {
    test('For a tree with only occurences in one universe, has one set with count equal to tree size', () => {
        const actual = toVennPartitions(mergeTrees(forest.simpleTree))
        const expected = {
            inclusive: [{ sets: [0], size: 7 }],
            exclusive: [{ sets: [0], size: 7 }]
        }
        expect(actual).toEqual(expected)
    })
})
