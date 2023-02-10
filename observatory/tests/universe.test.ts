import { describe, expect, test } from '@jest/globals'
import { Universe } from '../src/ts/UniverseTypes/Universe'
import { forest } from './data/forest'

describe('universe', () => {
    describe('equals', () => {
        test('returns true if name and root are equal', () => {
            const universeA = new Universe('universeA', forest.overlappingTreeA)
            const universeB = new Universe('universeA', forest.overlappingTreeA)

            expect(universeA.equals(universeB)).toBeTruthy()
        })

        test('returns false if names are not equal', () => {
            const universeA = new Universe('universeA', forest.overlappingTreeA)
            const universeB = new Universe('universeB', forest.overlappingTreeA)

            expect(universeA.equals(universeB)).toBeFalsy()
        })

        test('returns false if roots are not equal', () => {
            const universeA = new Universe('universeA', forest.overlappingTreeA)
            const universeB = new Universe('universeA', forest.overlappingTreeB)

            expect(universeA.equals(universeB)).toBeFalsy()
        })

        test('returns false if names and roots are not equal', () => {
            const universeA = new Universe('universeA', forest.overlappingTreeA)
            const universeB = new Universe('universeB', forest.overlappingTreeB)

            expect(universeA.equals(universeB)).toBeFalsy()
        })
    })
})
