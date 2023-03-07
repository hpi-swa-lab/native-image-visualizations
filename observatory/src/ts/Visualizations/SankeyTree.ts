import * as d3 from 'd3'
import {filter, hierarchy, HierarchyNode, HierarchyPointNode, Selection, Transition, TreeLayout} from 'd3'
import { Node } from '../UniverseTypes/Node'
import { MultiverseVisualization } from './MultiverseVisualization'
import { ColorScheme } from '../SharedTypes/Colors'
import { Multiverse } from '../UniverseTypes/Multiverse'
import { Layers } from '../enums/Layers'
import { sankeyTreeConfigStore } from '../stores'
import { NodesFilter } from '../SharedTypes/NodesFilter'
import {
    ContainerSelections,
    CustomEventName,
    NodeTextPositionOffset,
    Tree,
    UniverseMetadata
} from '../SharedTypes/SankeyTree'
import { getNodesOnLevel } from '../Math/filters'
import { Bytes, inMB } from '../SharedTypes/Size'
import {
    asHTML,
    createApplyFilterEvent,
    filterDiffingUniverses, getWithoutRoot,
    sortChildren,
    toggleChildren
} from './utils/SankeyTreeUtils'
import { TooltipModel } from './TooltipModel'

export const UNMODIFIED = 'UNMODIFIED'

// constants
const dx = 20
let dy = 0

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
        root: hierarchy(new Node('empty tree', [])) as HierarchyPointNode<Node>,
        leaves: [],
        rootNode: new Node('empty tree', [])
    }

    private modifiedNodes: Node[] = []
    private filteredNodes: Node[] = []

    private sankeyStore = sankeyTreeConfigStore()

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
        // todo
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
        // TODO is it correct?
        this.layer = layer
        this.rebuildAndDrawTree(this.multiverse, layer)
    }

    private initializeContainerSelections(containerSelector: string): ContainerSelections {
        const bounds = (d3.select(containerSelector) as any).node().getBoundingClientRect() ?? {
            width: 1280,
            height: 720
        }

        dy = bounds.width / 5

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
        // .attr('transform', `translate(${MARGIN.left}, ${innerHeight * 0.5})`)

        const zoom = d3
            .zoom()
            // .scaleExtent([0.5, 4])
            .on('zoom', ({ transform }) => zoomG.attr('transform', transform))
        // @ts-ignore
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

        this.tree.root.descendants().forEach((d: any, i: number) => {
            d.id = i
            d._children = d.children
            // FIXME ? only expand first level of children
            // if (d.depth > 0) d.children = null; // only expand the first level of children
        })

        // clear the selections, because otherwise d3 does not draw the change in color and nodeSize of a node
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

        if (layer === Layers.PACKAGES) {
            for (let i = Layers.MODULES.valueOf(); i <= layer.valueOf(); i++) {
                let nodes: Node[] = getNodesOnLevel(i, multiverse.root)
                nodes.forEach((node, i) => {
                    this.createHierarchyFromPackages(node, nodeTree, leaves)
                })
            }
        }
        nodeTree.codeSize = nodeTree.children.reduce(
            (sum: number, child: Node) => sum + child.codeSize,
            0
        )

        const tree: Tree = {
            layout: d3
                .tree()
                .nodeSize([dx, dy])
                .separation((a, b) => this.getNodeSeparation(a, b, dx)),
            root: hierarchy(nodeTree) as HierarchyPointNode<Node>,
            leaves: Array.from(leaves),
            rootNode: nodeTree
        }
        this.markNodesModifiedFromLeaves(tree.leaves)
        this.filterNodesFromLeaves(tree.leaves, sankeyTreeConfigStore().nodesFilter)

        // console.log('tree', tree)
        // console.log('nodeTree', nodeTree)
        // console.log('leaves', tree.leaves, 'exclusive leaves', tree.leaves.filter(leave => Array.from(leave.sources.keys()).length === 1))
        // console.log('modifiedNodes', this.modifiedNodes)
        // console.log('filteredNodes', this.filteredNodes)

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

                // FIXME set correct codeSize in child (right now only node A's codesize is stored in the merged node)
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
        sourceNode: any /* HierarchyPointNode<MyNode>*/,
        tree: Tree,
        containerSelections: ContainerSelections,
        universeMetadata: UniverseMetadata
    ) {
        let duration = 0

        if (event) {
            if (Object.values(CustomEventName).includes(event.type)) {
                this.handleCustomTreeEvent(event, tree)
            } else {
                // if you press alt / option key, then the collapse/extend animation is much slower :D
                duration = event && event.altKey ? 2500 : 250
            }
        }

        // Compute the new treeLayout layout.
        tree.layout(tree.root)

        const nodes = tree.root.descendants().reverse()
        const links = tree.root
            .links()
            .filter((link) => this.filteredNodes.includes(link.target.data))

        // Stash the old positions for transition.
        tree.root.eachBefore((d: any) => {
            d.x0 = d.x
            d.y0 = d.y
        })

        // TODO needed or can be removed?
        // console.debug(`${nodes.length} nodes, ${links.length} links visible`)

        // TODO may be useful when wanting to set the viewbox on init
        // // figure out the most left and most right node in a top-down treeLayout
        // let left: any = tree.root
        // let right: any = tree.root
        // tree.root.eachBefore((node: any) => {
        //     if (node.x < left.x) left = node
        //     if (node.x > right.x) right = node
        // })

        // define a transition
        const transition = containerSelections.zoomG
            .transition()
            .duration(duration)
            .tween(
                'resize',
                window.ResizeObserver
                    ? null
                    : () => () => containerSelections.zoomG.dispatch('toggle')
            )

        // Update the nodes…
        const node = containerSelections.gNode.selectAll('g').data(nodes, (d: any) => d.id)

        const nodeEnter = this.enterNode(node, sourceNode, (evt: MouseEvent, d: any) => {
            toggleChildren(d, evt.shiftKey, this.filteredNodes)
            this.redrawTree(evt, d, tree, containerSelections, universeMetadata)
        })
        const nodeEnterShape = this.appendShapeToNode(nodeEnter, universeMetadata)
        nodeEnterShape
            .on('mouseover', (event: MouseEvent, d: any) => {
                this.tooltip.updateContent(asHTML(d, this.metadata))
                this.tooltip.display()
            })
            .on('mousemove', (event: MouseEvent, d: any) =>
                this.tooltip.updatePosition(event.pageX, event.pageY)
            )
            .on('mouseout', (event: MouseEvent, d: any) => this.tooltip.hide())

        this.appendTextToNode(nodeEnter)

        this.updateNode(node, nodeEnter, transition)

        this.exitNode(node, sourceNode, transition)

        const linkGenerator = d3
            .linkHorizontal<any, any>()
            .x((d: any) => d.y)
            .y((d: any) => d.x)

        // Update the links…
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
        node: any,
        sourceNode: any,
        onClickCallback: (evt: MouseEvent, d: any) => void
    ) {
        // Enter any new nodes at the parent's previous position.
        return node
            .enter()
            .append('g')
            .attr('transform', () => `translate(${sourceNode.y0 ?? 0},${sourceNode.x0 ?? 0})`)
            .attr('fill-opacity', 0)
            .attr('stroke-opacity', 0)
            .on('click', (evt: MouseEvent, d: any) => {
                onClickCallback(evt, d)
            })
    }

    private appendShapeToNode(nodeEnter: any, universeMetadata: UniverseMetadata) {
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
            .attr('height', (d: any) => getBarHeight(d.data.codeSize))
            .attr('y', (d: any) => (d.data ? -getBarHeight(d.data.codeSize) / 2 : 0))
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

    private appendTextToNode(nodeEnter: any) {
        const positionOffset = this.getNodeTextPositionOffset()
        return nodeEnter
            .append('text')
            .attr('dy', '0.31em')
            .attr('x', (d: any) => (d._children ? positionOffset.start : positionOffset.end))
            .attr('text-anchor', (d: any) => (d._children ? 'end' : 'start'))
            .text((d: any) => d.data.name)
            .clone(true)
            .lower()
            .attr('stroke-linejoin', 'round')
            .attr('stroke-width', 3)
            .attr('stroke', 'white')
    }

    private updateNode(
        node: any,
        nodeEnter: any,
        transition: Transition<SVGGElement, unknown, HTMLElement, any>
    ) {
        // Transition nodes to their new position.
        return node
            .merge(nodeEnter)
            .transition(transition)
            .attr('transform', (d: any) => `translate(${d.y},${d.x})`)
            .attr('fill-opacity', 1)
            .attr('stroke-opacity', 1)
    }

    private exitNode(
        node: any,
        sourceNode: any /* HierarchyPointNode<MyNode>*/,
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
        link: any,
        linkGenerator: d3.Link<any, any, any>,
        sourceNode: any /* HierarchyPointNode<MyNode>*/
    ) {
        // Enter any new links at the parent's previous position.
        return link
            .enter()
            .append('path')
            .attr('d', (d: any) => {
                const o = { x: sourceNode.x0, y: sourceNode.y0 }
                return linkGenerator({ source: o, target: o })
            })
            .attr('stroke-width', (d: any) => Math.max(1, inMB(d.target.data.codeSize) * dx))
            .attr('stroke', (d: any) =>
                this.modifiedNodes.includes(d.target.data)
                    ? d.target.data.sources.size === 1
                        ? this.metadata[d.target.data.sources.keys().next().value].color
                        : this.sankeyStore.colorModified
                    : this.sankeyStore.colorUnmodified
            )
    }

    private updateLink(
        link: any,
        linkEnter: any,
        transition: Transition<SVGGElement, unknown, HTMLElement, any>,
        linkGenerator: d3.Link<any, any, any>
    ) {
        // Transition links to their new position.
        return link
            .merge(linkEnter)
            .transition(transition)
            .attr('d', (d: any) => {
                const targetsIndex = d.source.children.indexOf(d.target)
                let sourceX = d.source.children
                    .map((child: any, index: number) => {
                        if (index >= targetsIndex) return 0
                        return child.data ? inMB(child.data.codeSize) * dx : 0
                    })
                    .reduce((a: any, b: any, c: number) => {
                        return a + b
                    })
                sourceX += d.source.x - (inMB(d.source.data.codeSize) * dx) / 2
                sourceX += (inMB(d.target.data.codeSize) * dx) / 2
                const source = { x: sourceX, y: d.source.y0 }
                return linkGenerator({ source: source, target: d.target })
            })
    }

    private exitLink(
        link: any,
        linkGenerator: d3.Link<any, any, any>,
        sourceNode: any /* HierarchyPointNode<MyNode>*/,
        transition: Transition<SVGGElement, unknown, HTMLElement, any>
    ) {
        // Transition exiting nodes to the parent's new position.
        return link
            .exit()
            .transition(transition)
            .remove()
            .attr('d', (d: any) => {
                const o = { x: sourceNode.x, y: sourceNode.y }
                return linkGenerator({ source: o, target: o })
            })
    }

    private getNodeSeparation(
        a: HierarchyPointNode<unknown>,
        b: HierarchyPointNode<unknown>,
        dx: number
    ) {
        const totalWidth = a.data.codeSize + b.data.codeSize

        // const res = Math.max(1, inMB(totalWidth)/2)
        const res = inMB(totalWidth) / 2 / dx + 1.2
        return res
    }

    private getNodeTextPositionOffset(): NodeTextPositionOffset {
        return {
            start: -6,
            end: 26
        }
    }

    applyStyleForChosen(
        highlights: Set<string>,
        style: string,
        unselected: unknown,
        selected: unknown
    ) {
        const visNodes = this.containerSelections.gNode.selectAll('g') as any
        visNodes.selectAll('rect').style(style, unselected)

        visNodes
            .filter((node: HierarchyPointNode<Node>) => highlights.has(getWithoutRoot(node.data.identifier)))
            .selectAll('rect').transition()
            .duration(TRANSITION_DURATION)
            .style(style, selected)
    }

    // #############################################################################################
    // ##### HELPER UTILS ##########################################################################
    // #############################################################################################

    private handleCustomTreeEvent(event: any, tree: Tree) {
        if (event.detail.name === CustomEventName.APPLY_FILTER) {
            tree.root.eachBefore((node: any) => {
                if (!node._children) return
                sortChildren(node, event.detail.filter.sorting)
                if (node.children) node.children = filterDiffingUniverses(node, this.filteredNodes)
            })
        }

        // // expand full tree
        // if (event.detail.name === CustomEventName.EXPAND_TREE) {
        //     console.log(event.detail.name, true)
        //     tree.root.eachBefore((node: any) => {
        //         if (!node._children) return
        //         sortChildren(node, event.detail.filter.sorting)
        //         node.children = filterDiffingUniverses(node)
        //     })
        // }
    }
}
