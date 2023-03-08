import { describe, expect, test } from '@jest/globals'
import { Universe } from '../src/ts/UniverseTypes/Universe'
import { Node } from '../src/ts/UniverseTypes/Node'
import { useGlobalStore } from '../src/ts/stores/globalStore'
import { setActivePinia, createPinia } from 'pinia'

// Reason for disabling: Type Spec would require repeating entire config interface
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let store: any

describe('global store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        store = useGlobalStore()
    })

    test('removing an observed universe removes it from the multiverse', () => {
        const someUniverse = new Universe('universe', new Node('node'))
        store.addUniverse(someUniverse)
        store.toggleObservationByName(someUniverse.name)

        expect(store.universes.indexOf(someUniverse)).toBeGreaterThan(-1)
        expect(store.observedUniverses.indexOf(someUniverse)).toBeGreaterThan(-1)

        store.removeUniverse(someUniverse.name)

        expect(store.universes.indexOf(someUniverse)).toBe(-1)
        expect(store.observedUniverses.indexOf(someUniverse)).toBe(-1)
        expect(store.multiverse.sources.length).toBe(0)
    })
})
