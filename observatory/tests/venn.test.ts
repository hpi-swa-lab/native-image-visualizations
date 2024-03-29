import { describe, test, expect } from '@jest/globals'
import { Multiverse } from '../src/ts/UniverseTypes/Multiverse'
import { forest } from './data/forest'
import { Universe } from '../src/ts/UniverseTypes/Universe'
import { createVennPartitions } from '../src/ts/Math/Sets'
import { Node } from '../src/ts/UniverseTypes/Node'

describe('Venn', () => {
    test('For an empty multiverse returns a valid object from type VennSet', () => {
        const multiverse = new Multiverse([])

        const actual = createVennPartitions(multiverse)
        const expected = {
            inclusive: [],
            exclusive: []
        }

        expect(actual).toEqual(expected)
    })

    test('For a tree with only occurences in one universe, has one set with count equal to tree size', () => {
        const multiverse = new Multiverse([
            new Universe('simpleTree', '#000000', new Node('Universe', [forest.simpleTree]))
        ])

        const actual = createVennPartitions(multiverse)
        const expected = {
            inclusive: [{ sets: [0], size: 7 }],
            exclusive: [{ sets: [0], size: 7 }]
        }

        expect(actual).toEqual(expected)
    })

    test('One merged tree with two equal trees has same amount of single combinations and double combinations', () => {
        const multiverse = new Multiverse([
            new Universe('simpleTree', '#000000', new Node('Universe', [forest.simpleTree])),
            new Universe('simpleTree2', '#000000', new Node('Universe', [forest.simpleTree]))
        ])

        const actual = createVennPartitions(multiverse)
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
            new Universe('overlappingTreeC', '#000000', forest.overlappingTreeC),
            new Universe('differentPackageTree', '#000000', forest.differentPackageTree)
        ])

        const actual = createVennPartitions(multiverse)
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
            new Universe('overlappingTreeA', '#000000', forest.overlappingTreeA),
            new Universe('overlappingTreeB', '#000000', forest.overlappingTreeB)
        ])

        const actual = createVennPartitions(multiverse)
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
            new Universe('overlappingTreeA', '#000000', forest.overlappingTreeA),
            new Universe('overlappingTreeB', '#000000', forest.overlappingTreeB),
            new Universe('overlappingTreeC', '#000000', forest.overlappingTreeC)
        ])

        const actual = createVennPartitions(multiverse)
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
            new Universe('overlappingTreeA', '#000000', forest.overlappingTreeA),
            new Universe('overlappingTreeB', '#000000', forest.overlappingTreeB),
            new Universe('differentPackageTree', '#000000', forest.differentPackageTree)
        ])

        const actual = createVennPartitions(multiverse)
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
