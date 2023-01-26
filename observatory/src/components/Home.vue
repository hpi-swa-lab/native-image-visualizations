<script lang="ts">
import MainLayout from './MainLayout.vue'
import { VisualizationType } from '../ts/enums/VisualizationType'
import { defineComponent } from 'vue'

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
    <MainLayout title="Home" :visualization-type="VisualizationType.None">
        <template #controls></template>
    </MainLayout>
</template>
