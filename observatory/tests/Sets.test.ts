import { describe, expect, test } from '@jest/globals'
import { forest } from './data/forest'
import { mergeTrees } from './../src/ts/GraphOperations/TreeMerger'
import { toVennPartitions } from '../src/ts/Math/Sets'

describe('Venn Sets', () => {
    test('For a tree with only occurences in one universe, has one set with count equal to tree size', () => {
        const actual = toVennPartitions(mergeTrees(forest.simpleTree))
        const expected = {
            inclusive: [{ sets: [0], size: 7 }],
            exclusive: [{ sets: [0], size: 7 }]
        }
        expect(actual).toEqual(expected)
    })

    test('One merged tree with two equal trees has same amount of single combinations and double combinations', () => {
        const actual = toVennPartitions(mergeTrees(forest.simpleTree, forest.simpleTree))
        const expected = {
            inclusive: [
                { sets: [0], size: 7 },
                { sets: [1], size: 7 },
                { sets: [0, 1], size: 7 }
            ],
            exclusive: [{ sets: [0, 1], size: 7 }]
        }
        expect(actual).toEqual(expected)
    })

    test('Two trees without overlap do not create a combination of occurences', () => {
        const actual = toVennPartitions(
            mergeTrees(forest.overlappingTreeC, forest.differentPackageTree)
        )
        const expected = {
            inclusive: [
                { sets: [0], size: 4 },
                { sets: [1], size: 7 }
            ],
            exclusive: [
                { sets: [0], size: 4 },
                { sets: [1], size: 7 }
            ]
        }
        expect(actual).toEqual(expected)
    })

    test('Two overlapping trees', () => {
        const actual = toVennPartitions(
            mergeTrees(forest.overlappingTreeA, forest.overlappingTreeB)
        )
        const expected = {
            inclusive: [
                { sets: [0], size: 5 },
                { sets: [1], size: 5 },
                { sets: [0, 1], size: 2 }
            ],
            exclusive: [
                { sets: [0], size: 3 },
                { sets: [1], size: 3 },
                { sets: [0, 1], size: 2 }
            ]
        }
        expect(actual).toEqual(expected)
    })

    test('Three overlapping trees', () => {
        const actual = toVennPartitions(
            mergeTrees(forest.overlappingTreeA, forest.overlappingTreeB, forest.overlappingTreeC)
        )
        const expected = {
            inclusive: [
                { sets: [0], size: 5 },
                { sets: [1], size: 5 },
                { sets: [2], size: 4 },
                { sets: [0, 1], size: 2 },
                { sets: [0, 2], size: 2 },
                { sets: [1, 2], size: 2 },
                { sets: [0, 1, 2], size: 2 }
            ],
            exclusive: [
                { sets: [0], size: 3 },
                { sets: [1], size: 3 },
                { sets: [2], size: 2 },
                { sets: [0, 1, 2], size: 2 }
            ]
        }
        expect(actual).toEqual(expected)
    })

    test('Two overlapping trees, one appended', () => {
        const actual = toVennPartitions(
            mergeTrees(
                forest.overlappingTreeA,
                forest.overlappingTreeB,
                forest.differentPackageTree
            )
        )
        const expected = {
            inclusive: [
                { sets: [0], size: 5 },
                { sets: [1], size: 5 },
                { sets: [2], size: 7 },
                { sets: [0, 1], size: 2 }
            ],
            exclusive: [
                { sets: [0], size: 3 },
                { sets: [1], size: 3 },
                { sets: [2], size: 7 },
                { sets: [0, 1], size: 2 }
            ]
        }
        expect(actual).toEqual(expected)
    })
})
