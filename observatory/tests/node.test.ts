import { describe, expect, test } from '@jest/globals'
import { InitKind, Leaf } from '../src/ts/UniverseTypes/Leaf'
import { HIERARCHY_NAME_SEPARATOR } from '../src/ts/globals'
import { trees } from './data/trees'

describe('Universe', () => {
    test('sum for childless root should be 0', () => {
        expect(trees.childlessRoot.codeSize).toEqual(0)
    })

    test('sum for single leaf should be equal to its code size', () => {
        expect(trees.method.codeSize).toEqual(10)
    })

    test('sum for simple tree should be sum of children', () => {
        expect(trees.simpleTree.codeSize).toEqual(52)
    })

    test('sum for complex tree should be sum of children in deeper layers', () => {
        expect(trees.layeredTree.codeSize).toEqual(52)
    })

    test('sum should be updated after pushing another child', () => {
        expect(trees.layeredTree.codeSize).toEqual(52)
        trees.layeredTree.push(trees.simpleTree)
        expect(trees.layeredTree.codeSize).toEqual(104)
    })

    test('sum should be updated after popping child', () => {
        expect(trees.layeredTree.codeSize).toEqual(52)
        trees.layeredTree.pop()
        expect(trees.layeredTree.codeSize).toEqual(22)
    })

    test('sum should be updated after splicing children', () => {
        expect(trees.layeredTree.codeSize).toEqual(52)
        trees.layeredTree.splice(0, 1)
        expect(trees.layeredTree.codeSize).toEqual(30)
    })

    test('parent of child should be node updated after pushing', () => {
        trees.layeredTree.push(trees.simpleTree)
        expect(trees.simpleTree.parent).toEqual(trees.layeredTree)
        expect(trees.layeredTree.children[2]).toEqual(trees.simpleTree)
    })

    test('parent of child should be undefined after popping', () => {
        trees.layeredTree.push(trees.simpleTree)
        trees.layeredTree.pop()
        expect(trees.simpleTree.parent).toEqual(undefined)
        expect(trees.layeredTree.children.length).toEqual(2)
        trees.layeredTree.children.every((child) => expect(child).not.toEqual(trees.simpleTree))
    })

    test('parent of children should be undefined after splicing', () => {
        trees.layeredTree.push(trees.simpleTree, trees.method)
        trees.layeredTree.splice(2, 2)
        expect(trees.simpleTree.parent).toEqual(undefined)
        expect(trees.method.parent).toEqual(undefined)
        expect(trees.layeredTree.children.length).toEqual(2)
        trees.layeredTree.children.every((child) => expect(child).not.toEqual(trees.simpleTree))
        trees.layeredTree.children.every((child) => expect(child).not.toEqual(trees.method))
    })

    test('childless root should be inline', () => {
        expect(trees.childlessRoot.inline).toBeTruthy()
    })

    test('leaf with positive code size is not considered inlined', () => {
        expect(trees.method.inline).toBeFalsy()
    })

    test('leaf with 0 code size is inlined', () => {
        expect(new Leaf('Method', 0, InitKind.BUILD_TIME).inline).toBeTruthy()
    })

    test('simple tree should not be inlined as at least one children is not inlined', () => {
        expect(trees.simpleTree.inline).toBeFalsy()
    })

    test('complex tree should not be inlined as at least one children is not inlined', () => {
        expect(trees.layeredTree.inline).toBeFalsy()
    })

    test('childless root returns its name for identifier', () => {
        expect(trees.childlessRoot.identifier).toEqual(trees.childlessRoot.name)
    })

    test('leaf returns its name for identifier', () => {
        expect(trees.method.identifier).toEqual(trees.method.name)
    })

    test('leaf of complex tree returns path to it as identifier', () => {
        expect(trees.layeredTree.children[0].children[0].children[0].identifier).toEqual(
            `module${HIERARCHY_NAME_SEPARATOR}packageA${HIERARCHY_NAME_SEPARATOR}ClassAA${HIERARCHY_NAME_SEPARATOR}methodAAA`
        )
    })
})
