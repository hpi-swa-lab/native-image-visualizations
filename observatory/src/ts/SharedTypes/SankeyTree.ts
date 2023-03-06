import * as d3 from 'd3'
import { HierarchyPointNode } from 'd3'
import {NodesFilter} from "./NodesFilter";
import { Node } from '../UniverseTypes/Node'
import {UniverseProps} from "../interfaces/UniverseProps";

// FIXME can be removed or moved?
export enum CheckInputType {
    CHECKBOX = 'checkbox',
    RADIO = 'radio'
}

// FIXME can be removed or moved?
export enum CheckInputRole {
    SWITCH = 'switch'
}

// FIXME can be removed or moved?
export enum CustomEventName {
    APPLY_FILTER = 'apply-filter',
    EXPAND_TREE = 'expand-tree'
}

// FIXME can be removed or moved?
export type CustomEventDetails = {
    name: string
    filter: NodesFilter
}

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
    // tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>
}

// FIXME can be removed??????
export type NodeTextPositionOffset = {
    start: number
    end: number
}