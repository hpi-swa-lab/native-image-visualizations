<script setup lang="ts">
import { computed, onMounted, ref, toRaw, watch } from 'vue'
import MainLayout from '../layouts/MainLayout.vue'
import { CutToolVis } from '../../ts/Visualizations/CutTool'
import { useGlobalStore } from '../../ts/stores/globalStore'
import { Universe } from '../../ts/UniverseTypes/Universe'
import { SortingOption } from '../../ts/enums/Sorting'
import { useCutToolStore } from '../../ts/stores/cutToolStore'
import { faHouse } from '@fortawesome/free-solid-svg-icons'
import {
    CausalityGraphUniverse,
    forEachInSubtree,
    FullyHierarchicalNode
} from '../../ts/UniverseTypes/CausalityGraphUniverse'
import { Multiverse } from '../../ts/UniverseTypes/Multiverse'

const store = useGlobalStore()
const cutToolStore = useCutToolStore()
const multiverse = computed(() => store.multiverse)

let visualization: CutToolVis | undefined

const container = ref<HTMLDivElement>()

onMounted(() => {
    // We know this is never null because an element with the corresponding
    // `ref` exists below and this code is executed after mounting.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    visualization = new CutToolVis(container.value!)
    visualization.setMultiverse(toRaw(multiverse.value as Multiverse))
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
            <div class="border rounded p-2">
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
                <form class="flex border rounded p-2">
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
                    title="Focus on main()"
                    class="z-10 btn bg-gray-50 mt-2 ml-2 hover:bg-gray-200 shadow-md"
                    @click="searchMainFunction"
                >
                    <font-awesome-icon :icon="faHouse" />
                </button>
            </div>
            <div class="border rounded p-2">
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
                <form class="border rounded p-2 flex">
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
            <div id="loading-panel" class="fullscreen cursor-wait" hidden>
                <div class="center">Please wait...</div>
            </div>
            <div id="status-panel" class="fullscreen" hidden>
                <div class="center"></div>
            </div>

            <div id="main-panel" class="fullscreen" hidden>
                <div
                    class="float-left w-1/5 h-full overflow-y-scroll resize-x ml-2 mr-1 border-r-2"
                >
                    <span><b>Cut Overview:</b></span>
                    <div id="cut-overview-root"></div>
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
                <div class="float-none overflow-x-hidden w-[1fr] h-full overflow-y-scroll">
                    <span><b>In-Image Overview:</b></span>
                    <div id="imageview-root"></div>
                </div>
            </div>
        </div>
    </MainLayout>
</template>
