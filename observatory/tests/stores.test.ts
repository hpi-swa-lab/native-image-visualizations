import { describe, expect, test } from '@jest/globals'
import { Universe } from '../src/ts/UniverseTypes/Universe'
import { Node } from '../src/ts/UniverseTypes/Node'
import { globalConfigStore } from '../src/ts/stores'
import { setActivePinia, createPinia } from 'pinia'

let store: any

describe('global store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        store = globalConfigStore()
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
