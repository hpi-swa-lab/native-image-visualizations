import { describe, expect, test } from '@jest/globals'
import { findNodesWithName, getNodesOnLevel } from '../src/ts/Math/filters'
import { Layers } from '../src/ts/enums/Layers'
import { forest } from './data/forest'
import { Node } from '../src/ts/UniverseTypes/Node'

describe('filters', () => {
    describe('findNodesWithName', () => {
        test('returns empty array when none found', () => {
            expect(findNodesWithName('something', forest.overlappingImageA)).toEqual([])
        })

        test('returns array with single found element', () => {
            const actual = findNodesWithName('ClassAA', forest.layeredTree)
            const expected = [forest.layeredTree.children[0].children[0]]

            expect(actual.length).toBe(expected.length)
            expected.forEach((value, index) => expect(actual[index].equals(value)).toBeTruthy())
        })

        test('returns array with multiple elements corresponding to name', () => {
            const actual = findNodesWithName('methodA', forest.duplicatedNames)
            const expected = [
                forest.duplicatedNames.children[0].children[0].children[0],
                forest.duplicatedNames.children[0].children[1].children[0],
                forest.duplicatedNames.children[1].children[0].children[0]
            ]

            expect(actual.length).toBe(expected.length)
            expected.forEach((value, index) => expect(actual[index].equals(value)).toBeTruthy())
        })
    })

    describe('getNodesOnLevel', () => {
        const multiverse = new Node('', [
            new Node('Univers A', [forest.duplicatedNames]),
            new Node('Univers B', [forest.layeredTree])
        ])

        test('returns empty array when level is negative', () => {
            expect(getNodesOnLevel(-1, forest.layeredTree)).toEqual([])
        })

        test('returns empty array when level is higher than tree height', () => {
            expect(getNodesOnLevel(10, forest.layeredTree)).toEqual([])
        })

        test('returns array with root when level is 0', () => {
            const actual = getNodesOnLevel(0, forest.layeredTree)
            const expected = [forest.layeredTree]

            expect(actual.length).toBe(expected.length)
            expected.forEach((value, index) => expect(actual[index].equals(value)).toBeTruthy())
        })

        test('returns array with multiverse on respective layer', () => {
            const actual = getNodesOnLevel(Layers.MULTIVERS, multiverse)
            const expected = [multiverse]

            expect(actual.length).toBe(expected.length)
            expected.forEach((value, index) => expect(actual[index].equals(value)).toBeTruthy())
        })

        test('returns array with universes on respective layer', () => {
            const actual = getNodesOnLevel(Layers.UNIVERSES, multiverse)
            const expected = [multiverse.children[0], multiverse.children[1]]

            expect(actual.length).toBe(expected.length)
            expected.forEach((value, index) => expect(actual[index].equals(value)).toBeTruthy())
        })

        test('returns array with modules on respective layer', () => {
            const actual = getNodesOnLevel(Layers.MODULES, multiverse)
            const expected = [
                multiverse.children[0].children[0],
                multiverse.children[1].children[0]
            ]

            expect(actual.length).toBe(expected.length)
            expected.forEach((value, index) => expect(actual[index].equals(value)).toBeTruthy())
        })

        test('returns array with packages on respective layer', () => {
            const moduleA = multiverse.children[0].children[0]
            const moduleB = multiverse.children[1].children[0]
            const actual = getNodesOnLevel(Layers.PACKAGES, multiverse)
            const expected = [
                moduleA.children[0],
                moduleA.children[1],
                moduleB.children[0],
                moduleB.children[1]
            ]

            expect(actual.length).toBe(expected.length)
            expected.forEach((value, index) => expect(actual[index].equals(value)).toBeTruthy())
        })

        test('returns array with classes on respective layer', () => {
            const packageAA = multiverse.children[0].children[0].children[0]
            const packageAB = multiverse.children[0].children[0].children[1]
            const packageBA = multiverse.children[1].children[0].children[0]
            const packageBB = multiverse.children[1].children[0].children[1]
            const actual = getNodesOnLevel(Layers.CLASSES, multiverse)
            const expected = [
                packageAA.children[0],
                packageAA.children[1],
                packageAB.children[0],
                packageBA.children[0],
                packageBA.children[1],
                packageBB.children[0]
            ]

            expect(actual.length).toBe(expected.length)
            expected.forEach((value, index) => expect(actual[index].equals(value)).toBeTruthy())
        })

        test('returns array with methods on respective layer', () => {
            const packageAA = multiverse.children[0].children[0].children[0]
            const packageAB = multiverse.children[0].children[0].children[1]
            const packageBA = multiverse.children[1].children[0].children[0]
            const packageBB = multiverse.children[1].children[0].children[1]
            const actual = getNodesOnLevel(Layers.METHODS, multiverse)
            const expected = [
                packageAA.children[0].children[0],
                packageAA.children[1].children[0],
                packageAA.children[1].children[1],
                packageAB.children[0].children[0],
                packageAB.children[0].children[1],
                packageAB.children[0].children[2],

                packageBA.children[0].children[0],
                packageBA.children[1].children[0],
                packageBA.children[1].children[1],
                packageBB.children[0].children[0],
                packageBB.children[0].children[1],
                packageBB.children[0].children[2]
            ]

            expect(actual.length).toBe(expected.length)
            expected.forEach((value, index) => expect(actual[index].equals(value)).toBeTruthy())
        })
    })
})
