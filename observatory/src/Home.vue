<script lang="ts">
import MainLayout from './components/MainLayout.vue'
import { VisualizationType } from './ts/enums/VisualizationType'
import { defineComponent } from 'vue'

export default defineComponent({
    components: {
        MainLayout
    },
    data() {
        return {
            vt: VisualizationType.None
        }
    }
})
</script>

<template>
    <MainLayout title="Home" :visualization-type="vt">
        <template #controls></template>
    </MainLayout>
</template>
