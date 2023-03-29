<script setup lang="ts">
import { computed, onMounted, ref, toRaw, watch } from 'vue'
import MainLayout from '../layouts/MainLayout.vue'
import { CutToolVis } from '../../ts/Visualizations/CutTool'
import { useGlobalStore } from '../../ts/stores/globalStore'
import { Universe } from '../../ts/UniverseTypes/Universe'
import { SortingOption } from '../../ts/enums/Sorting'
import { useCutToolStore } from '../../ts/stores/cutToolStore'
import {
    CausalityGraphUniverse,
    forEachInSubtree,
    FullyHierarchicalNode
} from '../../ts/UniverseTypes/CausalityGraphUniverse'
import { Multiverse } from '../../ts/UniverseTypes/Multiverse'
import AlertBox from '../controls/AlertBox.vue'

const store = useGlobalStore()
const cutToolStore = useCutToolStore()
const multiverse = computed(() => store.multiverse)

let visualization: CutToolVis | undefined

const container = ref<HTMLDivElement>()

const infoText = computed(() => {
    const m = multiverse.value as Multiverse

    let universe
    if (m.sources.length === 0) {
        return ['Select a universe to inspect']
    } else if (m.sources.length > 1) {
        return ['Please select only one universe.']
    } else {
        universe = m.sources[0]
        if (!(universe instanceof CausalityGraphUniverse)) {
            return ['The selected universe does not contain Causality Data.']
        }
    }

    return undefined
})

onMounted(() => {
    // We know this is never null because an element with the corresponding
    // `ref` exists below and this code is executed after mounting.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    visualization = new CutToolVis(container.value!)
    visualization?.setMultiverse(toRaw(multiverse.value as Multiverse))
})

watch(multiverse, (newMultiverse) => {
    visualization?.setMultiverse(toRaw(newMultiverse as Multiverse))
})

function detailViewClose(): void {
    cutToolStore.setDetailSelectedNode(undefined)
}

function searchMainFunction(): void {
    const universes = multiverse.value.sources
    if (universes.length === 1) {
        const u = toRaw(universes[0]) as Universe

        if (u instanceof CausalityGraphUniverse) {
            let mainNode: FullyHierarchicalNode | undefined

            forEachInSubtree(u.causalityRoot, (v) => {
                if (v.main) mainNode = v
            })
            if (mainNode && mainNode.fullname) {
                cutToolStore.changeCutviewSearch(mainNode.fullname)
            }
        }
    }
}
</script>

<template>
    <MainLayout title="Cut Tool">
        <template #controls>
            <div class="p-2 pt-0">
                <label class="block">Cut Overview:</label>
                <div class="w-full flex content-start mb-2">
                    <div class="absolute mt-2.5 pl-3 pointer-events-none">
                        <svg
                            aria-hidden="true"
                            class="w-5 h-5 text-gray-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            ></path>
                        </svg>
                    </div>

                    <input
                        ref="searchText"
                        v-model="cutToolStore.cutview.search"
                        type="search"
                        class="pl-10"
                        placeholder="Search nodes"
                    />
                </div>
                <form class="flex pl-2">
                    <label class="block mt-[3px] mr-5">Sort by:</label>
                    <template v-for="(option, index) in Object.values(SortingOption)" :key="index">
                        <div class="relative block ml-2">
                            <input
                                :id="option"
                                name="sorting-options"
                                :value="option"
                                type="radio"
                                :checked="cutToolStore.isCutviewSortingOptionSelected(option)"
                                @change="cutToolStore.setCutviewSortingOption(option)"
                            />
                            <label :for="option" class="ml-1"> {{ option }} </label>
                        </div>
                    </template>
                </form>
                <button
                    class="z-10 btn bg-gray-50 mt-2 border hover:bg-gray-200 text-[small]"
                    @click="searchMainFunction"
                >
                    Search for main method
                </button>
            </div>

            <hr />
            <div class="p-2">
                <label class="block">Image Overview:</label>

                <div class="w-full flex content-start mb-2">
                    <div class="absolute mt-2.5 pl-3 pointer-events-none">
                        <svg
                            aria-hidden="true"
                            class="w-5 h-5 text-gray-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            ></path>
                        </svg>
                    </div>

                    <input
                        ref="searchText"
                        v-model="cutToolStore.imageview.search"
                        type="search"
                        class="pl-10"
                        placeholder="Search nodes"
                    />
                </div>
                <form class="flex pl-2">
                    <label class="block mt-[3px] mr-5">Sort by:</label>
                    <template v-for="(option, index) in Object.values(SortingOption)" :key="index">
                        <div class="relative block ml-2">
                            <input
                                :id="option"
                                name="sorting-options"
                                :value="option"
                                type="radio"
                                :checked="cutToolStore.isImageviewSortingOptionSelected(option)"
                                @change="cutToolStore.setImageviewSortingOption(option)"
                            />
                            <label :for="option" class="ml-1"> {{ option }} </label>
                        </div>
                    </template>
                </form>
            </div>
        </template>
        <div id="cut-tool-root" ref="container" class="h-[98%]" style="all: initial">
            <div
                v-if="infoText"
                id="status-panel"
                class="flex w-full h-full text-sn"
                style="font-family: system-ui"
            >
                <AlertBox
                    title="Note"
                    :alert-infos="infoText"
                    class="w-[30%] h-fit m-auto align-middle"
                />
            </div>

            <div
                id="loading-panel"
                class="fullscreen cursor-wait"
                style="font-family: system-ui"
                hidden
            >
                <div class="center">Please wait...</div>
            </div>
            <div id="main-panel" class="fullscreen" hidden>
                <div class="float-left w-1/5 h-full overflow-y-scroll resize-x border-r-2 p-1 pl-2">
                    <span><b>Cut Overview:</b></span>
                    <div id="cut-overview-root" class="pt-1"></div>
                </div>
                <div
                    id="detail-div"
                    class="rotate-180 absolute overflow-auto resize border-2 right-0 bottom-0 float-right w-6/12 h-3/6 bg-[white] z-[1]"
                    hidden
                >
                    <div class="rotate-180 h-full w-full">
                        <button
                            class="absolute right-[10px] z-10 btn bg-gray-50 mt-2 ml-2 hover:bg-gray-200 shadow-md"
                        >
                            <font-awesome-icon icon="xmark" @click="detailViewClose" />
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
                <div class="float-none overflow-x-hidden w-[1fr] h-full overflow-y-scroll p-1 pl-2">
                    <span><b>In-Image Overview:</b></span>
                    <div id="imageview-root" class="pt-1"></div>
                </div>
            </div>
        </div>
    </MainLayout>
</template>
