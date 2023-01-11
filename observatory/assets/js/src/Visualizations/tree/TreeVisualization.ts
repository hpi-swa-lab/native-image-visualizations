import Visualization from "../Visualization";
import {
    CustomEventName,
    Dictionary, MyNode, NodeTextPositionOffset,
    SortingOption,
    SortingOrder,
    SvgSelections,
    Tree,
    TreeNodesFilter,
    UniverseProps
} from "./TreeTypes";
import TreeInputForm from "./TreeInputForm";
import * as d3 from "d3";
import {COLOR_GREEN, COLOR_MODIFIED, COLOR_RED, MARGIN, MODIFIED, ROOT_NODE_NAME, UNMODIFIED} from "./TreeConstants";
import {
    createApplyFilterEvent,
    createExpandTreeEvent,
    createHierarchyFromPackages,
    diffNodesFromLeaves,
    handleCustomTreeEvent,
    markNodesModifiedFromLeaves, mousemove, mouseout, mouseover,
    removeDiffingFilterFromTree,
    setNodeSizeFromLeaves, toggle
} from "./TreeUtils";
import {HierarchyPointNode, Transition} from "d3";

export default class TreeVisualization implements Visualization {
    universesMetadata: Dictionary<UniverseProps>
    filter: TreeNodesFilter

    tree: Tree

    constructor(universeTexts: string[], universeNames: string[]) {
        this.universesMetadata = {}
        this.filter = {
            settings: {
                displayChangeBreakdown: true
            },
            diffing: {
                universes: new Set(['0', '1']),
                // universes: new Set(
                //     Object.keys(this.universesMetadata).filter((key) => key.length == 1)
                // ),
                showUnmodified: false
            },
            sorting: {
                option: SortingOption.NAME,
                order: SortingOrder.ASCENDING
            }
        }

        this.tree = this.buildTree(universeTexts, universeNames)
    }

    generate(): void {
        console.debug('Universes: ', this.tree)

        const inputForm = new TreeInputForm(this.universesMetadata, this.filter)

        const svg = d3.select('body').append('svg')

        const width = document.body.clientWidth
        const height = document.body.clientHeight
        const innerWidth = width - MARGIN.left - MARGIN.right
        const innerHeight = height - MARGIN.top - MARGIN.bottom

        const defaultViewbox = [0, 0, innerWidth, innerHeight].join(' ')

        this.tree.root.descendants().forEach((d: any, i:number) => {
            d.id = i
            d._children = d.children
            // FIXME ? only expand first level of children
            // if (d.depth > 0) d.children = null; // only expand the first level of children
        })

        const dx = 20
        const dy = innerWidth / 6

        this.tree.layout = d3
            .tree()
            .nodeSize([dx, dy])
            .separation((a, b) => this.getNodeSeparation(a, b, dx))

        const zoomG = svg
            .attr('width', innerWidth)
            .attr('height', innerHeight)
            .attr('viewBox', defaultViewbox)
            .append('g')
            .attr('id', 'zoomG')
            .attr('width', innerWidth - MARGIN.left)
            .attr('height', innerHeight * 0.5)
            .attr('transform', `translate(${MARGIN.left}, ${innerHeight * 0.5})`)

        // TODO clean up, the rect is only for test reasons
        // zoomG.append("rect")
        //     .attr("width", "100%")
        //     .attr("height", innerHeight * 0.5)
        //     .attr("fill", "orange");

        // console.debug(svg.node(), '\n', zoomG.node())

        const svgSelections: SvgSelections = {
            svg: svg,
            zoomG: zoomG,
            gLink: zoomG
                .append('g')
                .attr('fill', 'none')
                .attr('stroke', '#555')
                .attr('stroke-opacity', 0.4)
                .attr('stroke-width', 1.5),
            gNode: zoomG.append('g').attr('cursor', 'pointer').attr('pointer-events', 'all'),
            tooltip: d3
                .select('body')
                .append('div')
                .style('opacity', 0)
                .attr('class', 'tooltip')
                .style('background-color', 'white')
                .style('border', 'solid')
                .style('border-width', '2px')
                .style('border-radius', '5px')
                .style('padding', '5px')
                .style('position', 'absolute')
        }

        svg.call(
            d3.zoom().on('zoom', (svgTransform) => {
                zoomG.attr('transform', svgTransform.transform)
            })
        )

        inputForm.element.addEventListener('submit', (e) =>
            this.onSubmit(e, this.tree, svgSelections, this.universesMetadata)
        )

        document.getElementById('expand-tree-btn').addEventListener('click', (e) => {
            console.log(e)
            this.updateTree(
                createExpandTreeEvent(this.filter),
                this.tree.root,
                this.tree,
                svgSelections,
                this.universesMetadata
            )
        })

        this.updateTree(
            createApplyFilterEvent(this.filter),
            this.tree.root,
            this.tree,
            svgSelections,
            this.universesMetadata
        )
        // })
    }

    // ##################################################################
    // ### BUILD TREE HELPER FUNCTIONS #############################################
    // ##################################################################

    private buildTree(texts: string[], universeNames: string[]): Tree {
        // build tree including universes
        let treeData: MyNode = {
            name: ROOT_NODE_NAME,
            children: [],
            parent: undefined,
            universes: new Set<number>(),
            isModified: false,
            isFiltered: false,
            codeSize: 0
        }
        let sets = new Set<string>()
        let leaves: Set<MyNode> = new Set()

        texts.forEach((text, i) => {
            createHierarchyFromPackages(i, text, treeData, leaves, sets)
        })

        const tree: Tree = {
            root: d3.hierarchy(treeData) as HierarchyPointNode<MyNode>,
            leaves: Array.from(leaves),
            sets: Array.from(sets),
            treeData: treeData
        }

        setNodeSizeFromLeaves(tree.leaves)
        markNodesModifiedFromLeaves(tree.leaves)
        diffNodesFromLeaves(tree.leaves, this.filter)

        let colors: d3.RGBColor[] = [COLOR_RED, COLOR_GREEN]
        //
        Array.from(sets)
            .filter((setId) => setId.length == 1)
            .forEach((setId, i) => {
                this.universesMetadata[setId] = {
                    name: setId
                        .split('')
                        .map((id: string) => universeNames[parseInt(id)])
                        .join(', '),
                    color: colors[i]
                }
            })

        this.universesMetadata[MODIFIED] = {
            name: 'common and modified',
            color: COLOR_MODIFIED
        }

        // TODO remove debug log
        console.debug('universesMetadata: ', this.universesMetadata)
        for (let key in this.universesMetadata) {
            console.debug(
                `%c ${key}, ${this.universesMetadata[key].name}`,
                `background: ${this.universesMetadata[key].color}`
            )
        }

        return tree
    }

    private onSubmit(
        e: SubmitEvent,
        tree: Tree,
        svgSelections: SvgSelections,
        universePropsDict: Dictionary<UniverseProps>
    ) {
        e.preventDefault() // prevent page refresh

        const form = e.target as HTMLFormElement

        this.setDiffingFilter(form)
        this.setSortingFilter(form)

        removeDiffingFilterFromTree(tree.treeData)
        diffNodesFromLeaves(tree.leaves, this.filter)

        this.updateTree(
            createApplyFilterEvent(this.filter),
            tree.root,
            tree,
            svgSelections,
            universePropsDict
        )
    }

    private setDiffingFilter(form: HTMLFormElement) {
        const checkedKeys = Array.from(
            form
                .querySelector('fieldset[id=diffingFilter]')
                .querySelectorAll('input[type=checkbox]:checked')
        ).map((item: HTMLInputElement) => item.value)
        console.log(`%c form submitted [${checkedKeys}]`, 'background: green')

        this.filter.diffing.universes = new Set(checkedKeys)
        this.filter.diffing.showUnmodified = checkedKeys.includes(UNMODIFIED)
    }

    private setSortingFilter(form: HTMLFormElement) {
        const checkedSorting = Array.from(
            form
                .querySelector('fieldset[id=sortingFilter]')
                .querySelectorAll('input[type=radio]:checked')
        ).map((item: HTMLInputElement) => item.value)

        this.filter.sorting.option = checkedSorting[0]
        this.filter.sorting.order = checkedSorting[1]
    }

    updateTree(
        event: any | null,
        sourceNode: any /*HierarchyPointNode<MyNode>*/,
        tree: Tree,
        svgSelections: SvgSelections,
        universePropsDict: Dictionary<UniverseProps>
    ) {
        let duration = 0

        if (event) {
            if (Object.values(CustomEventName).includes(event.type)) {
                handleCustomTreeEvent(event, tree)
            } else {
                // if you press alt / option key, then the collapse/extend animation is much slower :D
                duration = event && event.altKey ? 2500 : 250
            }
        }

        // Compute the new treeLayout layout.
        tree.layout(tree.root)

        const nodes = tree.root.descendants().reverse()
        const links = tree.root.links().filter((link) => link.target.data.isFiltered)

        // Stash the old positions for transition.
        tree.root.eachBefore((d: any) => {
            d.x0 = d.x
            d.y0 = d.y
        })

        // TODO needed or can be removed?
        // console.debug(`${nodes.length} nodes, ${links.length} links visible`)

        // figure out the most left and most right node in a top-down treeLayout
        let left: any = tree.root
        let right: any = tree.root
        tree.root.eachBefore((node: any) => {
            if (node.x < left.x) left = node
            if (node.x > right.x) right = node
        })

        // define a transition
        const transition = svgSelections.zoomG
            .transition()
            .duration(duration)
            .tween(
                'resize',
                window.ResizeObserver ? null : () => () => svgSelections.zoomG.dispatch('toggle')
            )

        // Update the nodes…
        const node = svgSelections.gNode.selectAll('g').data(nodes, (d: any) => d.id)

        const nodeEnter = this.enterNode(node, sourceNode, (evt: MouseEvent, d: any) => {
            toggle(d, evt.shiftKey)
            this.updateTree(evt, d, tree, svgSelections, universePropsDict)
        })
        const nodeEnterShape = this.appendShapeToNode(nodeEnter, universePropsDict)
        nodeEnterShape
            .on('mouseover', (event: MouseEvent, d: any) => mouseover(event, d, svgSelections))
            .on('mousemove', (event: MouseEvent, d: any) =>
                mousemove(event, d, svgSelections, universePropsDict)
            )
            .on('mouseout', (event: MouseEvent, d: any) => mouseout(event, d, svgSelections))

        this.appendTextToNode(nodeEnter)

        this.updateNode(node, nodeEnter, transition)

        this.exitNode(node, sourceNode, transition)

        let linkGenerator = d3
            .linkHorizontal<any, any>()
            .x((d: any) => d.y)
            .y((d: any) => d.x)

        // Update the links…
        const link = svgSelections.gLink.selectAll('path').data(links, (d: any) => d.target.id)

        const linkEnter = this.enterLink(link, linkGenerator, sourceNode)

        this.updateLink(link, linkEnter, transition, linkGenerator)

        this.exitLink(link, linkGenerator, sourceNode, transition)
    }

    // ##########################################################################################################
    // ##### VISUALIZATION UTILS ################################################################################
    // ##########################################################################################################

    enterNode(node: any, sourceNode: any, onClickCallback: Function) {
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

    appendShapeToNode(nodeEnter: any, universePropsDict: Dictionary<UniverseProps>) {
        return nodeEnter.append('rect')
    }

    appendTextToNode(
        node: any
    ) {

        const positionOffset = this.getNodeTextPositionOffset()
        return node
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

    updateNode(
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

    exitNode(
        node: any,
        sourceNode: any /*HierarchyPointNode<MyNode>*/,
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

    enterLink(
        link: any,
        linkGenerator: d3.Link<any, any, any>,
        sourceNode: any /*HierarchyPointNode<MyNode>*/
    ) {}

    updateLink(
        link: any,
        linkEnter: any,
        transition: Transition<SVGGElement, unknown, HTMLElement, any>,
        linkGenerator: d3.Link<any, any, any>
    ) {}

    exitLink(
        link: any,
        linkGenerator: d3.Link<any, any, any>,
        sourceNode: any /*HierarchyPointNode<MyNode>*/,
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

    getNodeSeparation(a: HierarchyPointNode<unknown>, b: HierarchyPointNode<unknown>, dx: number) {
        return 0;
    }

    getNodeTextPositionOffset(): NodeTextPositionOffset {
        return {
            start: 0,
            end: 0
        }
    }
}