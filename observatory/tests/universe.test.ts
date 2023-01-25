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
        childlessRoot = new Node('Native Image', undefined, [])

        method = new Leaf('method', undefined, 10, InitKind.BUILD_TIME)

        simpleTree = new Node('Class', undefined, [])
        simpleTree.append(
            new Leaf('methodA', simpleTree, 10, InitKind.BUILD_TIME),
            new Leaf('methodB', simpleTree, 7, InitKind.BUILD_TIME),
            new Leaf('methodC', simpleTree, 5, InitKind.RERUN),
            new Leaf('methodD', simpleTree, 20, InitKind.BUILD_TIME),
            new Leaf('methodE', simpleTree, 0, InitKind.BUILD_TIME),
            new Leaf('methodF', simpleTree, 10, InitKind.BUILD_TIME)
        )

        layeredTree = new Node('module', undefined, [])
        layeredTree.append(
            new Node('packageA', layeredTree, []),
            new Node('packageB', layeredTree, [])
        )
        const classAA = new Node('ClassAA', layeredTree.children[0], [])
        const classAB = new Node('ClassAB', layeredTree.children[0], [])
        const classBA = new Node('ClassBA', layeredTree.children[1], [])
        layeredTree.children[0].append(classAA, classAB)
        layeredTree.children[1].append(classBA)
        classAA.append(new Leaf('methodAAA', classAA, 10, InitKind.BUILD_TIME))
        classAB.append(
            new Leaf('methodABA', classAB, 7, InitKind.BUILD_TIME),
            new Leaf('methodABB', classAB, 5, InitKind.RERUN)
        )
        classBA.append(
            new Leaf('methodBAA', classBA, 20, InitKind.BUILD_TIME),
            new Leaf('methodBAB', classBA, 0, InitKind.BUILD_TIME),
            new Leaf('methodBAC', classBA, 10, InitKind.BUILD_TIME)
        )
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
        expect(new Leaf('Method', undefined, 0, InitKind.BUILD_TIME).inline).toBeTruthy()
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
