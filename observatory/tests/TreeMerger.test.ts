import { describe, expect, test } from '@jest/globals'
import { trees } from './data/trees'
import { mergeTrees } from './../src/ts/GraphOperations/TreeMerger'

describe('Tree Merger', () => {
    test('Two trees without overlap stay separated in result', () => {
        const merged = mergeTrees(trees.overlappingTreeC, trees.differentPackageTree)
        const expected = {
            name: '',
            occurencesIn: [],
            children: [
                {
                    name: 'packageA',
                    occurencesIn: [0],
                    children: [
                        {
                            name: 'ClassA',
                            occurencesIn: [0],
                            children: []
                        },
                        {
                            name: 'ClassX',
                            occurencesIn: [0],
                            children: []
                        },
                        {
                            name: 'ClassY',
                            occurencesIn: [0],
                            children: []
                        }
                    ]
                },
                {
                    name: 'packageB',
                    occurencesIn: [1],
                    children: [
                        {
                            name: 'ClassA',
                            occurencesIn: [1],
                            children: [
                                {
                                    name: 'methodAA',
                                    occurencesIn: [1],
                                    children: []
                                }
                            ]
                        },
                        {
                            name: 'ClassX',
                            occurencesIn: [1],
                            children: [
                                {
                                    name: 'methodXA',
                                    occurencesIn: [1],
                                    children: []
                                }
                            ]
                        },
                        {
                            name: 'ClassY',
                            occurencesIn: [1],
                            children: [
                                {
                                    name: 'methodYA',
                                    occurencesIn: [1],
                                    children: []
                                }
                            ]
                        }
                    ]
                }
            ]
        }
        expect(merged.is(expected as never)).toBeTruthy()
    })

    test('Should have the occurences set to the only tree given', () => {
        const merged = mergeTrees(trees.overlappingTreeA)

        const expected = {
            name: '',
            occurencesIn: [],
            children: [
                {
                    name: 'packageA',
                    occurencesIn: [0],
                    children: [
                        {
                            name: 'ClassA',
                            occurencesIn: [0],
                            children: [
                                {
                                    name: 'methodAA',
                                    occurencesIn: [0],
                                    children: []
                                }
                            ]
                        },
                        {
                            name: 'ClassB',
                            occurencesIn: [0],
                            children: [
                                {
                                    name: 'methodBA',
                                    occurencesIn: [0],
                                    children: []
                                }
                            ]
                        }
                    ]
                }
            ]
        }
        expect(merged.is(expected as never)).toBeTruthy()
    })

    test('should merge 2 overlapping trees into one tree', () => {
        const merged = mergeTrees(trees.overlappingTreeA, trees.overlappingTreeB)

        const expected = {
            name: '',
            occurencesIn: [],
            children: [
                {
                    name: 'packageA',
                    occurencesIn: [0, 1],
                    children: [
                        {
                            name: 'ClassA',
                            occurencesIn: [0, 1],
                            children: [
                                {
                                    name: 'methodAA',
                                    occurencesIn: [0],
                                    children: []
                                },
                                {
                                    name: 'methodAC',
                                    occurencesIn: [1],
                                    children: []
                                }
                            ]
                        },
                        {
                            name: 'ClassB',
                            occurencesIn: [0],
                            children: [
                                {
                                    name: 'methodBA',
                                    occurencesIn: [0],
                                    children: []
                                }
                            ]
                        },
                        {
                            name: 'ClassC',
                            occurencesIn: [1],
                            children: [
                                {
                                    name: 'methodCA',
                                    occurencesIn: [1],
                                    children: []
                                }
                            ]
                        }
                    ]
                }
            ]
        }
        expect(merged.is(expected as never)).toBeTruthy()
    })

    test('should merge 3 overlapping trees into one tree', () => {
        const merged = mergeTrees(
            trees.overlappingTreeA,
            trees.overlappingTreeB,
            trees.overlappingTreeC
        )

        const expected = {
            name: '',
            occurencesIn: [],
            children: [
                {
                    name: 'packageA',
                    occurencesIn: [0, 1, 2],
                    children: [
                        {
                            name: 'ClassA',
                            occurencesIn: [0, 1, 2],
                            children: [
                                {
                                    name: 'methodAA',
                                    occurencesIn: [0],
                                    children: []
                                },
                                {
                                    name: 'methodAC',
                                    occurencesIn: [1],
                                    children: []
                                }
                            ]
                        },
                        {
                            name: 'ClassB',
                            occurencesIn: [0],
                            children: [
                                {
                                    name: 'methodBA',
                                    occurencesIn: [0],
                                    children: []
                                }
                            ]
                        },
                        {
                            name: 'ClassC',
                            occurencesIn: [1],
                            children: [
                                {
                                    name: 'methodCA',
                                    occurencesIn: [1],
                                    children: []
                                }
                            ]
                        },
                        {
                            name: 'ClassX',
                            occurencesIn: [2],
                            children: []
                        },
                        {
                            name: 'ClassY',
                            occurencesIn: [2],
                            children: []
                        }
                    ]
                }
            ]
        }
        expect(merged.is(expected as never)).toBeTruthy()
    })

    test('should merge 2 overlapping trees, append the different package with the same method name', () => {
        const merged = mergeTrees(
            trees.overlappingTreeA,
            trees.overlappingTreeB,
            trees.differentPackageTree
        )

        const expected = {
            name: '',
            occurencesIn: [],
            children: [
                {
                    name: 'packageA',
                    occurencesIn: [0, 1],
                    children: [
                        {
                            name: 'ClassA',
                            occurencesIn: [0, 1],
                            children: [
                                {
                                    name: 'methodAA',
                                    occurencesIn: [0],
                                    children: []
                                },
                                {
                                    name: 'methodAC',
                                    occurencesIn: [1],
                                    children: []
                                }
                            ]
                        },
                        {
                            name: 'ClassB',
                            occurencesIn: [0],
                            children: [
                                {
                                    name: 'methodBA',
                                    occurencesIn: [0],
                                    children: []
                                }
                            ]
                        },
                        {
                            name: 'ClassC',
                            occurencesIn: [1],
                            children: [
                                {
                                    name: 'methodCA',
                                    occurencesIn: [1],
                                    children: []
                                }
                            ]
                        }
                    ]
                },
                {
                    name: 'packageB',
                    occurencesIn: [2],
                    children: [
                        {
                            name: 'ClassA',
                            occurencesIn: [2],
                            children: [
                                {
                                    name: 'methodAA',
                                    occurencesIn: [2],
                                    children: []
                                }
                            ]
                        },
                        {
                            name: 'ClassX',
                            occurencesIn: [2],
                            children: [
                                {
                                    name: 'methodXA',
                                    occurencesIn: [2],
                                    children: []
                                }
                            ]
                        },
                        {
                            name: 'ClassY',
                            occurencesIn: [2],
                            children: [
                                {
                                    name: 'methodYA',
                                    occurencesIn: [2],
                                    children: []
                                }
                            ]
                        }
                    ]
                }
            ]
        }
        expect(merged.is(expected as never)).toBeTruthy()
    })
})
