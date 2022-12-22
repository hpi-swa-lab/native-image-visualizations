import * as d3 from 'd3'
import { HierarchyPointNode } from 'd3'

export enum CheckInputType {
    CHECKBOX = 'checkbox',
    RADIO = 'radio'
}

export enum CheckInputRole {
    SWITCH = 'switch'
}

export enum SortingOption {
    NAME = 'name',
    SIZE = 'size'
}

export enum SortingOrder {
    ASCENDING = 'ascending',
    DESCENDING = 'descending'
}

export enum CustomEventName {
    APPLY_FILTER = 'apply-filter',
    EXTEND_TREE = 'extend-tree'
}

export type CustomEventDetails = {
    name: string
    filter: TreeNodesFilter
}

export type MyNode = {
    name: string
    children: MyNode[]
    parent: MyNode
    universes: Set<number>
    isModified: boolean
    isFiltered: boolean
    //     sizes?: { [id: string] : number; }
    codeSize: number
    //     exclusiveSizes?: { [id: string] : number; }
}

export type Tree = {
    layout?: d3.TreeLayout<unknown>
    root?: HierarchyPointNode<MyNode>
    leaves: MyNode[]
    sets: string[]
    treeData: MyNode
}

export type SvgSelections = {
    svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>
    zoomG: d3.Selection<SVGGElement, unknown, HTMLElement, any>
    gNode: d3.Selection<SVGGElement, unknown, HTMLElement, any>
    gLink: d3.Selection<SVGGElement, unknown, HTMLElement, any>
    tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>
}

export type UniverseProps = {
    name: string
    color: d3.Color
}

export type Dictionary<T> = {
    [id: string]: T
}

export type TreeNodesFilter = {
    diffing: DiffingUniversesFilter
    sorting: NodesSortingFilter
}

export type DiffingUniversesFilter = {
    universes: Set<string>
    showUnmodified: boolean
}

export type NodesSortingFilter = {
    option: string
    order: string
}
