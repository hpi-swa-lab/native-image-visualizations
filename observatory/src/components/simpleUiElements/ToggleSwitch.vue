<script setup lang="ts">
import { EventType } from '../../ts/enums/EventType'

withDefaults(
    defineProps<{
        id: string
        value: unknown
        checked?: boolean
        disabled?: boolean
    }>(),
    {
        id: '',
        checked: false,
        disabled: false
    }
)
</script>

<template>
    <div>
        <input
            :id="id"
            :value="value"
            type="checkbox"
            class="mr-1 scale-75"
            :checked="checked"
            :disabled="disabled"
            @change="$emit(EventType.CHANGE, value)"
        />
        <slot></slot>
    </div>
</template>
