import { describe, expect, test } from '@jest/globals'
import { findNodesWithName } from '../src/ts/Math/filters'
import { mapEquals } from '../src/ts/Math/Maps'
import { computeExclusiveSizes } from '../src/ts/Math/Universes'
import { Multiverse } from '../src/ts/UniverseTypes/Multiverse'
import { Node } from '../src/ts/UniverseTypes/Node'
import { Universe } from '../src/ts/UniverseTypes/Universe'
import { forest } from './data/forest'

describe('TreeLine', () => {
    test('a single tree has all exclusive sizes', () => {
        const multiverse = new Multiverse([
            new Universe('simpleTree', new Node('Universe', [forest.simpleTree]))
        ])

        const actual = computeExclusiveSizes(multiverse)
        const expected = new Map([
            [multiverse.root, new Map([['0', 52]])],
            [findNodesWithName('Class', multiverse.root)[0], new Map([['0', 52]])],
            [findNodesWithName('methodA', multiverse.root)[0], new Map([['0', 10]])],
            [findNodesWithName('methodB', multiverse.root)[0], new Map([['0', 7]])],
            [findNodesWithName('methodC', multiverse.root)[0], new Map([['0', 5]])],
            [findNodesWithName('methodD', multiverse.root)[0], new Map([['0', 20]])],
            [findNodesWithName('methodE', multiverse.root)[0], new Map([])], // (has size 0)
            [findNodesWithName('methodF', multiverse.root)[0], new Map([['0', 10]])]
        ])

        expect(mapEquals(actual, expected, (a, b) => mapEquals(a, b))).toBeTruthy()
    })

    test('two overlapping trees share code in exclusive sizes', () => {
        const multiverse = new Multiverse([
            new Universe('overlappingTreeA', forest.overlappingTreeA),
            new Universe('overlappingTreeB', forest.overlappingTreeB)
        ])

        const actual = computeExclusiveSizes(multiverse)
        const expected = new Map([
            [
                multiverse.root,
                new Map([
                    ['0', 2],
                    ['1', 2]
                ])
            ],
            [
                findNodesWithName('packageA', multiverse.root)[0],
                new Map([
                    ['0', 2],
                    ['1', 2]
                ])
            ],
            [
                findNodesWithName('ClassA', multiverse.root)[0],
                new Map([
                    ['0', 1],
                    ['1', 1]
                ])
            ],
            [findNodesWithName('methodAA', multiverse.root)[0], new Map([['0', 1]])],
            [findNodesWithName('methodAC', multiverse.root)[0], new Map([['1', 1]])],
            [findNodesWithName('ClassB', multiverse.root)[0], new Map([['0', 1]])],
            [findNodesWithName('methodBA', multiverse.root)[0], new Map([['0', 1]])],
            [findNodesWithName('ClassC', multiverse.root)[0], new Map([['1', 1]])],
            [findNodesWithName('methodCA', multiverse.root)[0], new Map([['1', 1]])]
        ])

        expect(mapEquals(actual, expected, (a, b) => mapEquals(a, b))).toBeTruthy()
    })
})
