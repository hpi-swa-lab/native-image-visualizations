<script setup lang="ts">
import { Filter } from '../../ts/SharedTypes/Filters';
import { globalConfigStore } from '../../ts/stores'
import MultiToggleSwitch from './MultiToggleSwitch.vue';

const store = globalConfigStore()
</script>

<template>
    <fieldset class="w-auto">
        <MultiToggleSwitch
            v-for="(filter, index) in store.filters"
            :key="index"
            :ids="[filter.description, 'not ' + filter.description]"
            :values="[false, true]"
            :checked="[store.isFilterActive(filter, false), store.isFilterActive(filter, true)]"
            @change.self ="store.toggleFilter(filter, $event)"
        >
            <label for="label">{{filter.description}}</label>
        </MultiToggleSwitch>
        
    </fieldset>
</template>
