<script setup lang="ts">
import {EventType} from "../../ts/enums/EventType";

const props = withDefaults(
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

let test = props.checked
</script>

<template>
    <div>
        <input :id="id" :value="value" type="checkbox" class="mr-1" :checked="checked" @changed="$emit(EventType.CHANGED, value)">
        <slot></slot>
    </div>
</template>
