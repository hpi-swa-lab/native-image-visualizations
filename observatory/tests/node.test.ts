import { describe, expect, test } from '@jest/globals'
import { InitKind, Leaf } from '../src/ts/UniverseTypes/Leaf'
import { Node } from '../src/ts/UniverseTypes/Node'
import { HIERARCHY_NAME_SEPARATOR } from '../src/ts/globals'
import { forest } from './data/forest'

describe('Node usage', () => {
    test('sum for childless root should be 0', () => {
        expect(forest.childlessRoot.codeSize).toEqual(0)
    })

    test('sum for single leaf should be equal to its code size', () => {
        expect(forest.method.codeSize).toEqual(10)
    })

    test('sum for simple tree should be sum of children', () => {
        expect(forest.simpleTree.codeSize).toEqual(52)
    })

    test('sum for complex tree should be sum of children in deeper layers', () => {
        expect(forest.layeredTree.codeSize).toEqual(52)
    })

    test('sum should be updated after pushing another child', () => {
        expect(forest.layeredTree.codeSize).toEqual(52)
        forest.layeredTree.push(forest.simpleTree)
        expect(forest.layeredTree.codeSize).toEqual(104)
    })

    test('sum should be updated after popping child', () => {
        expect(forest.layeredTree.codeSize).toEqual(52)
        forest.layeredTree.pop()
        expect(forest.layeredTree.codeSize).toEqual(22)
    })

    test('sum should be updated after splicing children', () => {
        expect(forest.layeredTree.codeSize).toEqual(52)
        forest.layeredTree.splice(0, 1)
        expect(forest.layeredTree.codeSize).toEqual(30)
    })

    test('parent of child should be node updated after pushing', () => {
        forest.layeredTree.push(forest.simpleTree)
        expect(forest.simpleTree.parent).toEqual(forest.layeredTree)
        expect(forest.layeredTree.children[2]).toEqual(forest.simpleTree)
    })

    test('parent of child should be undefined after popping', () => {
        forest.layeredTree.push(forest.simpleTree)
        forest.layeredTree.pop()
        expect(forest.simpleTree.parent).toEqual(undefined)
        expect(forest.layeredTree.children.length).toEqual(2)
        forest.layeredTree.children.every((child) => expect(child).not.toEqual(forest.simpleTree))
    })

    test('parent of children should be undefined after splicing', () => {
        forest.layeredTree.push(forest.simpleTree, forest.method)
        forest.layeredTree.splice(2, 2)
        expect(forest.simpleTree.parent).toEqual(undefined)
        expect(forest.method.parent).toEqual(undefined)
        expect(forest.layeredTree.children.length).toEqual(2)
        forest.layeredTree.children.every((child) => expect(child).not.toEqual(forest.simpleTree))
        forest.layeredTree.children.every((child) => expect(child).not.toEqual(forest.method))
    })

    test('childless root should be inline', () => {
        expect(forest.childlessRoot.inline).toBeTruthy()
    })

    test('leaf with positive code size is not considered inlined', () => {
        expect(forest.method.inline).toBeFalsy()
    })

    test('leaf with 0 code size is inlined', () => {
        expect(new Leaf('Method', 0, InitKind.BUILD_TIME).inline).toBeTruthy()
    })

    test('simple tree should not be inlined as at least one children is not inlined', () => {
        expect(forest.simpleTree.inline).toBeFalsy()
    })

    test('complex tree should not be inlined as at least one children is not inlined', () => {
        expect(forest.layeredTree.inline).toBeFalsy()
    })

    test('childless root returns its name for identifier', () => {
        expect(forest.childlessRoot.identifier).toEqual(forest.childlessRoot.name)
    })

    test('leaf returns its name for identifier', () => {
        expect(forest.method.identifier).toEqual(forest.method.name)
    })

    test('leaf of complex tree returns path to it as identifier', () => {
        expect(forest.layeredTree.children[0].children[0].children[0].identifier).toEqual(
            `module${HIERARCHY_NAME_SEPARATOR}packageA${HIERARCHY_NAME_SEPARATOR}ClassAA${HIERARCHY_NAME_SEPARATOR}methodAAA`
        )
    })

    test('is should be true for same values and children', () => {
        const simpleTreeCopy = new Node('Class', [
            new Leaf('methodA', 10, InitKind.BUILD_TIME),
            new Leaf('methodB', 7, InitKind.BUILD_TIME),
            new Leaf('methodC', 5, InitKind.RERUN),
            new Leaf('methodD', 20, InitKind.BUILD_TIME),
            new Leaf('methodE', 0, InitKind.BUILD_TIME),
            new Leaf('methodF', 10, InitKind.BUILD_TIME)
        ])
        expect(simpleTreeCopy.is(forest.simpleTree)).toBeTruthy()
    })

    test('is should be false if one child differs', () => {
        const simpleTreeCopy = new Node('Class', [
            new Leaf('methodA', 18, InitKind.BUILD_TIME),
            new Leaf('methodB', 7, InitKind.BUILD_TIME),
            new Leaf('methodC', 5, InitKind.RERUN),
            new Leaf('methodD', 20, InitKind.BUILD_TIME),
            new Leaf('methodE', 0, InitKind.BUILD_TIME),
            new Leaf('methodF', 10, InitKind.BUILD_TIME)
        ])
        expect(simpleTreeCopy.is(forest.simpleTree)).toBeFalsy()
    })

    test('is should be true for only root without leaves', () => {
        const childlessRootCopy = new Node('Native Image')
        expect(childlessRootCopy.is(forest.childlessRoot)).toBeTruthy()
    })

    test('is should be true for permutation of occursIn', () => {
        const nodeA = new Node('ClassA', [new Leaf('methodA', 10, InitKind.BUILD_TIME)])
        const nodeB = new Node('ClassA', [new Leaf('methodA', 10, InitKind.BUILD_TIME)])
        nodeA.occursIn = [0, 1, 2, 3]
        nodeA.children[0].occursIn = [1, 2, 3]
        nodeB.occursIn = [2, 1, 0, 3]
        nodeB.children[0].occursIn = [2, 3, 1]

        expect(nodeA.is(nodeB)).toBeTruthy()
    })

    test('is should be false for different number children', () => {
        const simpleTreeCopy = new Node('Class', [
            new Leaf('methodA', 10, InitKind.BUILD_TIME),
            new Leaf('methodB', 7, InitKind.BUILD_TIME),
            new Leaf('methodC', 5, InitKind.RERUN)
        ])
        expect(simpleTreeCopy.is(forest.simpleTree)).toBeFalsy()
    })
})
