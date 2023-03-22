import { describe, expect, test } from '@jest/globals'
import clone from 'clone'
import { UniverseIndex } from '../src/ts/SharedTypes/Indices'
import { Node } from '../src/ts/UniverseTypes/Node'
import { Leaf } from '../src/ts/UniverseTypes/Leaf'
import { InitKind } from '../src/ts/enums/InitKind'
import { Bytes } from '../src/ts/SharedTypes/Size'
import { Multiverse } from '../src/ts/UniverseTypes/Multiverse'
import { Universe } from '../src/ts/UniverseTypes/Universe'
import { forest } from './data/forest'

function node(name: string, sources: Map<UniverseIndex, Node>, children: Node[] = []): Node {
    const node = new Node(name, children)
    node.sources = sources
    return node
}

function leaf(name: string, occursIn: Map<UniverseIndex, Node>, codeSize: Bytes): Leaf {
    const leaf = new Leaf(name, codeSize, [InitKind.BUILD_TIME])
    leaf.sources = occursIn
    return leaf
}

describe('Multiverse', () => {
    /**
     * In the tests below, we traverse into the hardcoded trees using something like
     * `a.get('ClassA')`. While this retrieval of nodes may fail in the general
     * sense, our trees are hardcoded and we know exactly what classes and methods
     * they contain. That's why we use the null-assertion operator in those cases.
     */
    /* eslint-disable @typescript-eslint/no-non-null-assertion */
    describe('Merging universes', () => {
        test('Two trees without overlap stay separated in result', () => {
            const multiverse = new Multiverse([
                new Universe('c', '#000000', forest.overlappingTreeC),
                new Universe('d', '#000000', forest.differentPackageTree)
            ])

            const c = forest.overlappingTreeC.children[0]
            const d = forest.differentPackageTree.children[0]

            const expected = node('', new Map(), [
                node('packageA', new Map([[0, c]]), [
                    node('ClassA', new Map([[0, c.children[0]]])),
                    node('ClassX', new Map([[0, c.children[1]]])),
                    node('ClassY', new Map([[0, c.children[2]]]))
                ]),
                node('packageB', new Map([[1, d]]), [
                    node('ClassA', new Map([[1, d.children[0]]]), [
                        leaf('methodAA', new Map([[1, d.children[0].children[0]]]), 1)
                    ]),
                    node('ClassX', new Map([[1, d.children[1]]]), [
                        leaf('methodXA', new Map([[1, d.children[1].children[0]]]), 1)
                    ]),
                    node('ClassY', new Map([[1, d.children[2]]]), [
                        leaf('methodYA', new Map([[1, d.children[2].children[0]]]), 1)
                    ])
                ])
            ])

            expect(multiverse.root.equals(expected)).toBeTruthy()
        })

        test('Should have the occurences set to the only tree given', () => {
            const multiverse = new Multiverse([
                new Universe('a', '#000000', forest.overlappingTreeA)
            ])
            const a = forest.overlappingTreeA.children[0]

            const expected = node('', new Map(), [
                node('packageA', new Map([[0, a]]), [
                    node('ClassA', new Map([[0, a.children[0]]]), [
                        leaf('methodAA', new Map([[0, a.children[0].children[0]]]), 1)
                    ]),
                    node('ClassB', new Map([[0, a.children[1]]]), [
                        leaf('methodBA', new Map([[0, a.children[1].children[0]]]), 1)
                    ])
                ])
            ])

            expect(multiverse.root.equals(expected)).toBeTruthy()
        })

        test('Merging two equal trees results in the same tree with both indexes', () => {
            const multiverse = new Multiverse([
                new Universe('a', '#000000', forest.overlappingTreeA),
                new Universe('anotherA', '#000000', forest.overlappingTreeA)
            ])
            const a = forest.overlappingTreeA.children[0]

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
                                leaf(
                                    'methodAA',
                                    new Map([
                                        [0, a.children[0].children[0]],
                                        [1, a.children[0].children[0]]
                                    ]),
                                    1
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
                                leaf(
                                    'methodBA',
                                    new Map([
                                        [0, a.children[1].children[0]],
                                        [1, a.children[1].children[0]]
                                    ]),
                                    1
                                )
                            ]
                        )
                    ]
                )
            ])

            expect(multiverse.root.equals(expected)).toBeTruthy()
        })

        test('should merge 2 overlapping trees into one tree', () => {
            const multiverse = new Multiverse([
                new Universe('a', '#000000', forest.overlappingTreeA),
                new Universe('b', '#000000', forest.overlappingTreeB)
            ])
            const a = forest.overlappingTreeA.children[0]
            const b = forest.overlappingTreeB.children[0]

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
                                leaf('methodAA', new Map([[0, a.children[0].children[0]]]), 1),
                                leaf('methodAC', new Map([[1, b.children[0].children[0]]]), 1)
                            ]
                        ),
                        node('ClassB', new Map([[0, a.children[1]]]), [
                            leaf('methodBA', new Map([[0, a.children[1].children[0]]]), 1)
                        ]),
                        node('ClassC', new Map([[1, b.children[1]]]), [
                            leaf('methodCA', new Map([[1, b.children[1].children[0]]]), 1)
                        ])
                    ]
                )
            ])

            expect(multiverse.root.equals(expected)).toBeTruthy()
        })

        test('should merge 3 overlapping trees into one tree', () => {
            const multiverse = new Multiverse([
                new Universe('a', '#000000', forest.overlappingTreeA),
                new Universe('b', '#000000', forest.overlappingTreeB),
                new Universe('c', '#000000', forest.overlappingTreeC)
            ])

            const a = forest.overlappingTreeA.children[0]
            const b = forest.overlappingTreeB.children[0]
            const c = forest.overlappingTreeC.children[0]

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
                                leaf('methodAA', new Map([[0, a.children[0].children[0]]]), 1),
                                leaf('methodAC', new Map([[1, b.children[0].children[0]]]), 1)
                            ]
                        ),
                        node('ClassB', new Map([[0, a.children[1]]]), [
                            leaf('methodBA', new Map([[0, a.children[1].children[0]]]), 1)
                        ]),
                        node('ClassC', new Map([[1, b.children[1]]]), [
                            leaf('methodCA', new Map([[1, b.children[1].children[0]]]), 1)
                        ]),
                        node('ClassX', new Map([[2, c.children[1]]])),
                        node('ClassY', new Map([[2, c.children[2]]]))
                    ]
                )
            ])

            expect(multiverse.root.equals(expected)).toBeTruthy()
        })

        test('should merge 2 overlapping trees, append the different package with the same method name', () => {
            const multiverse = new Multiverse([
                new Universe('a', '#000000', forest.overlappingTreeA),
                new Universe('b', '#000000', forest.overlappingTreeB),
                new Universe('d', '#000000', forest.differentPackageTree)
            ])

            const a = forest.overlappingTreeA.children[0]
            const b = forest.overlappingTreeB.children[0]
            const d = forest.differentPackageTree.children[0]

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
                                leaf('methodAA', new Map([[0, a.children[0].children[0]]]), 1),
                                leaf('methodAC', new Map([[1, b.children[0].children[0]]]), 1)
                            ]
                        ),
                        node('ClassB', new Map([[0, a.children[1]]]), [
                            leaf('methodBA', new Map([[0, a.children[1].children[0]]]), 1)
                        ]),
                        node('ClassC', new Map([[1, b.children[1]]]), [
                            leaf('methodCA', new Map([[1, b.children[1].children[0]]]), 1)
                        ])
                    ]
                ),
                node('packageB', new Map([[2, d]]), [
                    node('ClassA', new Map([[2, d.children[0]]]), [
                        leaf('methodAA', new Map([[2, d.children[0].children[0]]]), 1)
                    ]),
                    node('ClassX', new Map([[2, d.children[1]]]), [
                        leaf('methodXA', new Map([[2, d.children[1].children[0]]]), 1)
                    ]),
                    node('ClassY', new Map([[2, d.children[2]]]), [
                        leaf('methodYA', new Map([[2, d.children[2].children[0]]]), 1)
                    ])
                ])
            ])

            expect(multiverse.root.equals(expected)).toBeTruthy()
        })

        test('merging trees should not affect original values', () => {
            const treeA = clone(forest.overlappingTreeA)
            const treeB = clone(forest.overlappingTreeB)

            new Multiverse([
                new Universe('a', '#000000', treeA),
                new Universe('b', '#000000', treeB)
            ])

            expect(treeA.equals(forest.overlappingTreeA)).toBeTruthy()
            expect(treeB.equals(forest.overlappingTreeB)).toBeTruthy()
        })

        test('merging images should not affect original values', () => {
            const imageA = clone(forest.overlappingImageA)
            const imageB = clone(forest.overlappingImageB)
            new Multiverse([
                new Universe('a', '#000000', imageA),
                new Universe('b', '#000000', imageB)
            ])
            expect(imageA.equals(forest.overlappingImageA)).toBeTruthy()
            expect(imageB.equals(forest.overlappingImageB)).toBeTruthy()
        })

        test('should merge 2 overlapping images into one image', () => {
            const multiverse = new Multiverse([
                new Universe('a', '#000000', forest.overlappingImageA),
                new Universe('b', '#000000', forest.overlappingImageB)
            ])
            const a = forest.overlappingImageA.children[0]
            const b = forest.overlappingImageB.children[0]
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
                                leaf('methodAA', new Map([[0, a.children[0].children[0]]]), 10),
                                leaf('methodAC', new Map([[1, b.children[0].children[0]]]), 15)
                            ]
                        ),
                        node('ClassB', new Map([[0, a.children[1]]]), [
                            leaf('methodBA', new Map([[0, a.children[1].children[0]]]), 10)
                        ]),
                        node('ClassC', new Map([[1, b.children[1]]]), [
                            leaf('methodCA', new Map([[1, b.children[1].children[0]]]), 20)
                        ])
                    ]
                )
            ])

            expect(multiverse.root.equals(expected)).toBeTruthy()
        })

        test('should merge 3 overlapping trees into one tree', () => {
            const multiverse = new Multiverse([
                new Universe('a', '#000000', forest.overlappingImageA),
                new Universe('b', '#000000', forest.overlappingImageB),
                new Universe('c', '#000000', forest.overlappingImageC)
            ])

            const a = forest.overlappingImageA.children[0]
            const b = forest.overlappingImageB.children[0]
            const c = forest.overlappingImageC.children[0]
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
                                leaf('methodAA', new Map([[0, a.children[0].children[0]]]), 10),
                                leaf(
                                    'methodAC',
                                    new Map([
                                        [1, b.children[0].children[0]],
                                        [2, c.children[0].children[0]]
                                    ]),
                                    15
                                )
                            ]
                        ),
                        node('ClassB', new Map([[0, a.children[1]]]), [
                            leaf('methodBA', new Map([[0, a.children[1].children[0]]]), 10)
                        ]),
                        node('ClassC', new Map([[1, b.children[1]]]), [
                            leaf('methodCA', new Map([[1, b.children[1].children[0]]]), 20)
                        ]),
                        node('ClassX', new Map([[2, c.children[1]]]), [
                            leaf('methodXA', new Map([[2, c.children[1].children[0]]]), 30)
                        ]),
                        node('ClassY', new Map([[2, c.children[2]]]), [
                            leaf('methodYA', new Map([[2, c.children[2].children[0]]]), 200)
                        ])
                    ]
                )
            ])

            expect(multiverse.root.equals(expected)).toBeTruthy()
        })
    })

    describe('equals', () => {
        test('returns true if sources are the same', () => {
            const universeA = new Universe('overlappingTreeA', '#000000', forest.overlappingTreeA)
            const universeB = new Universe('overlappingTreeB', '#000000', forest.overlappingTreeB)

            const multiverseA = new Multiverse([universeA, universeB])
            const multiverseB = new Multiverse([universeA, universeB])

            expect(multiverseA.equals(multiverseB)).toBeTruthy()
        })

        test('returnes true if sources are clones of the same data', () => {
            const universeA = new Universe(
                'overlappingTreeA',
                '#000000',
                clone(forest.overlappingTreeA)
            )
            const universeB = new Universe(
                'overlappingTreeB',
                '#000000',
                clone(forest.overlappingTreeB)
            )

            const universeC = new Universe(
                'overlappingTreeA',
                '#000000',
                clone(forest.overlappingTreeA)
            )
            const universeD = new Universe(
                'overlappingTreeB',
                '#000000',
                clone(forest.overlappingTreeB)
            )

            const multiverseA = new Multiverse([universeA, universeB])
            const multiverseB = new Multiverse([universeC, universeD])

            expect(multiverseA.equals(multiverseB)).toBeTruthy()
        })

        test('returns false if the sources are different', () => {
            const universeA = new Universe('overlappingTreeA', '#000000', forest.overlappingTreeA)
            const universeB = new Universe('overlappingTreeB', '#000000', forest.overlappingTreeB)
            const universeC = new Universe(
                'differentPackageTree',
                '#000000',
                forest.differentPackageTree
            )

            const multiverseA = new Multiverse([universeA, universeB])
            const multiverseB = new Multiverse([universeA, universeC])

            expect(multiverseA.equals(multiverseB)).toBeFalsy()
        })
    })
})
