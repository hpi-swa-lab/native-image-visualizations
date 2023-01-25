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
            vt: VisualizationType.CausalityGraph
        }
    }
})
</script>

<template>
    <MainLayout title="WIP: Causality Graph" :visualization-type="vt">
        <template #controls />

        <div id="container" />
    </MainLayout>
</template>
