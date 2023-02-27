import { defineStore } from 'pinia'

export const useCausalityGraphStore = defineStore('causalityGraphConfig', {
    actions: {
        toExportDict(): Record<string, unknown> {
            return {}
        }
    }
})
