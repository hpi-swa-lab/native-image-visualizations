/* eslint-disable @typescript-eslint/no-explicit-any */
// Reason for disable: d3 interfaces often return and expect any types,
// e.g. generic types of 'select'
import * as d3 from 'd3'
import { Multiverse } from '../UniverseTypes/Multiverse'
import { Node } from '../UniverseTypes/Node'
import { Visualization } from './Visualization'
import { Layers } from '../enums/Layers'
import { getNodesOnLevel } from '../Math/filters'
import { HierarchyNode } from 'd3'
import { ColorScheme } from '../SharedTypes/Colors'
import { formatBytes } from '../SharedTypes/Size'
import { TooltipModel } from './TooltipModel'
import { SortingOrder } from '../enums/Sorting'
import { Filter } from '../SharedTypes/Filters'
import { HIERARCHY_NAME_SEPARATOR } from '../globals'
import { toRaw } from 'vue'
import { Universe } from '../UniverseTypes/Universe'

type Group = d3.InternMap<string, d3.InternMap<Node, number>>
type NodeData = [string, d3.InternMap<Node, number>]
type LeafData = [Node, number]
type PackedHierarchyNode = HierarchyNode<NodeData> & d3.PackRadius
type PackedHierarchyLeaf = HierarchyNode<LeafData> & d3.PackRadius

const TRANSITION_DURATION = 500

export class VennSets implements Visualization {
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
        this.applyStyleForChosen(toRaw(this.selection), 'stroke-width', '0', '5', false, true)
    }

    public toggleSelection(event: any, node: Node, selection: Set<string>): void {
        if (selection.has(node.identifier)) {
            selection.delete(node.identifier)
        } else {
            selection.add(node.identifier)
        }
    }

    public setHighlights(highlights: Set<string>): void {
        this.highlights = highlights
        const defaultOpacity = highlights.size == 0 ? 1 : 0.1
        this.applyStyleForChosen(this.highlights, 'opacity', defaultOpacity, 1, true, false)
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
        const transitionDuration =
            this.container.selectAll('circle').size() > 2000 ? 0 : TRANSITION_DURATION

        this.container
            .selectAll('circle')
            .transition()
            .duration(transitionDuration)
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
        this.fitToScreen()

        const nodesOnLevel: Node[] = getNodesOnLevel(this.layer, this.multiverse.root)
            .filter((nodeOnLevel) => Filter.applyAll(this.filters, nodeOnLevel))
            .filter((node) => node.codeSize > 0)
        const root = this.asCombinationPartitionedHierarchy(nodesOnLevel)
        if (!root.children) return

        this.circlePack(root)
        this.drawCircles(root)
        this.drawLabels(root)
        this.visualizeUserSelections()
    }

    private fitToScreen() {
        const targetWidth = window.innerWidth
        const targetHeight = window.innerHeight

        if (this.containerWidth() != targetWidth || this.containerHeight() != targetHeight) {
            this.container.attr('width', targetWidth).attr('height', targetHeight)
        }
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
            .attr('stroke', 'black')
            .attr('fill', (leaf: PackedHierarchyLeaf) =>
                this.colorsByName.get((leaf.parent as unknown as PackedHierarchyNode).data[0])
            )
            .on('mouseenter', (_event: any, data: PackedHierarchyLeaf) => {
                this.tooltip.display()
                this.tooltip.updateContent(this.asHTML(data))
            })
            .on('mousemove', (event: any) => this.tooltip.updatePosition(event.pageX, event.pageY))
            .on('mouseout', () => this.tooltip.hide())
            .on('click', (event: any, data: PackedHierarchyLeaf) => {
                this.toggleSelection(event, data.data[0], this.selection)
            })
    }

    private drawLabels(root: HierarchyNode<Group>) {
        this.container
            .select('.nodes')
            .selectAll('text')
            .data(root.children)
            .join('svg:text')
            .text((node: PackedHierarchyNode) => node.data[0] + ' ' + formatBytes(node.value ?? 0))
            .attr('class', 'label')
            .attr('x', (node: PackedHierarchyNode) => node.x)
            .attr('y', (node: PackedHierarchyNode) => (node.y ?? 0) - node.r)
            .attr('pointer-events', 'none')
            .attr('text-anchor', 'middle')
    }

    private circlePack(root: HierarchyNode<Group>): void {
        d3.pack().size([this.containerWidth(), this.containerHeight()]).padding(10)(root)
    }

    private asHTML(leaf: PackedHierarchyLeaf): string {
        const node = leaf.data[0]
        const parent = leaf.parent as unknown as PackedHierarchyNode
        return `<b>Exclusive in</b>: ${parent.data[0]}
                <b>Name</b>: ${node.name}
                <b>Path</b>: ${this.pathToNode(node)}
                <b>Code Size</b>: ${formatBytes(node.codeSize)}`
    }

    private pathToNode(node: Node): string {
        if (this.layer <= Layers.MODULES) return HIERARCHY_NAME_SEPARATOR
        return node.identifier.substring(0, node.identifier.lastIndexOf(HIERARCHY_NAME_SEPARATOR))
    }

    private asCombinationPartitionedHierarchy(nodes: Node[]): HierarchyNode<Group> {
        const indicesToNames = (node: Node) =>
            [...node.sources.keys()].map((index) => this.multiverse.sources[index].name).join(' ∩ ')

        const groups = d3.rollup(
            nodes,
            (group: Node[]) => d3.sum(group, (node: Node) => node.codeSize),
            indicesToNames,
            (node: Node) => node
        )

        let usedColors = 0
        this.colorsByName = new Map(
            [...groups.entries()]
                .map((group: Array<unknown>) => group[0] as string)
                .sort()
                .map((group: string) => {
                    const universe = this.multiverse.sources.find(
                        (universe: Universe) => universe.name === group
                    )

                    let color = ''
                    if (universe) {
                        color = universe.color
                    } else {
                        color = this.colorScheme[usedColors % this.colorScheme.length]
                        usedColors += 1
                    }

                    return [group, color]
                })
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
            .scaleExtent([0.5, 10])
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
        selected: unknown,
        enableTransition: boolean,
        checkSegments: boolean
    ) {
        const circles = this.container.selectAll('circle')

        circles.style(style, unselected)

        if (selection.size === 0) return

        const isMarked = checkSegments
            ? Filter.fromSelection(selection)
            : new Filter('', () => true)

        circles
            .filter(
                (circle: PackedHierarchyLeaf) =>
                    selection.has(circle.data[0].identifier) ||
                    (checkSegments && isMarked.validate(circle.data[0]))
            )
            .transition()
            .duration(enableTransition ? TRANSITION_DURATION : 0)
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
