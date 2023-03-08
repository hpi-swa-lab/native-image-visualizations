import { defineStore } from 'pinia'

export type CausalityGraphConfig = Record<string, unknown>

export const useCausalityGraphStore = defineStore('causalityGraphConfig', {
    actions: {
        loadExportDict(config: CausalityGraphConfig) {},
        toExportDict(): CausalityGraphConfig {
            return {}
        }
    }
})
