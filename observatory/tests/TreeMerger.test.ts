import { describe, expect, test } from '@jest/globals'
import clone from 'clone'
import { UniverseIndex } from '../src/ts/SharedTypes/Indices'
import { Node } from '../src/ts/UniverseTypes/Node'
import { Multiverse } from '../src/ts/UniverseTypes/Multiverse'
import { forest } from './data/forest'
import { MergedNode } from '../src/ts/UniverseTypes/MergedNode'

function node(
    name: string,
    sources: Map<UniverseIndex, Node>,
    children: MergedNode[] = []
): MergedNode {
    const node = new MergedNode(name, children)
    node.sources = sources
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

        const multiverse = new Multiverse([
            { name: 'c', root: c },
            { name: 'd', root: d }
        ])

        const expected = node('', new Map(), [
            node('packageA', new Map([[0, c]]), [
                node('ClassA', new Map([[0, c.children[0]]])),
                node('ClassX', new Map([[0, c.children[1]]])),
                node('ClassY', new Map([[0, c.children[2]]]))
            ]),
            node('packageB', new Map([[1, d]]), [
                node('ClassA', new Map([[1, d.children[0]]]), [
                    node('methodAA', new Map([[1, d.children[0].children[0]]]))
                ]),
                node('ClassX', new Map([[1, d.children[1]]]), [
                    node('methodXA', new Map([[1, d.children[1].children[0]]]))
                ]),
                node('ClassY', new Map([[1, d.children[2]]]), [
                    node('methodYA', new Map([[1, d.children[2].children[0]]]))
                ])
            ])
        ])

        expect(multiverse.mergedNode.equals(expected)).toBeTruthy()
    })

    test('Should have the occurences set to the only tree given', () => {
        const a = forest.overlappingTreeA

        const multiverse = new Multiverse([{ name: 'a', root: a }])

        const expected = node('', new Map(), [
            node('packageA', new Map([[0, a]]), [
                node('ClassA', new Map([[0, a.children[0]]]), [
                    node('methodAA', new Map([[0, a.children[0].children[0]]]))
                ]),
                node('ClassB', new Map([[0, a.children[1]]]), [
                    node('methodBA', new Map([[0, a.children[1].children[0]]]))
                ])
            ])
        ])

        expect(multiverse.mergedNode.equals(expected)).toBeTruthy()
    })

    test('Merging two equal trees results in the same tree with both indexes', () => {
        const a = forest.overlappingTreeA

        const multiverse = new Multiverse([
            { name: 'a', root: a },
            { name: 'anotherA', root: a }
        ])

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
                            [0, a.children[0]],
                            [1, a.children[0]]
                        ]),
                        [
                            node(
                                'methodAA',
                                new Map([
                                    [0, a.children[0].children[0]],
                                    [1, a.children[0].children[0]]
                                ])
                            )
                        ]
                    ),
                    node(
                        'ClassB',
                        new Map([
                            [0, a.children[1]],
                            [1, a.children[1]]
                        ]),
                        [
                            node(
                                'methodBA',
                                new Map([
                                    [0, a.children[1].children[0]],
                                    [1, a.children[1].children[0]]
                                ])
                            )
                        ]
                    )
                ]
            )
        ])

        expect(multiverse.mergedNode.equals(expected)).toBeTruthy()
    })

    test('should merge 2 overlapping trees into one tree', () => {
        const a = forest.overlappingTreeA
        const b = forest.overlappingTreeB

        const multiverse = new Multiverse([
            { name: 'a', root: a },
            { name: 'b', root: b }
        ])

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
                            [0, a.children[0]],
                            [1, b.children[0]]
                        ]),
                        [
                            node('methodAA', new Map([[0, a.children[0].children[0]]])),
                            node('methodAC', new Map([[1, b.children[0].children[0]]]))
                        ]
                    ),
                    node('ClassB', new Map([[0, a.children[1]]]), [
                        node('methodBA', new Map([[0, a.children[1].children[0]]]))
                    ]),
                    node('ClassC', new Map([[1, b.children[1]]]), [
                        node('methodCA', new Map([[1, b.children[1].children[0]]]))
                    ])
                ]
            )
        ])

        expect(multiverse.mergedNode.equals(expected)).toBeTruthy()
    })

    test('should merge 3 overlapping trees into one tree', () => {
        const a = forest.overlappingTreeA
        const b = forest.overlappingTreeB
        const c = forest.overlappingTreeC

        const multiverse = new Multiverse([
            { name: 'a', root: a },
            { name: 'b', root: b },
            { name: 'c', root: c }
        ])

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
                            [0, a.children[0]],
                            [1, b.children[0]],
                            [2, c.children[0]]
                        ]),
                        [
                            node('methodAA', new Map([[0, a.children[0].children[0]]])),
                            node('methodAC', new Map([[1, b.children[0].children[0]]]))
                        ]
                    ),
                    node('ClassB', new Map([[0, a.children[1]]]), [
                        node('methodBA', new Map([[0, a.children[1].children[0]]]))
                    ]),
                    node('ClassC', new Map([[1, b.children[1]]]), [
                        node('methodCA', new Map([[1, b.children[1].children[0]]]))
                    ]),
                    node('ClassX', new Map([[2, c.children[1]]])),
                    node('ClassY', new Map([[2, c.children[2]]]))
                ]
            )
        ])

        expect(multiverse.mergedNode.equals(expected)).toBeTruthy()
    })

    test('should merge 2 overlapping trees, append the different package with the same method name', () => {
        const a = forest.overlappingTreeA
        const b = forest.overlappingTreeB
        const d = forest.differentPackageTree

        const multiverse = new Multiverse([
            { name: 'a', root: a },
            { name: 'b', root: b },
            { name: 'd', root: d }
        ])

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
                            [0, a.children[0]],
                            [1, b.children[0]]
                        ]),
                        [
                            node('methodAA', new Map([[0, a.children[0].children[0]]])),
                            node('methodAC', new Map([[1, b.children[0].children[0]]]))
                        ]
                    ),
                    node('ClassB', new Map([[0, a.children[1]]]), [
                        node('methodBA', new Map([[0, a.children[1].children[0]]]))
                    ]),
                    node('ClassC', new Map([[1, b.children[1]]]), [
                        node('methodCA', new Map([[1, b.children[1].children[0]]]))
                    ])
                ]
            ),
            node('packageB', new Map([[2, d]]), [
                node('ClassA', new Map([[2, d.children[0]]]), [
                    node('methodAA', new Map([[2, d.children[0].children[0]]]))
                ]),
                node('ClassX', new Map([[2, d.children[1]]]), [
                    node('methodXA', new Map([[2, d.children[1].children[0]]]))
                ]),
                node('ClassY', new Map([[2, d.children[2]]]), [
                    node('methodYA', new Map([[2, d.children[2].children[0]]]))
                ])
            ])
        ])

        expect(multiverse.mergedNode.equals(expected)).toBeTruthy()
    })

    test('merging trees should not affect original values', () => {
        const treeA = clone(forest.overlappingTreeA)
        const treeB = clone(forest.overlappingTreeB)

        new Multiverse([
            { name: 'a', root: treeA },
            { name: 'b', root: treeB }
        ])

        expect(treeA.equals(forest.overlappingTreeA)).toBeTruthy()
        expect(treeB.equals(forest.overlappingTreeB)).toBeTruthy()
    })
})
