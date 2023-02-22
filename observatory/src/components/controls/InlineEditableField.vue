<template>
  <div :class="!isEditEnabled && 'overflow-x-hidden'">
      <template v-if="isEditEnabled">
        <input type="text" v-model="inputValue" ref="inputElement" class="p-1 m-0 w-full" @focusout="saveEdit" @keyup.enter="saveEdit"/>
      </template>
      <template v-else>
        <label class="mx-1 hover:cursor-text block my-auto" @click="toggleEdit">
          {{ inputValue }}
        </label>
      </template>
  </div>
</template>

<script setup lang="ts">

import {nextTick, ref} from "vue";
import {globalConfigStore} from "../../ts/stores";

const props = withDefaults(
    defineProps<{
      label: string
    }>(),
    {
      label: ''
    }
)

const inputElement = ref<HTMLInputElement>();
let inputValue = ref(props.label)
let oldUniverseName = props.label

const store = globalConfigStore()
const isEditEnabled = ref<boolean>(false)

function saveEdit(event: Event) {
  console.log(event)
  isEditEnabled.value = false
  store.updateUniverseName(oldUniverseName, inputValue.value)
  oldUniverseName = inputValue.value
  console.log(store.universes.map(u => u.name))
}
function toggleEdit() {
    isEditEnabled.value = true
    nextTick(() => {
      if(inputElement.value) {
        inputElement.value.focus()
      }
    })
}

</script>
