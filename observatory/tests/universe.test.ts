import { describe, expect, test } from '@jest/globals'
import { Node } from '../src/ts/UniverseTypes/Node'
import { InitKind, Leaf } from '../src/ts/UniverseTypes/Leaf'
import { HIERARCHY_NAME_SEPARATOR } from '../src/ts/globals'

describe('Universe', () => {
    let childlessRoot: Node
    let method: Leaf
    let simpleTree: Node
    let layeredTree: Node

    beforeEach(() => {
        childlessRoot = new Node('Native Image')

        method = new Leaf('method', 10, InitKind.BUILD_TIME)

        simpleTree = new Node('Class', [
            new Leaf('methodA', 10, InitKind.BUILD_TIME),
            new Leaf('methodB', 7, InitKind.BUILD_TIME),
            new Leaf('methodC', 5, InitKind.RERUN),
            new Leaf('methodD', 20, InitKind.BUILD_TIME),
            new Leaf('methodE', 0, InitKind.BUILD_TIME),
            new Leaf('methodF', 10, InitKind.BUILD_TIME)
        ])

        layeredTree = new Node('module', [
            new Node('packageA', [
                new Node('ClassAA', [new Leaf('methodAAA', 10, InitKind.BUILD_TIME)]),
                new Node('ClassAB', [
                    new Leaf('methodABA', 7, InitKind.BUILD_TIME),
                    new Leaf('methodABB', 5, InitKind.RERUN)
                ])
            ]),
            new Node('packageB', [
                new Node('ClassBA', [
                    new Leaf('methodBAA', 20, InitKind.BUILD_TIME),
                    new Leaf('methodBAB', 0, InitKind.BUILD_TIME),
                    new Leaf('methodBAC', 10, InitKind.BUILD_TIME)
                ])
            ])
        ])
    })

    test('sum for childless root should be 0', () => {
        expect(childlessRoot.codeSize).toEqual(0)
    })

    test('sum for single leaf should be equal to its code size', () => {
        expect(method.codeSize).toEqual(10)
    })

    test('sum for simple tree should be sum of children', () => {
        expect(simpleTree.codeSize).toEqual(52)
    })

    test('sum for complex tree should be sum of children in deeper layers', () => {
        expect(layeredTree.codeSize).toEqual(52)
    })

    test('childless root should be inline', () => {
        expect(childlessRoot.inline).toBeTruthy()
    })

    test('leaf with positive code size is not considered inlined', () => {
        expect(method.inline).toBeFalsy()
    })

    test('leaf with 0 code size is inlined', () => {
        expect(new Leaf('Method', 0, InitKind.BUILD_TIME).inline).toBeTruthy()
    })

    test('simple tree should not be inlined as at least one children is not inlined', () => {
        expect(simpleTree.inline).toBeFalsy()
    })

    test('complex tree should not be inlined as at least one children is not inlined', () => {
        expect(layeredTree.inline).toBeFalsy()
    })

    test('childless root returns its name for identifier', () => {
        expect(childlessRoot.identifier).toEqual(childlessRoot.name)
    })

    test('leaf returns its name for identifier', () => {
        expect(method.identifier).toEqual(method.name)
    })

    test('leaf of complex tree returns path to it as identifier', () => {
        expect(layeredTree.children[0].children[0].children[0].identifier).toEqual(
            `module${HIERARCHY_NAME_SEPARATOR}packageA${HIERARCHY_NAME_SEPARATOR}ClassAA${HIERARCHY_NAME_SEPARATOR}methodAAA`
        )
    })
})
