import * as d3 from 'd3'
import {
    hierarchy,
    HierarchyPointNode,
    Transition,
    HierarchyPointLink,
    BaseType,
    Selection,
    Link
} from 'd3'
import { Node } from '../UniverseTypes/Node'
import { MultiverseVisualization } from './MultiverseVisualization'
import { ColorScheme } from '../SharedTypes/Colors'
import { Multiverse } from '../UniverseTypes/Multiverse'
import { Layers } from '../enums/Layers'
import { NodesFilter } from '../SharedTypes/NodesFilter'
import {
    ContainerSelections,
    CustomEventName,
    NodeTextPositionOffset, SankeyHierarchyPointNode,
    Tree,
    UniverseMetadata
} from '../SharedTypes/SankeyTree'
import { getNodesOnLevel } from '../Math/filters'
import { Bytes, inMB } from '../SharedTypes/Size'
import {
    asHTML,
    createApplyFilterEvent,
    filterDiffingUniverses, getWithoutRoot,
    sortPrivateChildren,
    toggleChildren
} from './utils/SankeyTreeUtils'
import { TooltipModel } from './TooltipModel'
import {useSankeyStore} from '../stores/sankeyTreeStore';

export const UNMODIFIED = 'UNMODIFIED'

// constants
const d3NodeHeight = 20
let d3NodeWidth = 0

const TRANSITION_DURATION = 500

export class SankeyTree implements MultiverseVisualization {
    colorScheme: ColorScheme = []
    selection: Set<string> = new Set<string>()
    highlights: Set<string> = new Set<string>()
    private multiverse: Multiverse = new Multiverse([])
    private metadata: UniverseMetadata = {}
    private layer = Layers.PACKAGES
    private tooltip: TooltipModel

    private readonly containerSelections: ContainerSelections
    private tree: Tree = {
        layout: d3.tree(),
        root: hierarchy(new Node('empty tree', [])) as SankeyHierarchyPointNode,
        leaves: [],
        rootNode: new Node('empty tree', [])
    }

    private modifiedNodes: Node[] = []
    private filteredNodes: Node[] = []

    private sankeyStore = useSankeyStore()

    constructor(
        containerSelector: string,
        layer: Layers,
        colorScheme: ColorScheme,
        tooltip: TooltipModel
    ) {
        this.colorScheme = colorScheme
        this.tooltip = tooltip
        this.containerSelections = this.initializeContainerSelections(containerSelector)
    }

    setMetadata(metadata: UniverseMetadata): void {
        this.metadata = metadata
    }
    setMultiverse(multiverse: Multiverse): void {
        // todo show loading screen while computing everything
        if (multiverse.sources.length < 3) {
            this.multiverse = multiverse
            this.rebuildAndDrawTree(multiverse, this.layer)
        }
    }

    setHighlights(highlights: Set<string>): void {
        this.highlights = highlights
        this.applyStyleForChosen(highlights, 'opacity', 0.4, 1)
    }

    setSelection(selection: Set<string>): void {
        this.selection = selection
        this.applyStyleForChosen(this.selection, 'display', 'none', 'block')
    }

    handleNodesFilterChanged(): void {
        this.filterNodesFromLeaves(this.tree.leaves, this.sankeyStore.nodesFilter)
        this.redrawTree(
            createApplyFilterEvent(this.sankeyStore.nodesFilter),
            this.tree.root,
            this.tree ?? ({} as Tree),
            this.containerSelections,
            this.metadata
        )
    }

    public setLayer(layer: Layers): void {
        this.layer = layer
        this.rebuildAndDrawTree(this.multiverse, layer)
    }

    private initializeContainerSelections(containerSelector: string): ContainerSelections {
        const bounds = (d3.select(containerSelector) as any).node().getBoundingClientRect() ?? {
            width: 1280,
            height: 720
        }

        d3NodeWidth = bounds.width / 5

        const svg = d3
            .select(containerSelector)
            .append('svg')
            .attr('width', bounds.width)
            .attr('height', bounds.height)

        const zoomG = svg
            .append('g')
            .attr('id', 'zoomG')
            .attr('width', bounds.width)
            .attr('height', bounds.height)

        const zoom = d3
            .zoom()
            .on('zoom', ({ transform }) => zoomG.attr('transform', transform))
        const transform = d3.zoomIdentity
            .translate(bounds.width * 1/5,bounds.height * 0.5)
            .scale(0.5)

        // @ts-ignore because of typing error
        svg.call(zoom.transform, transform)
        // call(zoom) again to make it panable & zoomable
        // @ts-ignore because of typing error
        svg.call(zoom)

        return {
            svg: svg,
            zoomG: zoomG,
            gLink: zoomG
                .append('g')
                .attr('fill', 'none')
                .attr('stroke', '#555')
                .attr('stroke-opacity', 0.4)
                .attr('stroke-width', 1.5),
            gNode: zoomG.append('g').attr('cursor', 'pointer').attr('pointer-events', 'all')
        }
    }

    // #############################################################################################
    // ### BUILD TREE HELPER FUNCTIONS #############################################################
    // #############################################################################################
    private rebuildAndDrawTree(multiverse: Multiverse, layer: Layers) {
        this.tree = this.buildTree(multiverse, layer)

        // @ts-ignore expects HierarchyPointNode<T> but it's actually SankeyHierarchyPointNode
        this.tree.root.descendants().forEach((d: SankeyHierarchyPointNode, i: number) => {
            d.id = i.toString()
            d._children = d.children
            // FIXME ? only expand first level of children
            if (d.depth > 0) d.children = undefined; // only expand the first level of children
        })

        // clear the selections, to redraw the change in color and nodeSize of a node
        this.containerSelections.gNode.selectAll('g > *').remove()
        this.containerSelections.gLink.selectAll('g > *').remove()

        this.redrawTree(
            createApplyFilterEvent(this.sankeyStore.nodesFilter),
            this.tree.root,
            this.tree ?? ({} as Tree),
            this.containerSelections,
            this.metadata
        )
    }

    private buildTree(multiverse: Multiverse, layer: Layers): Tree {
        this.modifiedNodes = []
        this.filteredNodes = []

        const nodeTree: Node = new Node('root', [])

        const leaves: Set<Node> = new Set()

        for (let i = Layers.MODULES.valueOf(); i <= layer.valueOf(); i++) {
            const nodes: Node[] = getNodesOnLevel(i, multiverse.root)
            nodes.forEach((node, i) => {
                this.createHierarchyFromPackages(node, nodeTree, leaves)
            })
        }

        nodeTree.codeSize = nodeTree.children.reduce(
            (sum: number, child: Node) => sum + child.codeSize,
            0
        )

        const tree: Tree = {
            layout: d3
                .tree()
                .nodeSize([d3NodeHeight, d3NodeWidth])
                .separation((a, b) => this.getNodeSeparation(a, b)),
            root: hierarchy(nodeTree) as HierarchyPointNode<Node>,
            leaves: Array.from(leaves),
            rootNode: nodeTree
        }
        this.markNodesModifiedFromLeaves(tree.leaves)
        this.filterNodesFromLeaves(tree.leaves, this.sankeyStore.nodesFilter)

        return tree
    }

    private createHierarchyFromPackages(node: Node, dataTree: Node, leaves: Set<Node>) {
        let current = dataTree
        const pathSegments = node.identifier.substring(1).split('.')
        for (let i = 0; i < pathSegments.length; i++) {
            let child = current.children.find((child) => child.name === pathSegments[i])
            if (child) {
                child.sources.set(
                    node.sources.keys().next().value,
                    node.sources.values().next().value
                )
                child.codeSize = child.codeSize + node.codeSize

                // FIXME set correct codeSize in child
                //  (right now only node A's codesize is stored in the merged node)
            } else {
                child = new Node(pathSegments[i], [], current, node.codeSize)
                child.sources = node.sources
                current.children.push(child)
            }

            current = child
            if (i === pathSegments.length - 1) leaves.add(child)
        }
    }

    private markNodesModifiedFromLeaves(leaves: Node[]) {
        for (const leave of leaves) {
            if (leave.sources.size !== 1) continue
            this.markNodeModified(leave)
        }
    }
    private markNodeModified(node: Node) {
        if (this.modifiedNodes.includes(node)) return
        this.modifiedNodes.push(node)
        if (node.parent !== undefined) this.markNodeModified(node.parent)
    }

    private filterNodesFromLeaves(leaves: Node[], filter: NodesFilter) {
        this.filteredNodes = []

        for (const leave of leaves) {
            if (leave.sources.size < 1) continue
            if (filter.diffing.showUnmodified) {
                if (
                    !this.modifiedNodes.includes(leave) ||
                    Array.from(leave.sources).every(([universeId]) =>
                        this.sankeyStore.isUniverseFiltered(universeId)
                    )
                ) {
                    this.markNodeFiltered(leave)
                }
            } else if (
                this.modifiedNodes.includes(leave) &&
                Array.from(leave.sources).every(([universeId]) =>
                    this.sankeyStore.isUniverseFiltered(universeId)
                )
            ) {
                this.markNodeFiltered(leave)
            }
        }
    }
    private markNodeFiltered(node: Node) {
        if (this.filteredNodes.includes(node)) return
        this.filteredNodes.push(node)
        if (node.parent !== undefined) this.markNodeFiltered(node.parent)
    }

    private redrawTree(
        event: any | null,
        sourceNode: SankeyHierarchyPointNode,
        tree: Tree,
        containerSelections: ContainerSelections,
        universeMetadata: UniverseMetadata
    ) {
        let duration = 0

        if (event) {
            if (Object.values(CustomEventName).includes(event.type)) {
                this.handleCustomTreeEvent(event, tree)
            } else {
                // if you press alt / option key, then the collapse/extend animation is much slower
                duration = event && event.altKey ? 2500 : 250
            }
        }

        // Compute the new treeLayout layout.
        tree.layout(tree.root)

        const nodes = tree.root.descendants().reverse()
        const links = tree.root
            .links()
            .filter((link: HierarchyPointLink<Node>) =>
                this.filteredNodes.includes(link.target.data))

        // Stash the old positions for transition

        // @ts-ignore expects HierarchyPointNode<T> but it's actually SankeyHierarchyPointNode
        tree.root.eachBefore((d: SankeyHierarchyPointNode) => {
            d.x0 = d.x
            d.y0 = d.y
        })

        const transition = containerSelections.zoomG
            .transition()
            .duration(duration)
            .tween(
                'resize',
                window.ResizeObserver
                    ? null
                    : () => () => containerSelections.zoomG.dispatch('toggle')
            )

        const node = containerSelections.gNode.selectAll('g').data(nodes, (d: any) => d.id)

        const nodeEnter = this.enterNode(node, sourceNode,
            (evt: MouseEvent, d: SankeyHierarchyPointNode) => {
            toggleChildren(d, evt.shiftKey, this.filteredNodes)
            this.redrawTree(evt, d, tree, containerSelections, universeMetadata)
        })
        const nodeEnterShape = this.appendShapeToNode(nodeEnter, universeMetadata)
        nodeEnterShape
            .on('mouseover', (event: MouseEvent, d: SankeyHierarchyPointNode) => {
                this.tooltip.updateContent(asHTML(d, this.metadata))
                this.tooltip.display()
            })
            .on('mousemove', (event: MouseEvent, _d: SankeyHierarchyPointNode) =>
                this.tooltip.updatePosition(event.pageX, event.pageY)
            )
            .on('mouseout', (_event: MouseEvent, _d: SankeyHierarchyPointNode) => this.tooltip.hide())

        this.appendTextToNode(nodeEnter)

        this.updateNode(node, nodeEnter, transition)

        this.exitNode(node, sourceNode, transition)

        const linkGenerator = d3
            .linkHorizontal<HierarchyPointLink<Node>, SankeyHierarchyPointNode>()
            .x((d: SankeyHierarchyPointNode) => d.y)
            .y((d: SankeyHierarchyPointNode) => d.x)

        const link = containerSelections.gLink
            .selectAll('path')
            .data(links, (d: any) => d.target.id)

        const linkEnter = this.enterLink(link, linkGenerator, sourceNode)

        this.updateLink(link, linkEnter, transition, linkGenerator)

        this.exitLink(link, linkGenerator, sourceNode, transition)
    }

    // #############################################################################################
    // ##### VISUALIZATION UTILS ###################################################################
    // #############################################################################################

    private enterNode(
        node: Selection<BaseType, any, SVGGElement, unknown>,
        sourceNode: SankeyHierarchyPointNode,
        onClickCallback: (evt: MouseEvent, d: SankeyHierarchyPointNode) => void
    ) {
        // Enter any new nodes at the parent's previous position.
        return node
            .enter()
            .append('g')
            .attr('transform', () => `translate(${sourceNode.y0 ?? 0},${sourceNode.x0 ?? 0})`)
            .attr('fill-opacity', 0)
            .attr('stroke-opacity', 0)
            .on('click', (evt: MouseEvent, d: SankeyHierarchyPointNode) => {
                onClickCallback(evt, d)
            })
    }

    private appendShapeToNode(
        nodeEnter: Selection<SVGGElement, SankeyHierarchyPointNode, SVGGElement, unknown>,
        universeMetadata: UniverseMetadata
    ) {
        const minSize = 20
        const getBarHeight = (b: Bytes) => {
            // const res = Math.max(minSize, (inMB(b) * minSize));
            const res = minSize + inMB(b) * minSize
            return res
        }

        return nodeEnter
            .append('rect')
            .attr('width', function () {
                return minSize
            })
            .attr('height', (d: SankeyHierarchyPointNode) => getBarHeight(d.data.codeSize))
            .attr('y', (d: SankeyHierarchyPointNode) => (d.data ? -getBarHeight(d.data.codeSize) / 2 : 0))
            .style('fill', (d: HierarchyPointNode<Node>) => {
                if (d.data.sources.size == 1) {
                    return universeMetadata[Array.from(d.data.sources.keys())[0]]?.color
                } else if (this.modifiedNodes.includes(d.data)) {
                    return this.sankeyStore.colorModified
                } else {
                    return this.sankeyStore.colorUnmodified
                }
            })
    }

    private appendTextToNode(
        nodeEnter: Selection<SVGGElement, SankeyHierarchyPointNode, SVGGElement, unknown>
    ) {
        const positionOffset = this.getNodeTextPositionOffset()
        return nodeEnter
            .append('text')
            .attr('dy', '0.31em')
            .attr('x', (d: SankeyHierarchyPointNode) => (d._children ? positionOffset.start : positionOffset.end))
            .attr('text-anchor', (d: SankeyHierarchyPointNode) => (d._children ? 'end' : 'start'))
            .text((d: SankeyHierarchyPointNode) => d.data.name)
            .clone(true)
            .lower()
            .attr('stroke-linejoin', 'round')
            .attr('stroke-width', 3)
            .attr('stroke', 'white')
    }

    private updateNode(
        node: any,
        nodeEnter: Selection<SVGGElement, SankeyHierarchyPointNode, SVGGElement, unknown>,
        transition: Transition<SVGGElement, unknown, HTMLElement, any>
    ) {
        // Transition nodes to their new position.
        return node
            .merge(nodeEnter)
            .transition(transition)
            .attr('transform', (d: SankeyHierarchyPointNode) => `translate(${d.y},${d.x})`)
            .attr('fill-opacity', 1)
            .attr('stroke-opacity', 1)
    }

    private exitNode(
        node: any,
        sourceNode: SankeyHierarchyPointNode,
        transition: Transition<SVGGElement, unknown, HTMLElement, any>
    ) {
        // Transition exiting nodes to the parent's new position.
        return node
            .exit()
            .transition(transition)
            .remove()
            .attr('transform', () => `translate(${sourceNode.y},${sourceNode.x})`)
            .attr('fill-opacity', 0)
            .attr('stroke-opacity', 0)
    }

    private enterLink(
        link: Selection<BaseType, any, SVGGElement, unknown>,
        linkGenerator: Link<any, HierarchyPointLink<Node>, SankeyHierarchyPointNode>,
        sourceNode: SankeyHierarchyPointNode
    ) {
        // Enter any new links at the parent's previous position.
        return link
            .enter()
            .append('path')
            .attr('d', () => {
                const o = { x: sourceNode.x0, y: sourceNode.y0 }
                return linkGenerator({ source: o, target: o } as any)
            })
            .attr('stroke-width', (d: HierarchyPointLink<Node>) => Math.max(1, inMB(d.target.data.codeSize) * d3NodeHeight))
            .attr('stroke', (d: HierarchyPointLink<Node>) =>
                this.modifiedNodes.includes(d.target.data)
                    ? d.target.data.sources.size === 1
                        ? this.metadata[d.target.data.sources.keys().next().value].color
                        : this.sankeyStore.colorModified
                    : this.sankeyStore.colorUnmodified
            )
    }

    private updateLink(
        link: any,
        linkEnter: Selection<SVGPathElement, HierarchyPointLink<Node>, SVGGElement, unknown>,
        transition: Transition<SVGGElement, unknown, HTMLElement, any>,
        linkGenerator: Link<any, HierarchyPointLink<Node>, SankeyHierarchyPointNode>
    ) {
        // Transition links to their new position.
        return link
            .merge(linkEnter)
            .transition(transition)
            .attr('d', (d: any) => {
                const targetsIndex = d.source.children.indexOf(d.target)
                let sourceX = d.source.children
                    .map((child: SankeyHierarchyPointNode, index: number) => {
                        if (index >= targetsIndex) return 0
                        return child.data ? inMB(child.data.codeSize) * d3NodeHeight : 0
                    })
                    .reduce((a: any, b: any, _c: number) => {
                        return a + b
                    })
                sourceX += d.source.x - (inMB(d.source.data.codeSize) * d3NodeHeight) / 2
                sourceX += (inMB(d.target.data.codeSize) * d3NodeHeight) / 2
                const source = { x: sourceX, y: d.source.y0 }
                return linkGenerator({ source: source, target: d.target } as any)
            })
    }

    private exitLink(
        link: any,
        linkGenerator: Link<any, HierarchyPointLink<Node>, SankeyHierarchyPointNode>,
        sourceNode: SankeyHierarchyPointNode,
        transition: Transition<SVGGElement, unknown, HTMLElement, any>
    ) {
        // Transition exiting nodes to the parent's new position.
        return link
            .exit()
            .transition(transition)
            .remove()
            .attr('d', () => {
                const o = { x: sourceNode.x, y: sourceNode.y }
                return linkGenerator({ source: o, target: o } as any)
            })
    }

    private getNodeSeparation(
        a: any,
        b: any,
    ) {
        const totalHeight = a.data.codeSize + b.data.codeSize
        let separation = inMB(totalHeight)/2
        separation += a.parent === b.parent ? 1.2 : 2

        return Math.max(1, separation)
    }

    private getNodeTextPositionOffset(): NodeTextPositionOffset {
        return {
            start: -6,
            end: 26
        }
    }

    private applyStyleForChosen(
        highlights: Set<string>,
        style: string,
        unselected: unknown,
        selected: unknown
    ) {
        const visNodes = this.containerSelections.gNode.selectAll('g') as any
        visNodes.selectAll('rect').style(style, unselected)

        visNodes
            .filter((node: HierarchyPointNode<Node>) =>
                highlights.has(getWithoutRoot(node.data.identifier)))
            .selectAll('rect').transition()
            .duration(TRANSITION_DURATION)
            .style(style, selected)
    }

    // #############################################################################################
    // ##### HELPER UTILS ##########################################################################
    // #############################################################################################

    private handleCustomTreeEvent(event: any, tree: Tree) {
        if (event.detail.name === CustomEventName.APPLY_FILTER) {
            // @ts-ignore expects HierarchyPointNode<T> but it's actually SankeyHierarchyPointNode
            tree.root.eachBefore((node: SankeyHierarchyPointNode) => {
                if (!node._children) return
                sortPrivateChildren(node, event.detail.filter.sorting)
                if (node.children) node.children = filterDiffingUniverses(node, this.filteredNodes)
            })
        }
    }
}