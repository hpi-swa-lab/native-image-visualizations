<script setup lang="ts">
import { EventType } from '../../ts/enums/EventType'

withDefaults(
    defineProps<{
        ids: string[]
        values: unknown[]
        checked: boolean[]
        disabled?: boolean[]
    }>(),
    {
        ids: () => [],
        values: () => [],
        checked: () => [],
        disabled: () => []
    }
)
</script>

<template>
    <div>
        <input
            v-for="(item, index) in ids" 
            :id="ids[index]"
            :key="item"
            :value="values[index]"
            type="checkbox"
            class="mr-1"
            :checked="checked[index]"
            :disabled="disabled[index]"
            @change="$emit(EventType.CHANGE, values[index])"
        />
        <slot></slot>
    </div>
</template>
