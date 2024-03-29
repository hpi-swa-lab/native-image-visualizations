/* eslint-disable  @typescript-eslint/no-explicit-any */
import * as d3 from 'd3'
import { HierarchyPointNode } from 'd3'
import { NodesFilter } from './NodesFilter'
import { Node } from '../UniverseTypes/Node'
import { UniverseProps } from '../interfaces/UniverseProps'

export type FilterEventDetails = {
    name: string
    filter: NodesFilter
}

export type UniverseMetadata = Record<number, UniverseProps>

export interface SankeyHierarchyPointNode extends HierarchyPointNode<Node> {
    id: string | undefined // override to remove readonly
    _children: SankeyHierarchyPointNode[] | undefined // backed up children
    initialX: number
    initialY: number
}

export type SankeyTreeCompound = {
    layout: d3.TreeLayout<unknown>
    root: SankeyHierarchyPointNode
    leaves: Node[]
    rootNode: Node
}

export type ContainerSelections = {
    svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>
    zoomGroup: d3.Selection<SVGGElement, unknown, HTMLElement, any>
    nodeGroup: d3.Selection<SVGGElement, unknown, HTMLElement, any>
    linkGroup: d3.Selection<SVGGElement, unknown, HTMLElement, any>
}

export type NodeTextPositionOffset = {
    start: number
    end: number
}
