<script setup lang="ts">
import { emptyObject } from '@jest/expect-utils';
import { EventType } from '../../ts/enums/EventType.js'

const emit = defineEmits(['ascending', 'descending'])

</script>

<template>
    <div id="sankey-tree-controls" class="input-container settings-container space-y-4">
        <button class="btn btn-sm btn-primary" @click="emit('ascending')">Sort Ascending</button>
        <button class="btn btn-sm btn-primary" @click="emit('descending')">Sort Descending</button>
    </div>
</template>
