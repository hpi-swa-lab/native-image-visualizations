<script setup lang="ts">
import {COLOR_GREEN, COLOR_RED, COLOR_MODIFIED, COLOR_UNMODIFIED, UNMODIFIED, MODIFIED} from "../../ts/Visualizations/SankeyTreeVisualization";
import {SortingOption, SortingOrder} from "../../ts/enums/Sorting";
import {UniverseProps, Dictionary} from "../../ts/SharedTypes/UniverseProps";
import type { PropType } from "vue";

import {TreeNodesFilter} from "../../ts/SharedTypes/TreeFilter";

const SHORTCUT_TEXTS = ['shift+click on node expands branch']

let props = defineProps({
      universesMetadata: {
        type: Object as PropType<Dictionary<UniverseProps>>,
        default: {
          '0': {name: 'Universe1', color: COLOR_RED},
          '1': {name: 'Universe2', color: COLOR_GREEN}
        }
      },
      filter: {
        type: Object as PropType<TreeNodesFilter>,
        default: {
          diffing: {
            universes: new Set(['0', '1']),
            showUnmodified: false
          },
          sorting: {
            option: SortingOption.NAME,
            order: SortingOrder.ASCENDING
          }
        }
      }
    })

const sortingOptionLists = [Object.values(SortingOption), Object.values(SortingOrder)]

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

        <template v-for="key in getFilteredKeys()">
          <div class="form-check form-switch">
            <input :id="key" :value="props.universesMetadata[key].name" type="checkbox" class="form-check-input"/>
            <input type="color" class="color-input" :value="props.universesMetadata[key].color.formatHex()" disabled>
            <label> {{props.universesMetadata[key].name}} </label>
          </div>
        </template>

        <div class="form-check form-switch">
          <input :id="UNMODIFIED" value="unmodified packages" type="checkbox" role="switch" class="form-check-input" />
          <input type="color" class="color-input" :value="COLOR_UNMODIFIED.formatHex()" disabled>
          <label>unmodified packages</label>
        </div>

        <div class="form-check form-switch">
          <input type="color" class="color-input" :value="COLOR_MODIFIED.formatHex()" disabled>
          <label :id="MODIFIED">modified packages</label>
        </div>
      </fieldset>

<!--      SORTING FILTER -->
      <fieldset class="border rounded p-2 w-auto">
        <legend class="w-auto float-none p-2 fs-5">Node Sorting:</legend>

        <div class="row">
          <template v-for="options in sortingOptionLists">
            <div class="col-sm-3">
              <template v-for="option in options">
                <div class="form-check">
                  <input :id="option" name="sorting-option" :value="option" type="checkbox" role="radio" class="form-check-input" />
                  <label> {{option}} </label>
                </div>
              </template>
            </div>
          </template>
        </div>
      </fieldset>

<!--      SUBMIT BUTTON -->
      <button type="submit" class="btn btn-sm btn-primary m-2">update</button>

<!--      EXPAND TREE BUTTON -->
      <button type="button" id="expand-tree-btn" class="btn btn-sm btn-secondary m-2">expand full tree</button>

<!--      SHORTCUTS BOX -->
      <div class="alert alert-info mt-3" role="alert">
        <h4>Shortcuts</h4>

        <ul class="list-unstyled">
          <li v-for="text in SHORTCUT_TEXTS"> {{text}} </li>
        </ul>
      </div>

    </form>

  </div>
</template>

<style scoped>

</style>