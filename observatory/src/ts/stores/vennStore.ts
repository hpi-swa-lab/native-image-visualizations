import { defineStore } from 'pinia'

export type VennConfig = Record<string, unknown>

export const useVennStore = defineStore('vennConfig', {
    actions: {
        toExportDict(): VennConfig {
            return {}
        }
    }
})
