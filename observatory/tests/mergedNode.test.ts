import { describe, expect, test } from '@jest/globals'
import { MergedNode } from '../src/ts/UniverseTypes/MergedNode'

describe('MergedNode usage', () => {
    test('equals should be true for permutation of sources', () => {
        const nodeA = new MergedNode('ClassA', [new MergedNode('methodA')])
        const nodeB = new MergedNode('ClassA', [new MergedNode('methodA')])
        const dummy = new MergedNode('dummy')
        nodeA.sources = new Map([
            [0, dummy],
            [1, dummy],
            [2, dummy],
            [3, dummy]
        ])
        nodeA.children[0].sources = new Map([
            [1, dummy],
            [2, dummy],
            [3, dummy]
        ])
        nodeB.sources = new Map([
            [2, dummy],
            [1, dummy],
            [0, dummy],
            [3, dummy]
        ])
        nodeB.children[0].sources = new Map([
            [2, dummy],
            [3, dummy],
            [1, dummy]
        ])

        expect(nodeA.equals(nodeB)).toBeTruthy()
    })
})
