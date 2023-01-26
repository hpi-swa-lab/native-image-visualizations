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
    <MainLayout title="WIP: Causality Graph" :visualization-type="VisualizationType.CausalityGraph">
        <template #controls />

        <div id="container" />
    </MainLayout>
</template>
