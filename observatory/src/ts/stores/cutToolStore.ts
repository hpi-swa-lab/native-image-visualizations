import { defineStore } from 'pinia'
import { SortingOption } from '../enums/Sorting'
import { FullyHierarchicalNode } from '../UniverseTypes/CausalityGraphUniverse'
import {findNodesIncludingIdentifier} from '../Math/filters';
import {toRaw} from 'vue';
import {Node} from '../UniverseTypes/Node';
import {Universe} from '../UniverseTypes/Universe';
import {deserializeLayer, Layers, serializerLayer} from '../enums/Layers';
import {deserializeComponent, serializeComponent, SwappableComponentType} from '../enums/SwappableComponentType';
import {GlobalConfig} from './globalStore';
import {loadStringArrayParameter, loadStringParameter} from './helpers';
import {Filter} from '../SharedTypes/Filters';
import CutTool from '../../components/visualizations/CutTool.vue';

export type CutToolConfig = Record<string, unknown>

export const useCutToolStore = defineStore('cutToolConfig', {
    state: () => {
        return {
            cutview: {
                sortby: SortingOption.SIZE,
                search: '',
                // This is treated like an immutable set,
                // in order to notify on update without deep watching
                selection: new Set<FullyHierarchicalNode>()
            },
            imageview: {
                sortby: SortingOption.SIZE,
                search: ''
            },
            detailview: {
                selected: undefined as FullyHierarchicalNode | undefined
            },
        }
    },
    getters: {
        isCutviewSortingOptionSelected: (state) => (option: string) =>
            option === state.cutview.sortby.toString(),
        isImageviewSortingOptionSelected: (state) => (option: string) =>
            option === state.imageview.sortby.toString()
    },
    actions: {
        toExportDict(): CutToolConfig {
            return {
                cutviewSearch: this.cutview.search,
                imageviewSearch: this.imageview.search
            }
        },
        loadExportDict(config: CutToolConfig) {
            loadStringParameter(
                'cutviewSearch',
                config,
                (search: string) => search,
                (search: string) => this.changeCutviewSearch(search)
            )
            loadStringParameter(
                'imageviewSearch',
                config,
                (search: string) => search,
                (search: string) => this.changeImageviewSearch(search)
            )
        },
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
        },
        setDetailSelectedNode(node: FullyHierarchicalNode | undefined) {
            this.detailview.selected = node
        },
        changeCutviewSearch(newSearch: string): void {
            this.cutview.search = newSearch
        },
        changeImageviewSearch(newSearch: string): void {
            this.imageview.search = newSearch
        },
        deleteCutviewSelection(v: FullyHierarchicalNode): boolean {
            const copy = new Set([...this.cutview.selection].map(toRaw))
            if(!copy.delete(v))
                return false
            this.cutview.selection = copy
            return true
        },
        addCutviewSelection(v: FullyHierarchicalNode): void {
            const copy = new Set([...this.cutview.selection].map(toRaw))
            if(copy.has(v))
                return
            copy.add(v)
            this.cutview.selection = copy
        },
        toggleCutviewSelection(v: FullyHierarchicalNode): boolean {
            const copy = new Set([...this.cutview.selection].map(toRaw))
            const had = copy.has(v)
            if(had) {
                copy.delete(v)
            } else {
                copy.add(v)
            }
            this.cutview.selection = copy
            return !had
        }
    }
})
