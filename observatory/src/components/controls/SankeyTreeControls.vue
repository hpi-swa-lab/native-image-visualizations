<script setup lang="ts">
import {SortingOption, SortingOrder} from "../../ts/enums/Sorting";
import {UniverseProps, Dictionary} from "../../ts/SharedTypes/UniverseProps";
import type { PropType } from "vue";

import Switch from "./Switch.vue";
import ColorLabel from "./ColorLabel.vue";
import * as d3 from "d3";

const SHORTCUT_TEXTS = ['shift+click on node expands branch']

const UNMODIFIED = 'UNMODIFIED'

// colors
const COLOR_RED = d3.rgb(250, 82, 82)
const COLOR_GREEN = d3.rgb(148, 216, 45)
const COLOR_BLUE = d3.rgb(165, 216, 255)
const COLOR_MODIFIED = COLOR_BLUE
const COLOR_GREY = d3.rgb(150, 150, 150)
const COLOR_UNMODIFIED = COLOR_GREY

// TODO #39 set {} default value for universeMetadata
let props = defineProps({
  universesMetadata: {
    type: Object as PropType<Dictionary<UniverseProps>>,
    default: {
      '0': {name: 'Universe1', color: COLOR_RED},
      '1': {name: 'Universe2', color: COLOR_GREEN}
    }
  }
})

const sortings = [SortingOption, SortingOrder]
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
        <template v-for="key in getFilteredKeys()">
          <Switch :id="key" :value="universesMetadata[key].name">
              <ColorLabel :value="universesMetadata[key].name" :color="universesMetadata[key].color.formatHex()"></ColorLabel>
          </Switch>
        </template>

        <Switch :id="UNMODIFIED" value="unmodified packages">
          <ColorLabel value="unmodified packages" :color="COLOR_UNMODIFIED.formatHex()"></ColorLabel>
        </Switch>

        <ColorLabel value="modified packages" :color="COLOR_MODIFIED.formatHex()"></ColorLabel>
      </fieldset>

<!--      SORTING FILTER -->
      <fieldset class="border rounded p-2 w-auto">
        <legend class="w-auto float-none p-2 fs-5">Node Sorting:</legend>

<!--        TODO #39 check defaults-->
        <div class="flex flex-wrap">
          <template v-for="sorting in sortings">
            <div class="pr-5 pl-0">
              <template v-for="option in Object.values(sorting).filter(value => typeof value === 'string')">
                <div class="relative block mb-2">
                  <input :id="option" :name="sorting.getName()" :value="option" type="radio"/>
                  <label class="ml-1"> {{option}} </label>
                </div>
              </template>
            </div>
          </template>
        </div>
      </fieldset>

<!--      SUBMIT BUTTON -->
      <button type="submit" class="btn btn-sm btn-primary m-2">update</button>

<!--      EXPAND TREE BUTTON -->
      <button type="button" id="expand-tree-btn" class="btn btn-light m-2">expand full tree</button>

<!--      SHORTCUTS BOX -->
      <div role="alert">
        <div class=" alert-title">
          Shortcuts
        </div>
        <div class="alert-text">
          <ul class="list-unstyled">
            <li v-for="text in SHORTCUT_TEXTS"> {{text}} </li>
          </ul>
        </div>
      </div>

    </form>

  </div>
</template>

<style scoped>
.alert-title {
  @apply bg-cyan-600 text-white rounded-t px-4 py-2
}

.alert-text {
  @apply border border-t-0 border-cyan-400 rounded-b bg-cyan-100 px-4 py-3 text-cyan-700
}
</style>