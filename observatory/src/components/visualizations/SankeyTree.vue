<script lang="ts">
import { VisualizationType } from '../../ts/enums/VisualizationType'
import { defineComponent } from 'vue'
import MainLayout from '../MainLayout.vue'

export default defineComponent({
    components: {
        MainLayout
    },
    data() {
        return {
            vt: VisualizationType.SankeyTree
        }
    }
})
</script>

<template>
    <MainLayout title="Sankey Tree" :visualization-type="vt">
        <template #controls />

        <div id="container" />
    </MainLayout>
</template>
