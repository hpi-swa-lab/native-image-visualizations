<script setup lang="ts">
import { Layers, layerName } from '../../ts/enums/Layers'
import { useGlobalStore } from '../../ts/stores/globalStore'

const store = useGlobalStore()

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
                v-model="store.currentLayer"
                name="Layer"
                type="range"
                class="block w-full"
                :min="Layers.MODULES"
                :max="Layers.METHODS"
                :step="1"
                @change="applyLayer"
            />
        </div>
    </div>
</template>
