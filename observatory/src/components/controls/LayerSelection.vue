<script setup lang="ts">
import { Layers, layerName } from '../../ts/enums/Layers'
import { globalConfigStore } from '../../ts/stores'

const store = globalConfigStore()

function applyLayer(event: Event) {
    const currentLayer = parseInt((event.target as HTMLSelectElement).value)
    store.switchToLayer(currentLayer)
}
</script>

<template>
    <div>
        <label for="layer-selection"
            >Currently Zooming in on: {{ layerName(store.currentLayer).toLocaleLowerCase() }}</label
        >

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
                @change="applyLayer"
            />
        </div>
    </div>
</template>
