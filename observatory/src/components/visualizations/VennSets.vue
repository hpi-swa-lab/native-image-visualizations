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
            VisualizationType
        }
    }
})
</script>

<template>
    <MainLayout title="VennSets" :visualization-type="VisualizationType.VennSets">
        <template #controls />

        <div id="container" />
    </MainLayout>
</template>