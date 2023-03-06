<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {cutToolConfigStore, globalConfigStore, sankeyTreeConfigStore} from '../../ts/stores'
import MainLayout from '../layouts/MainLayout.vue'
import { CutTool } from '../../ts/Visualizations/CutTool'
import { CausalityGraphUniverse } from '../../ts/UniverseTypes/CausalityGraphUniverse';
import ToggleSwitch from '../controls/ToggleSwitch.vue';

const store = globalConfigStore()
const multiverse = computed(() => store.multiverse)

let visualization: CutTool | undefined = undefined

onMounted(async () => {
    if(multiverse.value.sources.length === 1 && multiverse.value.sources[0] instanceof CausalityGraphUniverse)
        visualization = await CutTool.create(multiverse.value.sources[0])
})

watch(multiverse, async (multiverse) => {
    if(visualization)
        visualization.dispose()
    visualization = undefined

    if(multiverse.sources.length === 1 && multiverse.sources[0] instanceof CausalityGraphUniverse)
        visualization = await CutTool.create(multiverse.sources[0])
})

const cutToolStore = cutToolConfigStore()

function changePrecomputeCutoffs(enable: boolean) {
    if (visualization) {
        cutToolStore.changePrecomputeCutoffs(enable)
        visualization.changePrecomputeCutoffs(enable)
    }
}

</script>

<style src="./CutTool.css"/>

<template>
    <MainLayout title="Cut Tool">
        <template #controls>
            <form class="space-y-4 border rounded p-2">
                <ToggleSwitch
                        :checked="cutToolStore.doesPrecomputeCutoffs()"
                        @input="changePrecomputeCutoffs($event.target.checked)"
                >
                    <label>Precompute Cutoffs</label>
                </ToggleSwitch>
            </form>
        </template>
        <div id="cut-tool-root">
            <div id="loading-panel" class="fullscreen" hidden>
                <div class="center">
                    Causality Graph is being parsed...
                </div>
            </div>

            <div id="main-panel" class="fullscreen" hidden>
                <div class="overview-div">
                    <span><b>Cut Overview:</b></span>
                    <div id="cut-overview-root"></div>
                </div>
                <div class="detail-div" hidden>
                    <svg id="detail-svg" width="100%" height="100%">
                        <marker id="arrowhead" markerWidth="10" markerHeight="7"
                                refX="10" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7"/>
                        </marker>

                        <g id="chartpanel">
                            <rect id="zoom-opfer" fill="black" opacity="0" height="100%" width="100%"></rect>
                            <g id="chart"></g>
                        </g>
                    </svg>
                </div>
                <div class="imageview-div">
                    <span><b>In-Image Overview:</b></span>
                    <div id="imageview-root"></div>
                </div>
            </div>
        </div>
    </MainLayout>
</template>
