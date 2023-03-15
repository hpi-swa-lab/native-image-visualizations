import { defineStore } from 'pinia'
import { deserializeSortingOrder, SortingOrder } from '../enums/Sorting'
import { loadStringParameter } from './helpers'

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
        loadExportDict(config: VennConfig): void {
            loadStringParameter(
                'sortingOrder',
                config,
                (order: string) => deserializeSortingOrder(order),
                (order: SortingOrder) => this.setSortingOrder(order)
            )
        },
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
