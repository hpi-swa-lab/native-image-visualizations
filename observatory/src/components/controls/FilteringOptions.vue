<script setup lang="ts">
import ToggleSwitch from './ToggleSwitch.vue'
import { globalConfigStore } from '../../ts/stores'
import { Node } from '../../ts/UniverseTypes/Node'
import { Filter } from '../../ts/SharedTypes/Filters';

const FILTERS_BY_LABEL = new Map<string, Filter>([
    ['Java Native Interface', (node: Node) => node.isJni], 
    ['Synthetic', (node: Node) => node.isSynthetic], 
    ['Reflective', (node: Node) => node.isReflective]
])

const store = globalConfigStore()
</script>

<template>
    <fieldset class="w-auto">
        <ToggleSwitch
            v-for="label in FILTERS_BY_LABEL.keys()"
            :id="label"
            :key="label"
            :value="label"
            :checked="store.isUsingFilter(FILTERS_BY_LABEL.get(label) as Filter)"
            @input="store.toggleFilter(FILTERS_BY_LABEL.get(label) as Filter)"
        >
            <label for="label">{{label}}</label>
        </ToggleSwitch>
    </fieldset>
</template>
