import { describe, expect, test } from '@jest/globals'
import { forest } from './data/forest'
import { mergeTrees } from './../src/ts/GraphOperations/TreeMerger'
import { UniverseIndex } from '../src/ts/SharedTypes/Indices'
import { Node } from '../src/ts/UniverseTypes/Node'

class ComparisonNode extends Node {
    constructor(name: string, occursIn: UniverseIndex[], children: ComparisonNode[] = []) {
        super(name, children)
        this._occursIn = occursIn
    }
}

describe('Tree Merger', () => {
    test('Two trees without overlap stay separated in result', () => {
        const merged = mergeTrees(forest.overlappingTreeC, forest.differentPackageTree)
        const expected = new ComparisonNode(
            '',
            [],
            [
                new ComparisonNode(
                    'packageA',
                    [0],
                    [
                        new ComparisonNode('ClassA', [0]),
                        new ComparisonNode('ClassX', [0]),
                        new ComparisonNode('ClassY', [0])
                    ]
                ),
                new ComparisonNode(
                    'packageB',
                    [1],
                    [
                        new ComparisonNode('ClassA', [1], [new ComparisonNode('methodAA', [1])]),
                        new ComparisonNode('ClassX', [1], [new ComparisonNode('methodXA', [1])]),
                        new ComparisonNode('ClassY', [1], [new ComparisonNode('methodYA', [1])])
                    ]
                )
            ]
        )

        expect(merged.is(expected)).toBeTruthy()
    })

    test('Should have the occurences set to the only tree given', () => {
        const merged = mergeTrees(forest.overlappingTreeA)

        const expected = new ComparisonNode(
            '',
            [],
            [
                new ComparisonNode(
                    'packageA',
                    [0],
                    [
                        new ComparisonNode('ClassA', [0], [new ComparisonNode('methodAA', [0])]),
                        new ComparisonNode('ClassB', [0], [new ComparisonNode('methodBA', [0])])
                    ]
                )
            ]
        )
        expect(merged.is(expected)).toBeTruthy()
    })

    test('Merging two equal trees results in the same tree with both indexes', () => {
        const merged = mergeTrees(forest.overlappingTreeA, forest.overlappingTreeA)

        const expected = new ComparisonNode(
            '',
            [],
            [
                new ComparisonNode(
                    'packageA',
                    [0, 1],
                    [
                        new ComparisonNode(
                            'ClassA',
                            [0, 1],
                            [new ComparisonNode('methodAA', [0, 1])]
                        ),
                        new ComparisonNode(
                            'ClassB',
                            [0, 1],
                            [new ComparisonNode('methodBA', [0, 1])]
                        )
                    ]
                )
            ]
        )
        expect(merged.is(expected)).toBeTruthy()
    })

    test('should merge 2 overlapping trees into one tree', () => {
        const merged = mergeTrees(forest.overlappingTreeA, forest.overlappingTreeB)

        const expected = new ComparisonNode(
            '',
            [],
            [
                new ComparisonNode(
                    'packageA',
                    [0, 1],
                    [
                        new ComparisonNode(
                            'ClassA',
                            [0, 1],
                            [
                                new ComparisonNode('methodAA', [0]),
                                new ComparisonNode('methodAC', [1])
                            ]
                        ),
                        new ComparisonNode('ClassB', [0], [new ComparisonNode('methodBA', [0])]),
                        new ComparisonNode('ClassC', [1], [new ComparisonNode('methodCA', [1])])
                    ]
                )
            ]
        )

        expect(merged.is(expected)).toBeTruthy()
    })

    test('should merge 3 overlapping trees into one tree', () => {
        const merged = mergeTrees(
            forest.overlappingTreeA,
            forest.overlappingTreeB,
            forest.overlappingTreeC
        )

        const expected = new ComparisonNode(
            '',
            [],
            [
                new ComparisonNode(
                    'packageA',
                    [0, 1, 2],
                    [
                        new ComparisonNode(
                            'ClassA',
                            [0, 1, 2],
                            [
                                new ComparisonNode('methodAA', [0]),
                                new ComparisonNode('methodAC', [1])
                            ]
                        ),
                        new ComparisonNode('ClassB', [0], [new ComparisonNode('methodBA', [0])]),
                        new ComparisonNode('ClassC', [1], [new ComparisonNode('methodCA', [1])]),
                        new ComparisonNode('ClassX', [2]),
                        new ComparisonNode('ClassY', [2])
                    ]
                )
            ]
        )
        expect(merged.is(expected)).toBeTruthy()
    })

    test('should merge 2 overlapping trees, append the different package with the same method name', () => {
        const merged = mergeTrees(
            forest.overlappingTreeA,
            forest.overlappingTreeB,
            forest.differentPackageTree
        )

        const expected = new ComparisonNode(
            '',
            [],
            [
                new ComparisonNode(
                    'packageA',
                    [0, 1],
                    [
                        new ComparisonNode(
                            'ClassA',
                            [0, 1],
                            [
                                new ComparisonNode('methodAA', [0]),
                                new ComparisonNode('methodAC', [1])
                            ]
                        ),
                        new ComparisonNode('ClassB', [0], [new ComparisonNode('methodBA', [0])]),
                        new ComparisonNode('ClassC', [1], [new ComparisonNode('methodCA', [1])])
                    ]
                ),
                new ComparisonNode(
                    'packageB',
                    [2],
                    [
                        new ComparisonNode('ClassA', [2], [new ComparisonNode('methodAA', [2])]),
                        new ComparisonNode('ClassX', [2], [new ComparisonNode('methodXA', [2])]),
                        new ComparisonNode('ClassY', [2], [new ComparisonNode('methodYA', [2])])
                    ]
                )
            ]
        )

        expect(merged.is(expected as never)).toBeTruthy()
    })
})
