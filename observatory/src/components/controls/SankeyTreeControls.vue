<script setup lang="ts">
import ToggleSwitch from './ToggleSwitch.vue'
import type { PropType } from 'vue'

import ColorLabel from './ColorLabel.vue'
import * as d3 from 'd3'
import {
    COLOR_GREEN,
    COLOR_RED,
    COLOR_MODIFIED,
    COLOR_UNMODIFIED,
    UNMODIFIED
} from '../../ts/Visualizations/SankeyTreeConstants'
import { SortingOption, SortingOrder } from '../../ts/enums/Sorting'

type UniverseProps = {
    name: string
    color: d3.Color
}

const SHORTCUT_TEXTS = ['shift+click on node expands branch']

// TODO #39 set {} default value for universeMetadata
// cannot use defaultWith() with Objects
const props = defineProps({
    universesMetadata: {
        type: Object as PropType<Record<string, UniverseProps>>,
        default: () => {
            return {
                '0': { name: 'Universe1', color: COLOR_RED },
                '1': { name: 'Universe2', color: COLOR_GREEN }
            }
        }
    }
})

const sortingTypes = [SortingOption, SortingOrder]
function getFilteredKeys(): string[] {
    return Object.keys(props.universesMetadata).filter((key) => key.length == 1)
}
</script>

<template>
    <div id="sankey-tree-controls" class="input-container settings-container">
        <form>
            <h3>Controls</h3>

            <!--      DIFFING FILTER-->
            <fieldset class="border rounded p-2 w-auto">
                <legend class="w-auto float-none p-2 fs-5">Universes to display:</legend>

                <!--        TODO #39 check defaults-->
                <ToggleSwitch
                    v-for="key in getFilteredKeys()"
                    :id="key"
                    :key="key"
                    :value="universesMetadata[key].name"
                >
                    <ColorLabel
                        :value="universesMetadata[key].name"
                        :color="universesMetadata[key].color.formatHex()"
                    ></ColorLabel>
                </ToggleSwitch>

                <ToggleSwitch :id="UNMODIFIED" value="unmodified packages">
                    <ColorLabel
                        value="unmodified packages"
                        :color="COLOR_UNMODIFIED.formatHex()"
                    ></ColorLabel>
                </ToggleSwitch>

                <ColorLabel
                    value="modified packages"
                    :color="COLOR_MODIFIED.formatHex()"
                ></ColorLabel>
            </fieldset>

            <!--      SORTING FILTER -->
            <fieldset class="border rounded p-2 w-auto">
                <legend class="w-auto float-none p-2 fs-5">Node Sorting:</legend>

                <!--        TODO #39 check defaults-->
                <div class="flex flex-wrap">
                    <template v-for="(sorting, sortingIndex) in sortingTypes" :key="sortingIndex">
                        <div class="pr-5 pl-0">
                            <template
                                v-for="(option, optionIndex) in Object.values(sorting).filter(
                                    (value) => typeof value === 'string'
                                )"
                                :key="optionIndex"
                            >
                                <div class="relative block mb-2">
                                    <input
                                        :id="option"
                                        :name="sortingIndex"
                                        :value="option"
                                        type="radio"
                                    />
                                    <label class="ml-1"> {{ option }} </label>
                                </div>
                            </template>
                        </div>
                    </template>
                </div>
            </fieldset>

            <!--      SUBMIT BUTTON -->
            <button type="submit" class="btn btn-sm btn-primary m-2">update</button>

            <!--      EXPAND TREE BUTTON -->
            <button id="expand-tree-btn" type="button" class="btn btn-light m-2">
                expand full tree
            </button>

            <!--      SHORTCUTS BOX -->
            <div role="alert">
                <div class="alert-title">Shortcuts</div>
                <div class="alert-text">
                    <ul class="list-unstyled">
                        <li v-for="text in SHORTCUT_TEXTS" :key="SHORTCUT_TEXTS.indexOf(text)">
                            {{ text }}
                        </li>
                    </ul>
                </div>
            </div>
        </form>
    </div>
</template>

<style scoped>
.alert-title {
    @apply bg-cyan-600 text-white rounded-t px-4 py-2;
}

.alert-text {
    @apply border border-t-0 border-cyan-400 rounded-b bg-cyan-100 px-4 py-3 text-cyan-700;
}
</style>
