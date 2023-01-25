import { describe, expect, test } from '@jest/globals'
import { Multiverse } from '../src/ts/UniverseTypes/Multiverse'
import { InitKind, Star } from '../src/ts/UniverseTypes/Star'
import { SEPARATOR } from '../src/ts/globals'

describe('Universe', () => {
    let childlessRoot: Multiverse
    let method: Star
    let simpleTree: Multiverse
    let layeredTree: Multiverse

    beforeEach(() => {
        childlessRoot = new Multiverse('Native Image', undefined, [])

        method = new Star('Method', undefined, 10, 5, InitKind.BUILD_TIME)

        simpleTree = new Multiverse('Class', undefined, [])
        simpleTree.append(new Star('MethodA', simpleTree, 10, 0, InitKind.BUILD_TIME))
        simpleTree.append(new Star('MethodB', simpleTree, 7, 1, InitKind.BUILD_TIME))
        simpleTree.append(new Star('MethodC', simpleTree, 5, 3, InitKind.RERUN))
        simpleTree.append(new Star('MethodD', simpleTree, 20, 7, InitKind.BUILD_TIME))
        simpleTree.append(new Star('MethodE', simpleTree, 0, 5, InitKind.BUILD_TIME))
        simpleTree.append(new Star('MethodF', simpleTree, 10, 10, InitKind.BUILD_TIME))

        layeredTree = new Multiverse('Module', undefined, [])
        const packageA = new Multiverse('PackageA', layeredTree, [])
        const packageB = new Multiverse('PackageB', layeredTree, [])
        layeredTree.append(packageA)
        layeredTree.append(packageB)
        const classAA = new Multiverse('ClassAA', packageA, [])
        const classAB = new Multiverse('ClassAB', packageA, [])
        const classBA = new Multiverse('ClassBA', packageB, [])
        packageA.append(classAA)
        packageA.append(classAB)
        packageB.append(classBA)
        classAA.append(new Star('MethodAAA', classAA, 10, 0, InitKind.BUILD_TIME))
        classAB.append(new Star('MethodABA', classAB, 7, 1, InitKind.BUILD_TIME))
        classAB.append(new Star('MethodABB', classAB, 5, 3, InitKind.RERUN))
        classBA.append(new Star('MethodBAA', classBA, 20, 7, InitKind.BUILD_TIME))
        classBA.append(new Star('MethodBAB', classBA, 0, 5, InitKind.BUILD_TIME))
        classBA.append(new Star('MethodBAC', classBA, 10, 10, InitKind.BUILD_TIME))
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
        expect(childlessRoot.isInline()).toBeTruthy()
    })

    test('leaf with positive code size is not considered inlined', () => {
        expect(method.isInline()).toBeFalsy()
    })

    test('leaf with 0 code size is inlined', () => {
        expect(new Star('Method', undefined, 0, 5, InitKind.BUILD_TIME).isInline()).toBeTruthy()
    })

    test('simple tree should not be inlined as at least one children is not inlined', () => {
        expect(simpleTree.isInline()).toBeFalsy()
    })

    test('complex tree should not be inlined as at least one children is not inlined', () => {
        expect(layeredTree.isInline()).toBeFalsy()
    })

    test('detail flag 0 is neither reflective, jni, or synthetic', () => {
        const nothing = new Star('Method', undefined, 10, 0, InitKind.BUILD_TIME)
        expect(nothing.isReflective()).toBeFalsy()
        expect(nothing.isJNI()).toBeFalsy()
        expect(nothing.isSynthetic()).toBeFalsy()
    })

    test('detail flag 1 is reflective, but neither jni, or synthetic', () => {
        const nothing = new Star('Method', undefined, 10, 1, InitKind.BUILD_TIME)
        expect(nothing.isReflective()).toBeTruthy()
        expect(nothing.isJNI()).toBeFalsy()
        expect(nothing.isSynthetic()).toBeFalsy()
    })

    test('detail flag 2 is jni, but neither reflective, or synthetic', () => {
        const nothing = new Star('Method', undefined, 10, 2, InitKind.BUILD_TIME)
        expect(nothing.isReflective()).toBeFalsy()
        expect(nothing.isJNI()).toBeTruthy()
        expect(nothing.isSynthetic()).toBeFalsy()
    })

    test('detail flag 4 is synthetic, but neither reflective, or jni', () => {
        const nothing = new Star('Method', undefined, 10, 4, InitKind.BUILD_TIME)
        expect(nothing.isReflective()).toBeFalsy()
        expect(nothing.isJNI()).toBeFalsy()
        expect(nothing.isSynthetic()).toBeTruthy()
    })

    test('detail flag 7 is synthetic, reflective, and jni', () => {
        const nothing = new Star('Method', undefined, 10, 7, InitKind.BUILD_TIME)
        expect(nothing.isReflective()).toBeTruthy()
        expect(nothing.isJNI()).toBeTruthy()
        expect(nothing.isSynthetic()).toBeTruthy()
    })

    test('childless root returns its name for identifier', () => {
        expect(childlessRoot.identifier()).toEqual(childlessRoot.name)
    })

    test('leaf returns its name for identifier', () => {
        expect(method.identifier()).toEqual(method.name)
    })

    test('leaf of complex tree returns path to it as identifier', () => {
        expect(layeredTree.universes[0].universes[0].universes[0].identifier()).toEqual(
            `Module${SEPARATOR}PackageA${SEPARATOR}ClassAA${SEPARATOR}MethodAAA`
        )
    })
})
