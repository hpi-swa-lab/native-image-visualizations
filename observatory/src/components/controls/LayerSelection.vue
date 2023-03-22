<script setup lang="ts">
import { Layers } from '../../ts/enums/Layers'
import { useGlobalStore } from '../../ts/stores/globalStore'

const store = useGlobalStore()

function applyLayer(event: Event) {
    const currentLayer = parseInt((event.target as HTMLSelectElement).value)
    store.switchToLayer(currentLayer)
}

const layers = Object.entries(Layers).slice(
    Layers.MULTIVERSE + 1,
    Object.entries(Layers).length / 2
)
</script>

<template>
    <div>
        <label for="layer-selection">Current Granularity:</label>

        <div class="slider">
            <input
                id="layer-selection"
                name="Layer"
                type="range"
                class="block w-full"
                :value="store.currentLayer"
                :min="Layers.MODULES"
                :max="Layers.METHODS"
                :step="1"
                list="granularities"
                @change="applyLayer"
            />
        </div>

        <datalist id="granularities" class="flex flex-column w-full justify-between">
            <template v-for="layer in layers" :key="layer">
                <option :value="layer[0]" :label="(layer[1] as string).toLowerCase()" />
            </template>
        </datalist>
    </div>
</template>
