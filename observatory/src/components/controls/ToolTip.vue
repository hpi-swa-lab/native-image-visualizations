<script setup lang="ts">
import { ToolTipModel } from '../../ts/Visualizations/ToolTipModel'

const yOffset = -70
const xOffSet = 20

withDefaults(
    defineProps<{
        dataModel: ToolTipModel
    }>(),
    {
        dataModel: function () {
            return new ToolTipModel()
        }
    }
)
</script>

<template>
    <div
        v-if="dataModel.show"
        id="tooltip"
        class="border absolute pointer-events-none p-2 bg-white whitespace-pre-line opacity-90"
        :style="{ left: dataModel.x + xOffSet + 'px', top: dataModel.y + yOffset + 'px' }"
    >
        <!--Reason for disabling: We don't have any sensitive user data-->
        <!--eslint-disable-next-line vue/no-v-html-->
        <span v-html="dataModel.content"> </span>
    </div>
</template>
