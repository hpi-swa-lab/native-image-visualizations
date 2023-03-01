/* eslint-disable @typescript-eslint/no-explicit-any */
// Reason for disable: d3 interfaces often return and expect any types, e.g. 'select'
import * as d3 from 'd3'
import { Multiverse } from '../UniverseTypes/Multiverse'
import { Node } from '../UniverseTypes/Node'
import { MultiverseVisualization } from './MultiverseVisualization'
import { Layers } from '../enums/Layers'
import { getNodesOnLevel } from '../Math/filters'
import { HierarchyNode } from 'd3'

type Group = d3.InternMap<string, d3.InternMap<Node, number>>
type NodeData = [string, d3.InternMap<Node, number>]
type LeafData = [Node, number]
type PackedHierarchyNode = HierarchyNode<NodeData> & d3.PackRadius
type PackedHierarchyLeaf = HierarchyNode<LeafData> & d3.PackRadius

const COLORS = [
    // todo this should be a variable
    '#4e79a7',
    '#e15759',
    '#76b7b2',
    '#59a14f',
    '#edc949',
    '#f28e2c',
    '#af7aa1',
    '#ff9da7',
    '#9c755f',
    '#bab0ab'
] // tableau 10

const TRANSITION_DURATION = 500

export class VennSets implements MultiverseVisualization {
    selection: Node[] = []
    highlights: Node[] = []
    private multiverse: Multiverse = new Multiverse([])
    private layer = Layers.PACKAGES
    private container: any

    constructor(containerSelector: string, layer: Layers) {
        this.layer = layer

        this.initializeContainer(containerSelector)
        this.initializeZoom()
    }

    public setMultiverse(multiverse: Multiverse): void {
        this.multiverse = multiverse
        this.redraw()
    }

    public setSelection(selection: Node[]): void {
        this.selection = selection
        this.applyStyleForChosen(this.selection, 'display', 'none', 'block')
    }

    public setHighlights(highlights: Node[]): void {
        this.highlights = highlights
        this.applyStyleForChosen(this.highlights, 'opacity', 0.4, 1)
    }

    public setLayer(layer: Layers): void {
        this.layer = layer
        this.redraw()
    }

    private redraw() {
        this.cleanContainer()

        const nodesOnLevel: Node[] = getNodesOnLevel(this.layer, this.multiverse.root)
        const root = this.asCombinationPartitionedHierarchy(nodesOnLevel)

        if (!root.children) return

        this.circlePack(root)
        this.drawCircles(root)
        this.drawLabels(root)
        this.visualizeUserSelections()
    }

    private drawCircles(root: HierarchyNode<Group>) {
        const colorsByName: Map<string, string> = new Map(
            root.children?.map((node: HierarchyNode<Group>, index: number) => [
                (node as unknown as HierarchyNode<NodeData>).data[0],
                COLORS[index]
            ])
        )

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
                colorsByName.get((leaf.parent as unknown as PackedHierarchyNode).data[0])
            )
            .on('mouseover', this.drawTooltipFor.bind(this))
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

    private drawTooltipFor(_event: Event, leaf: PackedHierarchyLeaf) {
        console.log(this.asString(leaf))
    }

    private circlePack(root: HierarchyNode<Group>): void {
        d3.pack().size([this.containerWidth(), this.containerHeight()]).padding(3)(root)
    }

    private asString(leaf: PackedHierarchyLeaf): string {
        const node = leaf.data[0]
        const parent = leaf.parent as unknown as PackedHierarchyNode
        return `Exclusive in: ${parent.data[0]}
                Name: ${node.name}
                Code Size: ${node.codeSize.toFixed(2)} Byte`
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

        return d3.hierarchy(groups).sum((node: Group) => (node as unknown as LeafData)[1])
        // .sort((a, b) => a.value - b.value) // this should be an option todo
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
            .scaleExtent([0.5, 4])
            .on('zoom', ({ transform }) => this.container.select('g').attr('transform', transform))
        this.container.call(zoom)
    }

    private visualizeUserSelections() {
        this.setSelection(this.selection)
        this.setHighlights(this.highlights)
    }

    private applyStyleForChosen(
        selection: Node[],
        style: string,
        unselected: unknown,
        selected: unknown
    ) {
        const circles = this.container.selectAll('circle')

        if (selection.length === 0) return

        circles.style(style, unselected)
        selection.forEach((selectedNode: Node) =>
            this.container
                .select(`circle[id='${selectedNode.name}']`)
                .transition()
                .duration(TRANSITION_DURATION)
                .style(style, selected)
        )
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
