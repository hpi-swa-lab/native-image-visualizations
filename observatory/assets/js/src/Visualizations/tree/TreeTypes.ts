import * as d3 from 'd3'
import { HierarchyPointNode } from 'd3'

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
    universes: Set<string>
    showUnmodified: boolean
    ignore: boolean // true, if this filter should be ignored; otherwise false
}
