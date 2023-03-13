import { defineStore } from 'pinia'
import { deserializeSortingOrder, SortingOrder } from '../enums/Sorting'

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
            if (config['sortingOrder'] && typeof config['sortingOrder'] === 'string') {
                const sortingOrder = deserializeSortingOrder(config['sortingOrder'])

                if (sortingOrder) {
                    this.setSortingOrder(sortingOrder)
                }
            }
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
