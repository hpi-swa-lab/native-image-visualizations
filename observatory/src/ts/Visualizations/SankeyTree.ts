/* eslint-disable  @typescript-eslint/no-explicit-any */
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
    NodeTextPositionOffset,
    SankeyHierarchyPointNode,
    SankeyTreeCompound,
    UniverseMetadata
} from '../SharedTypes/SankeyTree'
import { getNodesOnLevel } from '../Math/filters'
import { Bytes, inMB } from '../SharedTypes/Size'
import {
    asHTML,
    newApplyFilterEvent,
    createHierarchyFromPackages,
    filterDiffingUniverses,
    getWithoutRoot,
    sortPrivateChildren,
    toggleChildren
} from './utils/SankeyTreeUtils'
import { TooltipModel } from './TooltipModel'
import { useSankeyStore } from '../stores/sankeyTreeStore'
import { EventType } from '../enums/EventType'
import { Filter } from '../SharedTypes/Filters'

export const UNMODIFIED = 'UNMODIFIED'
export const MAX_OBSERVED_UNIVERSES_FOR_SANKEY_TREE = 2
export const ROOT_NODE_NAME = 'root'

const d3NodeHeight = 20
let d3NodeWidth = 0

const TRANSITION_DURATION = 500

export class SankeyTree implements MultiverseVisualization {
    colorScheme: ColorScheme = []
    selection: Set<string> = new Set<string>()
    highlights: Set<string> = new Set<string>()
    filters: Filter[]
    private multiverse: Multiverse = new Multiverse([])
    private metadata: UniverseMetadata = {}
    private layer = Layers.PACKAGES
    private tooltip: TooltipModel

    private tree: SankeyTreeCompound = {
        layout: d3.tree(),
        root: hierarchy(new Node('empty tree', [])) as SankeyHierarchyPointNode,
        leaves: [],
        rootNode: new Node('empty tree', [])
    }
    private modifiedNodes: Node[] = []
    private filteredNodes: Node[] = []
    private readonly containerSelections: ContainerSelections

    private sankeyStore = useSankeyStore()

    constructor(
        containerSelector: string,
        layer: Layers,
        colorScheme: ColorScheme,
        tooltip: TooltipModel,
        highlights: Set<string>,
        selection: Set<string>,
        filters: Filter[] = []
    ) {
        this.colorScheme = colorScheme
        this.tooltip = tooltip
        this.highlights = highlights
        this.selection = selection
        this.containerSelections = this.initializeContainerSelections(containerSelector)
        this.filters = filters
    }

    setMultiverse(multiverse: Multiverse): void {
        if (multiverse.sources.length > MAX_OBSERVED_UNIVERSES_FOR_SANKEY_TREE) return
        this.multiverse = multiverse
        this.rebuildAndDrawTree(multiverse, this.layer)
    }

    setHighlights(highlights: Set<string>): void {
        this.highlights = highlights
        const defaultOpacity = highlights.size == 0 ? 1 : 0.1
        this.applyStyleForChosen(highlights, 'opacity', defaultOpacity, 1, true)
    }

    public setFilters(filters: Filter[]): void {
        this.filters = filters
        // TODO implement with #167
        //  https://github.com/orgs/hpi-swa-lab/projects/1/views/1?pane=issue&itemId=23021330
    }

    setSelection(selection: Set<string>): void {
        this.selection = selection
        this.applyStyleForChosen(this.selection, 'stroke-width', '0', '5', false)
    }

    public setLayer(layer: Layers): void {
        this.layer = layer
        this.rebuildAndDrawTree(this.multiverse, layer)
    }

    setMetadata(metadata: UniverseMetadata): void {
        this.metadata = metadata
    }

    handleNodesFilterChanged(): void {
        this.filterNodesFromLeaves(this.tree.leaves, this.sankeyStore.nodesFilter)
        this.redraw(
            newApplyFilterEvent(this.sankeyStore.nodesFilter),
            this.tree.root,
            this.tree ?? ({} as SankeyTreeCompound),
            this.containerSelections,
            this.metadata
        )
    }

    // #############################################################################################
    // ### SETUP SVG & SELECTIONS ##################################################################
    // #############################################################################################

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

        const zoomGroup = svg
            .append('g')
            .attr('id', 'zoomG')
            .attr('width', bounds.width)
            .attr('height', bounds.height)

        const zoom = d3.zoom().on('zoom', ({ transform }) => zoomGroup.attr('transform', transform))
        const transform = d3.zoomIdentity
            .translate((bounds.width * 1) / 5, bounds.height * 0.5)
            .scale(0.5)

        svg.call(zoom.transform as any, transform)
        svg.call(zoom as any)

        return {
            svg: svg,
            zoomGroup: zoomGroup,
            linkGroup: zoomGroup
                .append('g')
                .attr('fill', 'none')
                .attr('stroke', '#555')
                .attr('stroke-opacity', 0.4)
                .attr('stroke-width', 1.5),
            nodeGroup: zoomGroup.append('g').attr('cursor', 'pointer').attr('pointer-events', 'all')
        }
    }

    // #############################################################################################
    // ### BUILD TREE HELPER FUNCTIONS #############################################################
    // #############################################################################################
    private rebuildAndDrawTree(multiverse: Multiverse, layer: Layers) {
        this.tree = this.buildTree(multiverse, layer)

        // Reason: expects HierarchyPointNode<T> but it's actually SankeyHierarchyPointNode
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.tree.root.descendants().forEach((vizNode: SankeyHierarchyPointNode, i: number) => {
            vizNode.id = i.toString()
            vizNode._children = vizNode.children
            // only expand the first level of children
            if (vizNode.depth > 0) vizNode.children = undefined
        })

        if (this.tree.root.children) {
            this.expandFistBranchToLeaves(this.tree.root.children[0])
        }

        // clear the selections, to redraw the change in a node's color and nodeSize
        this.containerSelections.nodeGroup.selectAll('g > *').remove()
        this.containerSelections.linkGroup.selectAll('g > *').remove()

        this.redraw(
            newApplyFilterEvent(this.sankeyStore.nodesFilter),
            this.tree.root,
            this.tree ?? ({} as SankeyTreeCompound),
            this.containerSelections,
            this.metadata
        )
    }

    private expandFistBranchToLeaves(vizNode: SankeyHierarchyPointNode) {
        if (!vizNode) return

        toggleChildren(vizNode, false, this.filteredNodes)
        if (!vizNode.children) return
        this.expandFistBranchToLeaves(vizNode.children[0])
    }

    private buildTree(multiverse: Multiverse, layer: Layers): SankeyTreeCompound {
        const nodeTree: Node = new Node(ROOT_NODE_NAME, [])

        const leaves: Set<Node> = new Set()

        // create hierarchy of Node based on selected Layer
        for (let i = Layers.MODULES.valueOf(); i <= layer.valueOf(); i++) {
            const nodes: Node[] = getNodesOnLevel(i, multiverse.root)
            nodes.forEach((node) => {
                createHierarchyFromPackages(node, nodeTree, leaves)
            })
        }

        // set codeSize of root node
        nodeTree.codeSize = nodeTree.children.reduce(
            (sum: number, child: Node) => sum + child.codeSize,
            0
        )

        const tree: SankeyTreeCompound = {
            layout: d3
                .tree()
                .nodeSize([d3NodeHeight, d3NodeWidth])
                .separation((a, b) => this.getNodeSeparation(a, b)),
            root: hierarchy(nodeTree) as SankeyHierarchyPointNode,
            leaves: Array.from(leaves),
            rootNode: nodeTree
        }
        this.markNodesModifiedFromLeaves(tree.leaves)
        this.filterNodesFromLeaves(tree.leaves, this.sankeyStore.nodesFilter)

        return tree
    }

    private markNodesModifiedFromLeaves(leaves: Node[]) {
        this.modifiedNodes = []

        for (const leaf of leaves) {
            if (leaf.sources.size !== 1) continue
            this.markNodeModified(leaf)
        }
    }
    private markNodeModified(node: Node) {
        if (this.modifiedNodes.includes(node)) return
        this.modifiedNodes.push(node)
        if (node.parent !== undefined) this.markNodeModified(node.parent)
    }

    private filterNodesFromLeaves(leaves: Node[], filter: NodesFilter) {
        this.filteredNodes = []

        for (const leaf of leaves) {
            if (leaf.sources.size < 1) continue
            if (filter.diffing.showUnmodified) {
                if (
                    !this.modifiedNodes.includes(leaf) ||
                    Array.from(leaf.sources).every(([universeId]) =>
                        this.sankeyStore.isUniverseFiltered(universeId)
                    )
                ) {
                    this.markNodeFiltered(leaf)
                }
            } else if (
                this.modifiedNodes.includes(leaf) &&
                Array.from(leaf.sources).every(([universeId]) =>
                    this.sankeyStore.isUniverseFiltered(universeId)
                )
            ) {
                this.markNodeFiltered(leaf)
            }
        }
    }
    private markNodeFiltered(node: Node) {
        if (this.filteredNodes.includes(node)) return
        this.filteredNodes.push(node)
        if (node.parent !== undefined) this.markNodeFiltered(node.parent)
    }

    // #############################################################################################
    // ### VISUALIZATION ###########################################################################
    // #############################################################################################

    private redraw(
        event: any | null,
        sourceNode: SankeyHierarchyPointNode,
        tree: SankeyTreeCompound,
        containerSelections: ContainerSelections,
        universeMetadata: UniverseMetadata
    ) {
        const duration = 0

        if (event && Object.values(EventType).includes(event.type)) {
            this.handleCustomEvent(event, tree)
        }

        // Compute the new treeLayout layout.
        tree.layout(tree.root)

        const nodes = tree.root.descendants().reverse()
        const links = tree.root
            .links()
            .filter((link: HierarchyPointLink<Node>) =>
                this.filteredNodes.includes(link.target.data)
            )

        // Stash the old positions for transition
        // Reason: expects HierarchyPointNode<T> but it's actually SankeyHierarchyPointNode
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        tree.root.eachBefore((vizNode: SankeyHierarchyPointNode) => {
            vizNode.x0 = vizNode.x
            vizNode.y0 = vizNode.y
        })

        const transition = containerSelections.zoomGroup
            .transition()
            .duration(duration)
            .tween(
                'resize',
                window.ResizeObserver
                    ? null
                    : () => () => containerSelections.zoomGroup.dispatch('toggle')
            )

        const node = containerSelections.nodeGroup
            .selectAll('g')
            .data(nodes, (vizNode: any) => vizNode.id)

        const nodeEnter = this.enterNode(
            node,
            sourceNode,
            (evt: MouseEvent, vizNode: SankeyHierarchyPointNode) => {
                toggleChildren(vizNode, evt.shiftKey, this.filteredNodes)
                this.redraw(evt, vizNode, tree, containerSelections, universeMetadata)
            }
        )
        const nodeEnterShape = this.appendShapeToNode(nodeEnter, universeMetadata)
        nodeEnterShape
            .on('mouseover', (event: MouseEvent, vizNode: SankeyHierarchyPointNode) => {
                this.tooltip.updateContent(asHTML(vizNode, this.metadata))
                this.tooltip.display()
            })
            .on('mousemove', (event: MouseEvent) =>
                this.tooltip.updatePosition(event.pageX, event.pageY)
            )
            .on('mouseout', () => this.tooltip.hide())

        this.appendTextToNode(nodeEnter)

        this.updateNode(node, nodeEnter, transition)

        this.exitNode(node, sourceNode, transition)

        const linkGenerator = d3
            .linkHorizontal<HierarchyPointLink<Node>, SankeyHierarchyPointNode>()
            .x((vizNode: SankeyHierarchyPointNode) => vizNode.y)
            .y((vizNode: SankeyHierarchyPointNode) => vizNode.x)

        const link = containerSelections.linkGroup
            .selectAll('path')
            .data(links, (vizLink: any) => vizLink.target.id)

        const linkEnter = this.enterLink(link, linkGenerator, sourceNode)

        this.updateLink(link, linkEnter, transition, linkGenerator)

        this.exitLink(link, linkGenerator, sourceNode, transition)

        this.visualizeUserSelections()
    }

    private enterNode(
        node: Selection<BaseType, any, SVGGElement, unknown>,
        sourceNode: SankeyHierarchyPointNode,
        onClickCallback: (evt: MouseEvent, vizNode: SankeyHierarchyPointNode) => void
    ) {
        // Enter any new nodes at the parent's previous position.
        return node
            .enter()
            .append('g')
            .attr('transform', `translate(${sourceNode.y0 ?? 0},${sourceNode.x0 ?? 0})`)
            .attr('fill-opacity', 0)
            .attr('stroke-opacity', 0)
            .on('click', (evt: MouseEvent, vizNode: SankeyHierarchyPointNode) => {
                onClickCallback(evt, vizNode)
            })
    }

    private appendShapeToNode(
        nodeEnter: Selection<SVGGElement, SankeyHierarchyPointNode, SVGGElement, unknown>,
        universeMetadata: UniverseMetadata
    ) {
        const minSize = d3NodeHeight
        const getBarHeight = (b: Bytes) => {
            return minSize + inMB(b) * minSize
        }

        return nodeEnter
            .append('rect')
            .attr('width', minSize)
            .attr('height', (vizNode: SankeyHierarchyPointNode) =>
                getBarHeight(vizNode.data.codeSize)
            )
            .attr('y', (vizNode: SankeyHierarchyPointNode) =>
                vizNode.data ? -getBarHeight(vizNode.data.codeSize) / 2 : 0
            )
            .style('fill', (vizNode: HierarchyPointNode<Node>) => {
                if (vizNode.data.sources.size == 1) {
                    return universeMetadata[Array.from(vizNode.data.sources.keys())[0]]?.color
                } else if (this.modifiedNodes.includes(vizNode.data)) {
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
            .attr('x', (vizNode: SankeyHierarchyPointNode) =>
                vizNode._children ? positionOffset.start : positionOffset.end
            )
            .attr('text-anchor', (vizNode: SankeyHierarchyPointNode) =>
                vizNode._children ? 'end' : 'start'
            )
            .text((vizNode: SankeyHierarchyPointNode) => vizNode.data.name)
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
            .attr(
                'transform',
                (vizNode: SankeyHierarchyPointNode) => `translate(${vizNode.y},${vizNode.x})`
            )
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
            .attr('transform', `translate(${sourceNode.y},${sourceNode.x})`)
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
            .attr('stroke-width', (vizLink: HierarchyPointLink<Node>) =>
                Math.max(1, inMB(vizLink.target.data.codeSize) * d3NodeHeight)
            )
            .attr('stroke', (vizLink: HierarchyPointLink<Node>) =>
                this.modifiedNodes.includes(vizLink.target.data)
                    ? vizLink.target.data.sources.size === 1
                        ? this.metadata[vizLink.target.data.sources.keys().next().value].color
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
            .attr('d', (vizLink: any) => {
                const targetsIndex = vizLink.source.children.indexOf(vizLink.target)
                let sourceX = vizLink.source.children
                    .map((child: SankeyHierarchyPointNode, index: number) => {
                        if (index >= targetsIndex) return 0
                        return child.data ? inMB(child.data.codeSize) * d3NodeHeight : 0
                    })
                    .reduce((a: any, b: any) => {
                        return a + b
                    })
                sourceX +=
                    vizLink.source.x - (inMB(vizLink.source.data.codeSize) * d3NodeHeight) / 2
                sourceX += (inMB(vizLink.target.data.codeSize) * d3NodeHeight) / 2
                const source = { x: sourceX, y: vizLink.source.y0 }
                return linkGenerator({ source: source, target: vizLink.target } as any)
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

    private getNodeTextPositionOffset(): NodeTextPositionOffset {
        return {
            start: -6,
            end: 26
        }
    }

    private getNodeSeparation(a: any, b: any) {
        const totalHeight = a.data.codeSize + b.data.codeSize
        let separation = inMB(totalHeight) / 2
        separation += a.parent === b.parent ? 1.2 : 2

        return Math.max(1, separation)
    }

    private applyStyleForChosen(
        selection: Set<string>,
        style: string,
        unselected: unknown,
        selected: unknown,
        enableTransition: boolean
    ) {
        const visNodes = this.containerSelections.nodeGroup.selectAll('g') as any
        visNodes.selectAll('rect').style(style, unselected)

        visNodes
            .filter((node: HierarchyPointNode<Node>) =>
                selection.has(getWithoutRoot(node.data.identifier))
            )
            .selectAll('rect')
            .transition()
            .duration(enableTransition ? TRANSITION_DURATION : 0)
            .style(style, selected)
    }

    private visualizeUserSelections() {
        this.setSelection(this.selection)
        this.setHighlights(this.highlights)
    }

    // #############################################################################################
    // ##### EVENT UTILS - not extractable #########################################################
    // #############################################################################################

    private handleCustomEvent(event: any, tree: SankeyTreeCompound) {
        if (event.detail.name === EventType.APPLY_FILTER) {
            // Reason: expects HierarchyPointNode<T> but it's actually SankeyHierarchyPointNode
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            tree.root.eachBefore((node: SankeyHierarchyPointNode) => {
                if (!node._children) return
                sortPrivateChildren(node, event.detail.filter.sorting)
                if (node.children) node.children = filterDiffingUniverses(node, this.filteredNodes)
            })
        }
    }
}
