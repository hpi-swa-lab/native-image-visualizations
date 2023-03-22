import { describe, expect, test } from '@jest/globals'
import { Universe } from '../src/ts/UniverseTypes/Universe'
import { forest } from './data/forest'

describe('universe', () => {
    describe('equals', () => {
        test('returns true if name and root are equal', () => {
            const universeA = new Universe('universeA', '#000000', forest.overlappingTreeA)
            const universeB = new Universe('universeA', '#000000', forest.overlappingTreeA)

            expect(universeA.equals(universeB)).toBeTruthy()
        })

        test('returns false if names are not equal', () => {
            const universeA = new Universe('universeA', '#000000', forest.overlappingTreeA)
            const universeB = new Universe('universeB', '#000000', forest.overlappingTreeA)

            expect(universeA.equals(universeB)).toBeFalsy()
        })

        test('returns false if roots are not equal', () => {
            const universeA = new Universe('universeA', '#000000', forest.overlappingTreeA)
            const universeB = new Universe('universeA', '#000000', forest.overlappingTreeB)

            expect(universeA.equals(universeB)).toBeFalsy()
        })

        test('returns false if names and roots are not equal', () => {
            const universeA = new Universe('universeA', '#000000', forest.overlappingTreeA)
            const universeB = new Universe('universeB', '#000000', forest.overlappingTreeB)

            expect(universeA.equals(universeB)).toBeFalsy()
        })
    })
})
