import { describe, expect, test } from '@jest/globals'
import { forest } from './data/forest'
import { toVennPartitions } from '../src/ts/Math/Sets'
import { Multiverse } from '../src/ts/UniverseTypes/Multiverse'

describe('Venn Sets', () => {
    test('For a tree with only occurences in one universe, has one set with count equal to tree size', () => {
        const multiverse = new Multiverse([{ name: 'simpleTree', root: forest.simpleTree }])

        const actual = toVennPartitions(multiverse)
        const expected = {
            inclusive: [{ sets: [0], size: 7 }],
            exclusive: [{ sets: [0], size: 7 }]
        }

        expect(actual).toEqual(expected)
    })

    test('One merged tree with two equal trees has same amount of single combinations and double combinations', () => {
        const multiverse = new Multiverse([
            { name: 'simpleTree', root: forest.simpleTree },
            { name: 'simpleTree2', root: forest.simpleTree }
        ])

        const actual = toVennPartitions(multiverse)
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
        const multiverse = new Multiverse([
            { name: 'overlappingTreeC', root: forest.overlappingTreeC },
            { name: 'differentPackageTree', root: forest.differentPackageTree }
        ])

        const actual = toVennPartitions(multiverse)
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
        const multiverse = new Multiverse([
            { name: 'overlappingTreeA', root: forest.overlappingTreeA },
            { name: 'overlappingTreeB', root: forest.overlappingTreeB }
        ])

        const actual = toVennPartitions(multiverse)
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
        const multiverse = new Multiverse([
            { name: 'overlappingTreeA', root: forest.overlappingTreeA },
            { name: 'overlappingTreeB', root: forest.overlappingTreeB },
            { name: 'overlappingTreeC', root: forest.overlappingTreeC }
        ])

        const actual = toVennPartitions(multiverse)
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
        const multiverse = new Multiverse([
            { name: 'overlappingTreeA', root: forest.overlappingTreeA },
            { name: 'overlappingTreeB', root: forest.overlappingTreeB },
            { name: 'differentPackageTree', root: forest.differentPackageTree }
        ])

        const actual = toVennPartitions(multiverse)
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
