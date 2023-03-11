<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import MainLayout from '../layouts/MainLayout.vue'
import { CutTool } from '../../ts/Visualizations/CutTool'
import { CausalityGraphUniverse } from '../../ts/UniverseTypes/CausalityGraphUniverse';
import ToggleSwitch from '../controls/ToggleSwitch.vue';
import {useGlobalStore} from '../../ts/stores/globalStore';
import styleContent from './CutTool.css?inline'

const store = useGlobalStore()
const multiverse = computed(() => store.multiverse)

let visualization: CutTool | undefined = undefined

function cutToolRoot() {
    return document.getElementById('cut-tool-root') as HTMLDivElement
}

onMounted(async () => {
    if(multiverse.value.sources.length === 1 && multiverse.value.sources[0] instanceof CausalityGraphUniverse)
        visualization = await CutTool.create(cutToolRoot(), multiverse.value.sources[0])
})

watch(multiverse, async (multiverse) => {
    if(visualization)
        visualization.dispose()
    visualization = undefined

    if(multiverse.sources.length === 1 && multiverse.sources[0] instanceof CausalityGraphUniverse)
        visualization = await CutTool.create(cutToolRoot(), multiverse.sources[0])
})

</script>

<template>
    <MainLayout title="Cut Tool">
        <div id="cut-tool-root">
            <component is="style" scoped>
                {{styleContent}}
            </component>
            <div id="loading-panel" class="fullscreen" hidden>
                <div class="center">
                    Causality Graph is being parsed...
                </div>
            </div>

            <div id="main-panel" class="fullscreen" hidden>
                <div id="overview-div">
                    <span><b>Cut Overview:</b></span>
                    <div id="cut-overview-root"></div>
                </div>
                <div id="detail-div" hidden>
                    <svg id="detail-svg" width="100%" height="100%">
                        <g id="chartpanel">
                            <rect id="zoom-opfer" fill="black" opacity="0" height="100%" width="100%"></rect>
                            <g id="chart"></g>
                        </g>
                    </svg>
                </div>
                <div id="imageview-div">
                    <span><b>In-Image Overview:</b></span>
                    <div id="imageview-root"></div>
                </div>
            </div>
        </div>
    </MainLayout>
</template>
