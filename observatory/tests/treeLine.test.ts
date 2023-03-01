import { describe, expect, test } from '@jest/globals'
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
            [multiverse.root.children[0], new Map([['0', 52]])], // Class
            [multiverse.root.children[0].children[0], new Map([['0', 10]])], // Class.methodA
            [multiverse.root.children[0].children[1], new Map([['0', 7]])], // Class.methodB
            [multiverse.root.children[0].children[2], new Map([['0', 5]])], // Class.methodC
            [multiverse.root.children[0].children[3], new Map([['0', 20]])], // Class.methodD
            [multiverse.root.children[0].children[4], new Map([])], // Class.methodE (has size 0)
            [multiverse.root.children[0].children[5], new Map([['0', 10]])] // Class.methodF
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
            ], // package A
            [
                multiverse.root.children[0],
                new Map([
                    ['0', 2],
                    ['1', 2]
                ])
            ], // package A
            [
                multiverse.root.children[0].children[0],
                new Map([
                    ['0', 1],
                    ['1', 1]
                ])
            ], // A.ClassA
            [multiverse.root.children[0].children[0].children[0], new Map([['0', 1]])], // A.ClassA.methodAA
            [multiverse.root.children[0].children[0].children[1], new Map([['1', 1]])], // A.ClassA.methodAC
            [multiverse.root.children[0].children[1], new Map([['0', 1]])], // A.ClassB
            [multiverse.root.children[0].children[1].children[0], new Map([['0', 1]])], // A.ClassB.methodBA
            [multiverse.root.children[0].children[2], new Map([['1', 1]])], // A.ClassC
            [multiverse.root.children[0].children[2].children[0], new Map([['1', 1]])] // A.ClassC.methodCA
        ])

        expect(mapEquals(actual, expected, (a, b) => mapEquals(a, b))).toBeTruthy()
    })
})
