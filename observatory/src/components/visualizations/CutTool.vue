<script setup lang="ts">
import { computed, onMounted, ref, toRaw, watch } from 'vue'
import MainLayout from '../layouts/MainLayout.vue'
import { CutToolVis } from '../../ts/Visualizations/CutTool'
import { useGlobalStore } from '../../ts/stores/globalStore'
import styleContent from './CutTool.css?inline'

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

function detailViewClose(): void {
    visualization?.closeDetailView()
}
</script>

<style src="./CutTool.css" />

<template>
    <MainLayout title="Cut Tool">
        <div id="cut-tool-root" ref="container">
            <!-- eslint-disable -->
            <!--            <component is="style" scoped>-->
            <!--                {{ styleContent }}-->
            <!--            </component>-->
            <!-- eslint-enable -->
            <div id="loading-panel" class="fullscreen" hidden>
                <div class="center">Causality Graph is being parsed...</div>
            </div>

            <div id="main-panel" class="fullscreen" hidden>
                <div id="overview-div">
                    <span><b>Cut Overview:</b></span>
                    <div id="cut-overview-root"></div>
                </div>
                <div id="detail-div" hidden class="outer-ne-resize">
                    <div class="inner-ne-resize">
                        <button
                            class="absolute right-[10px] z-10 btn bg-gray-50 mt-2 ml-2 hover:bg-gray-200 shadow-md"
                        >
                            <font-awesome-icon
                                icon="xmark"
                                @click="detailViewClose"
                            />
                        </button>
                        <span style="position: absolute; padding: 10px; background: white"
                            ><b>Detail-view:</b></span
                        >
                        <svg id="detail-svg" class="h-full w-full">
                            <g id="chartpanel">
                                <g id="chart"></g>
                            </g>
                        </svg>
                    </div>
                </div>
                <div id="imageview-div">
                    <span><b>In-Image Overview:</b></span>
                    <div id="imageview-root"></div>
                </div>
            </div>
        </div>
    </MainLayout>
</template>
