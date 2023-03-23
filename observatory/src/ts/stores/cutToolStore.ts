import { defineStore } from 'pinia'
import { SortingOption } from '../enums/Sorting'

export type cutToolConfig = Record<string, unknown>

export const useCutToolStore = defineStore('cutToolConfig', {
    state: () => {
        return {
            cutview: {
                sortby: SortingOption.SIZE
            },
            imageview: {
                sortby: SortingOption.SIZE
            }
        }
    },
    getters: {
        isCutviewSortingOptionSelected: (state) => (option: string) =>
            option === state.cutview.sortby.toString(),
        isImageviewSortingOptionSelected: (state) => (option: string) =>
            option === state.imageview.sortby.toString()
    },
    actions: {
        setCutviewSortingOption(option: string) {
            const sortingOption = Object.values(SortingOption).find(
                (item) => item.toString() === option
            )
            this.cutview.sortby = sortingOption ? sortingOption : SortingOption.SIZE
        },
        setImageviewSortingOption(option: string) {
            const sortingOption = Object.values(SortingOption).find(
                (item) => item.toString() === option
            )
            this.imageview.sortby = sortingOption ? sortingOption : SortingOption.SIZE
        }
    }
})
