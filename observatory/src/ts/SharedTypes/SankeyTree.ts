import * as d3 from 'd3'
import { HierarchyPointNode } from 'd3'
import { Node } from '../UniverseTypes/Node'
import {UniverseProps} from "../interfaces/UniverseProps";

export type UniverseMetadata = Record<number, UniverseProps>

export type Tree = {
    layout: d3.TreeLayout<unknown>
    root: HierarchyPointNode<Node>
    leaves: Node[]
    rootNode: Node
}

export type ContainerSelections = {
    svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>
    zoomG: d3.Selection<SVGGElement, unknown, HTMLElement, any>
    gNode: d3.Selection<SVGGElement, unknown, HTMLElement, any>
    gLink: d3.Selection<SVGGElement, unknown, HTMLElement, any>
}

export type NodeTextPositionOffset = {
    start: number
    end: number
}