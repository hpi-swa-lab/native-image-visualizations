import { defineStore } from 'pinia'
import { SortingOrder } from '../enums/Sorting'

export type VennConfig = Record<string, unknown>

export const useVennStore = defineStore('vennConfig', {
    state: () => {
        return {
            sortingOrder: SortingOrder.NONE
        }
    },
    getters: {
        isSortingOrder: (state) => (option: string) => option === state.sortingOrder
    },
    actions: {
        toExportDict(): VennConfig {
            return {
                sortingOrder: this.sortingOrder
            }
        },
        setSortingOrder(order: SortingOrder) {
            this.sortingOrder = order
        }
    }
})
