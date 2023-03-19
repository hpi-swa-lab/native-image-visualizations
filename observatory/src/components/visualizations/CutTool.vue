<script setup lang="ts">
import { computed, onMounted, ref, toRaw, watch } from 'vue'
import MainLayout from '../layouts/MainLayout.vue'
import { CutToolVis } from '../../ts/Visualizations/CutTool'
import { useGlobalStore } from '../../ts/stores/globalStore'

const store = useGlobalStore()
const multiverse = computed(() => store.multiverse)

let visualization: CutToolVis | undefined

const container = ref<HTMLDivElement>()

onMounted(() => {
    // We know this is never null because an element with the corresponding
    // `ref` exists below and this code is executed after mounting.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    visualization = new CutToolVis(container.value!)
    const universes = multiverse.value.sources
    if (universes.length === 1) visualization.setUniverse(toRaw(universes[0]))
})

watch(multiverse, (newMultiverse) => {
    const universes = newMultiverse.sources
    if (universes.length === 1) visualization?.setUniverse(toRaw(universes[0]))
})
</script>

<template>
    <MainLayout title="Cut Tool">
        <div id="cut-tool-root" ref="container" class="h-[98%]" style="all: initial">
            <div id="loading-panel" class="fullscreen cursor-wait" hidden>
                <div class="center">Causality Graph is being parsed...</div>
            </div>

            <div id="main-panel" class="fullscreen" hidden>
                <div class="float-left w-1/5 h-full overflow-y-scroll resize-x mr-[5px]">
                    <span><b>Cut Overview:</b></span>
                    <div id="cut-overview-root"></div>
                </div>
                <div id="detail-div" class="float-right w-6/12 h-full" hidden>
                    <svg id="detail-svg" class="h-full w-full">
                        <g id="chartpanel">
                            <rect class="h-full w-full opacity-0" />
                            <g id="chart"></g>
                        </g>
                    </svg>
                </div>
                <div class="float-none overflow-x-hidden w-[1fr] h-full overflow-y-scroll">
                    <span><b>In-Image Overview:</b></span>
                    <div id="imageview-root"></div>
                </div>
            </div>
        </div>
    </MainLayout>
</template>
