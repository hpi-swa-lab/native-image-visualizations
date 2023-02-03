import { describe, expect, test } from '@jest/globals'
import clone from 'clone'
import { UniverseIndex } from '../src/ts/SharedTypes/Indices'
import { Node } from '../src/ts/UniverseTypes/Node'
import { mergeTrees } from './../src/ts/GraphOperations/TreeMerger'
import { forest } from './data/forest'

function node(name: string, occursIn: Map<UniverseIndex, Node>, children: Node[] = []): Node {
    const node = new Node(name, children)
    node.occursIn = occursIn
    return node
}

// In the tests below, we traverse into the hardcoded trees using something like
// `a.get('ClassA')`. While this retrieval of nodes may fail in the general
// sense, our trees are hardcoded and we know exactly what classes and methods
// they contain. That's why we use the null-assertion operator in those cases.
/* eslint-disable @typescript-eslint/no-non-null-assertion */

describe('Tree Merger', () => {
    test('Two trees without overlap stay separated in result', () => {
        const c = forest.overlappingTreeC
        const d = forest.differentPackageTree

        const merged = mergeTrees(c, d)
        const expected = node('', new Map(), [
            node('packageA', new Map([[0, c]]), [
                node('ClassA', new Map([[0, c.get('ClassA')!]])),
                node('ClassX', new Map([[0, c.get('ClassX')!]])),
                node('ClassY', new Map([[0, c.get('ClassY')!]]))
            ]),
            node('packageB', new Map([[1, d]]), [
                node('ClassA', new Map([[1, d.get('ClassA')!]]), [
                    node('methodAA', new Map([[1, d.get('ClassA')!.get('methodAA')!]]))
                ]),
                node('ClassX', new Map([[1, d.get('ClassX')!]]), [
                    node('methodXA', new Map([[1, d.get('ClassX')!.get('methodXA')!]]))
                ]),
                node('ClassY', new Map([[1, d.get('ClassY')!]]), [
                    node('methodYA', new Map([[1, d.get('ClassY')!.get('methodYA')!]]))
                ])
            ])
        ])

        expect(merged.equals(expected)).toBeTruthy()
    })

    test('Should have the occurences set to the only tree given', () => {
        const a = forest.overlappingTreeA

        const merged = mergeTrees(a)
        const expected = node('', new Map(), [
            node('packageA', new Map([[0, a]]), [
                node('ClassA', new Map([[0, a.get('ClassA')!]]), [
                    node('methodAA', new Map([[0, a.get('ClassA')!.get('methodAA')!]]))
                ]),
                node('ClassB', new Map([[0, a.get('ClassB')!]]), [
                    node('methodBA', new Map([[0, a.get('ClassB')!.get('methodBA')!]]))
                ])
            ])
        ])

        expect(merged.equals(expected)).toBeTruthy()
    })

    test('Merging two equal trees results in the same tree with both indexes', () => {
        const a = forest.overlappingTreeA

        const merged = mergeTrees(a, a)
        const expected = node('', new Map(), [
            node(
                'packageA',
                new Map([
                    [0, a],
                    [1, a]
                ]),
                [
                    node(
                        'ClassA',
                        new Map([
                            [0, a.get('ClassA')!],
                            [1, a.get('ClassA')!]
                        ]),
                        [
                            node(
                                'methodAA',
                                new Map([
                                    [0, a.get('ClassA')!.get('methodAA')!],
                                    [1, a.get('ClassA')!.get('methodAA')!]
                                ])
                            )
                        ]
                    ),
                    node(
                        'ClassB',
                        new Map([
                            [0, a.get('ClassB')!],
                            [1, a.get('ClassB')!]
                        ]),
                        [
                            node(
                                'methodBA',
                                new Map([
                                    [0, a.get('ClassB')!.get('methodBA')!],
                                    [1, a.get('ClassB')!.get('methodBA')!]
                                ])
                            )
                        ]
                    )
                ]
            )
        ])

        expect(merged.equals(expected)).toBeTruthy()
    })

    test('should merge 2 overlapping trees into one tree', () => {
        const a = forest.overlappingTreeA
        const b = forest.overlappingTreeB

        const merged = mergeTrees(a, b)
        const expected = node('', new Map(), [
            node(
                'packageA',
                new Map([
                    [0, a],
                    [1, b]
                ]),
                [
                    node(
                        'ClassA',
                        new Map([
                            [0, a.get('ClassA')!],
                            [1, b.get('ClassA')!]
                        ]),
                        [
                            node('methodAA', new Map([[0, a.get('ClassA')!.get('methodAA')!]])),
                            node('methodAC', new Map([[1, b.get('ClassA')!.get('methodAC')!]]))
                        ]
                    ),
                    node('ClassB', new Map([[0, a.get('ClassB')!]]), [
                        node('methodBA', new Map([[0, a.get('ClassB')!.get('methodBA')!]]))
                    ]),
                    node('ClassC', new Map([[1, b.get('ClassC')!]]), [
                        node('methodCA', new Map([[1, b.get('ClassC')!.get('methodCA')!]]))
                    ])
                ]
            )
        ])

        expect(merged.equals(expected)).toBeTruthy()
    })

    test('should merge 3 overlapping trees into one tree', () => {
        const a = forest.overlappingTreeA
        const b = forest.overlappingTreeB
        const c = forest.overlappingTreeC

        const merged = mergeTrees(
            forest.overlappingTreeA,
            forest.overlappingTreeB,
            forest.overlappingTreeC
        )
        const expected = node('', new Map(), [
            node(
                'packageA',
                new Map([
                    [0, a],
                    [1, b],
                    [2, c]
                ]),
                [
                    node(
                        'ClassA',
                        new Map([
                            [0, a.get('ClassA')!],
                            [1, b.get('ClassA')!],
                            [2, c.get('ClassA')!]
                        ]),
                        [
                            node('methodAA', new Map([[0, a.get('ClassA')!.get('methodAA')!]])),
                            node('methodAC', new Map([[1, b.get('ClassA')!.get('methodAC')!]]))
                        ]
                    ),
                    node('ClassB', new Map([[0, a.get('ClassB')!]]), [
                        node('methodBA', new Map([[0, a.get('ClassB')!.get('methodBA')!]]))
                    ]),
                    node('ClassC', new Map([[1, b.get('ClassC')!]]), [
                        node('methodCA', new Map([[1, b.get('ClassC')!.get('methodCA')!]]))
                    ]),
                    node('ClassX', new Map([[2, c.get('ClassX')!]])),
                    node('ClassY', new Map([[2, c.get('ClassY')!]]))
                ]
            )
        ])

        expect(merged.equals(expected)).toBeTruthy()
    })

    test('should merge 2 overlapping trees, append the different package with the same method name', () => {
        const a = forest.overlappingTreeA
        const b = forest.overlappingTreeB
        const d = forest.differentPackageTree

        const merged = mergeTrees(
            forest.overlappingTreeA,
            forest.overlappingTreeB,
            forest.differentPackageTree
        )
        const expected = node('', new Map(), [
            node(
                'packageA',
                new Map([
                    [0, a],
                    [1, b]
                ]),
                [
                    node(
                        'ClassA',
                        new Map([
                            [0, a.get('ClassA')!],
                            [1, b.get('ClassA')!]
                        ]),
                        [
                            node('methodAA', new Map([[0, a.get('ClassA')!.get('methodAA')!]])),
                            node('methodAC', new Map([[1, b.get('ClassA')!.get('methodAC')!]]))
                        ]
                    ),
                    node('ClassB', new Map([[0, a.get('ClassB')!]]), [
                        node('methodBA', new Map([[0, a.get('ClassB')!.get('methodBA')!]]))
                    ]),
                    node('ClassC', new Map([[1, b.get('ClassC')!]]), [
                        node('methodCA', new Map([[1, b.get('ClassC')!.get('methodCA')!]]))
                    ])
                ]
            ),
            node('packageB', new Map([[2, d]]), [
                node('ClassA', new Map([[2, d.get('ClassA')!]]), [
                    node('methodAA', new Map([[2, d.get('ClassA')!.get('methodAA')!]]))
                ]),
                node('ClassX', new Map([[2, d.get('ClassX')!]]), [
                    node('methodXA', new Map([[2, d.get('ClassX')!.get('methodXA')!]]))
                ]),
                node('ClassY', new Map([[2, d.get('ClassY')!]]), [
                    node('methodYA', new Map([[2, d.get('ClassY')!.get('methodYA')!]]))
                ])
            ])
        ])

        expect(merged.equals(expected)).toBeTruthy()
    })

    test('merging trees should not affect original values', () => {
        const treeA = clone(forest.overlappingTreeA)
        const treeB = clone(forest.overlappingTreeB)
        mergeTrees(forest.overlappingTreeA, forest.overlappingTreeB)
        expect(treeA.equals(forest.overlappingTreeA)).toBeTruthy()
        expect(treeB.equals(forest.overlappingTreeB)).toBeTruthy()
    })
})
