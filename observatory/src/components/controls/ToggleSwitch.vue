<script setup lang="ts">
import { EventType } from '../../ts/enums/EventType'

withDefaults(
    defineProps<{
        id: string
        value: string
        checked: boolean
    }>(),
    {
        id: '',
        value: '',
        checked: false
    }
)
</script>

<template>
    <div>
        <input
            :id="id"
            :value="value"
            type="checkbox"
            class="mr-1"
            :checked="checked"
            @change="$emit(EventType.CHANGE, value)"
        />
        <slot></slot>
    </div>
</template>
