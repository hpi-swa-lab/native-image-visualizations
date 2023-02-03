import { describe, expect, test } from '@jest/globals'
import clone from 'clone'
import { UniverseIndex } from '../src/ts/SharedTypes/Indices'
import { Node } from '../src/ts/UniverseTypes/Node'
import { mergeTrees } from './../src/ts/GraphOperations/TreeMerger'
import { forest } from './data/forest'

function node(name: string, occursIn: UniverseIndex[], children: Node[] = []): Node {
    const n = new Node(name, children)
    // The `equals` method only checks the keys, not the values. That's why we
    // can just add a dummy node there.
    n.occursIn = new Map(occursIn.map((index) => [index, new Node('dummy')]))
    return n
}

describe('Tree Merger', () => {
    test('Two trees without overlap stay separated in result', () => {
        const merged = mergeTrees(forest.overlappingTreeC, forest.differentPackageTree)

        const inC = [0]
        const inDifferent = [1]
        const inBoth = [0, 1]
        const expected = node('', inBoth, [
            node('packageA', inC, [node('ClassA', inC), node('ClassX', inC), node('ClassY', inC)]),
            node('packageB', inDifferent, [
                node('ClassA', inDifferent, [node('methodAA', inDifferent)]),
                node('ClassX', inDifferent, [node('methodXA', inDifferent)]),
                node('ClassY', inDifferent, [node('methodYA', inDifferent)])
            ])
        ])

        expect(merged.equals(expected)).toBeTruthy()
    })

    test('Should have the occurences set to the only tree given', () => {
        const merged = mergeTrees(forest.overlappingTreeA)

        const inA = [0]
        const expected = node('', inA, [
            node('packageA', inA, [
                node('ClassA', inA, [node('methodAA', inA)]),
                node('ClassB', inA, [node('methodBA', inA)])
            ])
        ])

        expect(merged.equals(expected)).toBeTruthy()
    })

    test('Merging two equal trees results in the same tree with both indexes', () => {
        const merged = mergeTrees(forest.overlappingTreeA, forest.overlappingTreeA)

        const inAA = [0, 1]
        const expected = node('', inAA, [
            node('packageA', inAA, [
                node('ClassA', inAA, [node('methodAA', inAA)]),
                node('ClassB', inAA, [node('methodBA', inAA)])
            ])
        ])

        expect(merged.equals(expected)).toBeTruthy()
    })

    test('should merge 2 overlapping trees into one tree', () => {
        const merged = mergeTrees(forest.overlappingTreeA, forest.overlappingTreeB)

        const inA = [0]
        const inB = [1]
        const inAB = [0, 1]
        const expected = node('', inAB, [
            node('packageA', inAB, [
                node('ClassA', inAB, [node('methodAA', inA), node('methodAC', inB)]),
                node('ClassB', inA, [node('methodBA', inA)]),
                node('ClassC', inB, [node('methodCA', inB)])
            ])
        ])

        expect(merged.equals(expected)).toBeTruthy()
    })

    test('should merge 3 overlapping trees into one tree', () => {
        const merged = mergeTrees(
            forest.overlappingTreeA,
            forest.overlappingTreeB,
            forest.overlappingTreeC
        )

        const inA = [0]
        const inB = [1]
        const inC = [2]
        const inABC = [0, 1, 2]
        const expected = node('', inABC, [
            node('packageA', inABC, [
                node('ClassA', inABC, [node('methodAA', inA), node('methodAC', inB)]),
                node('ClassB', inA, [node('methodBA', inA)]),
                node('ClassC', inB, [node('methodCA', inB)]),
                node('ClassX', inC),
                node('ClassY', inC)
            ])
        ])
        expect(merged.equals(expected)).toBeTruthy()
    })

    test('should merge 2 overlapping trees, append the different package with the same method name', () => {
        const merged = mergeTrees(
            forest.overlappingTreeA,
            forest.overlappingTreeB,
            forest.differentPackageTree
        )

        const inA = [0]
        const inB = [1]
        const inC = [2]
        const inAB = [0, 1]
        const inABC = [0, 1, 2]
        const expected = node('', inABC, [
            node('packageA', inAB, [
                node('ClassA', inAB, [node('methodAA', inA), node('methodAC', inB)]),
                node('ClassB', inA, [node('methodBA', inA)]),
                node('ClassC', inB, [node('methodCA', inB)])
            ]),
            node('packageB', inC, [
                node('ClassA', inC, [node('methodAA', inC)]),
                node('ClassX', inC, [node('methodXA', inC)]),
                node('ClassY', inC, [node('methodYA', inC)])
            ])
        ])

        expect(merged.equals(expected as never)).toBeTruthy()
    })

    test('merging trees should not affect original values', () => {
        const treeA = clone(forest.overlappingTreeA)
        // expect(treeA).toEqual(forest.overlappingTreeA)
        const treeB = clone(forest.overlappingTreeB)
        mergeTrees(forest.overlappingTreeA, forest.overlappingTreeB)
        expect(treeA.equals(forest.overlappingTreeA)).toBeTruthy()
        // expect(treeA.equals(forest.overlappingTreeA)).toBeTruthy()
    })
})
