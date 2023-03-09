/* eslint-disable @typescript-eslint/no-explicit-any */
// Reason for disable: d3 interfaces often return and expect any types,
// e.g. generic types of 'select'
import * as d3 from 'd3'
import { Multiverse } from '../UniverseTypes/Multiverse'
import { Node } from '../UniverseTypes/Node'
import { MultiverseVisualization } from './MultiverseVisualization'
import { Layers } from '../enums/Layers'
import { getNodesOnLevel } from '../Math/filters'
import { HierarchyNode } from 'd3'
import { ColorScheme } from '../SharedTypes/Colors'
import { formatBytes } from '../SharedTypes/Size'
import { TooltipModel } from './TooltipModel'
import { SortingOrder } from '../enums/Sorting'
import { Filter } from '../SharedTypes/Filters'

type Group = d3.InternMap<string, d3.InternMap<Node, number>>
type NodeData = [string, d3.InternMap<Node, number>]
type LeafData = [Node, number]
type PackedHierarchyNode = HierarchyNode<NodeData> & d3.PackRadius
type PackedHierarchyLeaf = HierarchyNode<LeafData> & d3.PackRadius

const TRANSITION_DURATION = 500

export class VennSets implements MultiverseVisualization {
    colorScheme: ColorScheme = []
    selection: Set<string> = new Set<string>()
    highlights: Set<string> = new Set<string>()
    filters: Filter[] = []

    private multiverse: Multiverse = new Multiverse([])
    private layer = Layers.PACKAGES
    private nodeHierarchy: HierarchyNode<Group> = d3.hierarchy([] as unknown as Group)
    private colorsByName: Map<string, string> = new Map()

    private container: any
    private tooltip: TooltipModel
    private sortingOrder: SortingOrder = SortingOrder.NONE

    constructor(
        containerSelector: string,
        layer: Layers,
        colorScheme: ColorScheme,
        tooltip: TooltipModel,
        sortingOrder: SortingOrder,
        highlights: Set<string>,
        selection: Set<string>,
        filters: Filter[]
    ) {
        this.layer = layer
        this.colorScheme = colorScheme
        this.tooltip = tooltip
        this.sortingOrder = sortingOrder
        this.filters = filters
        this.highlights = highlights
        this.selection = selection

        this.initializeContainer(containerSelector)
        this.initializeZoom()
    }

    public setMultiverse(multiverse: Multiverse): void {
        this.multiverse = multiverse
        this.redraw()
    }

    public setSelection(selection: Set<string>): void {
        this.selection = selection
        // todo
        if (selection.size === 0) return
        this.applyStyleForChosen(this.selection, 'display', 'none', 'block')
    }

    public setHighlights(highlights: Set<string>): void {
        this.highlights = highlights
        const defaultOpacity = highlights.size == 0 ? 1 : 0.1
        this.applyStyleForChosen(this.highlights, 'opacity', defaultOpacity, 1)
    }

    public setFilters(filters: Filter[]): void {
        this.filters = filters
        this.redraw()
    }

    public setLayer(layer: Layers): void {
        this.layer = layer
        this.redraw()
    }

    public sort(sortingOrder: SortingOrder) {
        this.sortingOrder = sortingOrder
        this.nodeHierarchy.sort(this.comparatorBySortingOrder(sortingOrder))
        this.circlePack(this.nodeHierarchy)

        this.container
            .selectAll('circle')
            .transition()
            .duration(TRANSITION_DURATION)
            .ease(d3.easeCircleInOut)
            .attr('cx', (leaf: PackedHierarchyLeaf) => leaf.x)
            .attr('cy', (leaf: PackedHierarchyLeaf) => leaf.y)

        this.container
            .selectAll('.label')
            .attr('x', (node: PackedHierarchyNode) => node.x)
            .attr('y', (node: PackedHierarchyNode) => (node.y ?? 0) - node.r)
    }

    private redraw() {
        this.cleanContainer()

        const nodesOnLevel: Node[] = getNodesOnLevel(this.layer, this.multiverse.root).filter(
            (nodeOnLevel) => Filter.applyAll(this.filters, nodeOnLevel)
        )
        const root = this.asCombinationPartitionedHierarchy(nodesOnLevel)
        if (!root.children) return

        this.circlePack(root)
        this.drawCircles(root)
        this.drawLabels(root)
        this.visualizeUserSelections()
    }

    private drawCircles(root: HierarchyNode<Group>) {
        this.container
            .append('g')
            .attr('class', 'nodes')
            .selectAll('circle')
            .data(root.leaves())
            .join('svg:circle')
            .attr('class', 'leaf node')
            .attr('id', (leaf: PackedHierarchyLeaf) => leaf.data[0].name)
            .attr('cx', (leaf: PackedHierarchyLeaf) => leaf.x)
            .attr('cy', (leaf: PackedHierarchyLeaf) => leaf.y)
            .attr('r', (leaf: PackedHierarchyLeaf) => leaf.r)
            .attr('fill', (leaf: PackedHierarchyLeaf) =>
                this.colorsByName.get((leaf.parent as unknown as PackedHierarchyNode).data[0])
            )
            .on('mouseenter', (_event: any, data: PackedHierarchyLeaf) => {
                this.tooltip.display()
                this.tooltip.updateContent(this.asHTML(data))
            })
            .on('mousemove', (event: any) => this.tooltip.updatePosition(event.pageX, event.pageY))
            .on('mouseout', () => this.tooltip.hide())
    }

    private drawLabels(root: HierarchyNode<Group>) {
        this.container
            .select('.nodes')
            .selectAll('text')
            .data(root.children)
            .join('svg:text')
            .text((node: PackedHierarchyNode) => node.data[0])
            .attr('class', 'label')
            .attr('x', (node: PackedHierarchyNode) => node.x)
            .attr('y', (node: PackedHierarchyNode) => (node.y ?? 0) - node.r)
            .attr('pointer-events', 'none')
            .attr('text-anchor', 'middle')
    }

    private circlePack(root: HierarchyNode<Group>): void {
        d3.pack().size([this.containerWidth(), this.containerHeight()]).padding(5)(root)
    }

    private asHTML(leaf: PackedHierarchyLeaf): string {
        const node = leaf.data[0]
        const parent = leaf.parent as unknown as PackedHierarchyNode
        return `<b>Exclusive in</b>: ${parent.data[0]}
                <b>Name</b>: ${node.name}
                <b>Code Size</b>: ${formatBytes(node.codeSize)}`
    }

    private asCombinationPartitionedHierarchy(nodes: Node[]): HierarchyNode<Group> {
        const indicesToNames = (node: Node) =>
            [...node.sources.keys()]
                .map((index) => this.multiverse.sources[index].name)
                .join(' intersecting ')

        const groups = d3.rollup(
            nodes,
            (group: Node[]) => d3.sum(group, (node: Node) => node.codeSize),
            indicesToNames,
            (node: Node) => node
        )

        this.colorsByName = new Map(
            [...groups.entries()]
                .map((group: Array<unknown>) => group[0] as string)
                .sort()
                .map((group: string, index: number) => [group, this.colorScheme[index]])
        )

        this.nodeHierarchy = d3
            .hierarchy(groups)
            .sum((node: Group) => (node as unknown as LeafData)[1])
            .sort(this.comparatorBySortingOrder(this.sortingOrder))

        return this.nodeHierarchy
    }

    private comparatorBySortingOrder(sortingOrder: SortingOrder) {
        switch (sortingOrder) {
            case SortingOrder.ASCENDING:
                return (a: any, b: any) => a.value - b.value
            case SortingOrder.DESCENDING:
                return (a: any, b: any) => b.value - a.value
            default:
                // Reason for disable: Neutral comparator always returns 0
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                return (_a: any, _b: any) => 0
        }
    }

    private initializeContainer(containerSelector: string) {
        const bounds = (d3.select(containerSelector) as any).node().getBoundingClientRect() ?? {
            width: 1280,
            height: 720
        }

        this.container = d3
            .select(containerSelector)
            .append('svg:svg')
            .attr('width', bounds.width)
            .attr('height', bounds.height)
    }

    private initializeZoom() {
        const zoom = d3
            .zoom()
            .scaleExtent([0.5, 6])
            .on('zoom', ({ transform }) => this.container.select('g').attr('transform', transform))
        this.container.call(zoom)
    }

    private visualizeUserSelections() {
        this.setSelection(this.selection)
        this.setHighlights(this.highlights)
    }

    private applyStyleForChosen(
        selection: Set<string>,
        style: string,
        unselected: unknown,
        selected: unknown
    ) {
        const circles = this.container.selectAll('circle')

        circles.style(style, unselected)

        if (selection.size === 0) return

        circles
            .filter((circle: PackedHierarchyLeaf) => selection.has(circle.data[0].identifier))
            .transition()
            .duration(TRANSITION_DURATION)
            .style(style, selected)
    }

    private cleanContainer() {
        this.container.selectAll('*').remove()
    }

    private containerWidth(): number {
        return this.container.node().getBoundingClientRect().width
    }

    private containerHeight(): number {
        return this.container.node().getBoundingClientRect().height
    }
}
