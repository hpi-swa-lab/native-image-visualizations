<script setup lang="ts">
import { TooltipModel } from '../../ts/Visualizations/TooltipModel'

const X_OFFSET = 20
const Y_OFFSET = -70

withDefaults(
    defineProps<{
        dataModel: TooltipModel
    }>(),
    {
        dataModel: function () {
            return new TooltipModel()
        }
    }
)
</script>

<template>
    <div
        v-if="dataModel.show"
        id="tooltip"
        class="border absolute pointer-events-none p-2 bg-white whitespace-pre-line opacity-90"
        :style="{ left: dataModel.x + X_OFFSET + 'px', top: dataModel.y + Y_OFFSET + 'px' }"
    >
        <!--Reason for disabling: We don't have any sensitive user data-->
        <!--eslint-disable-next-line vue/no-v-html-->
        <span v-html="dataModel.content"> </span>
    </div>
</template>
