import * as d3 from 'd3'
import { HierarchyPointNode } from 'd3'
import {
    countPrivateLeaves,
    createHierarchyFromPackages,
    removeDiffingFilterFromTree,
    diffNodesFromLeaves,
    markNodesModifiedFromLeaves,
    setNodeSizeFromLeaves,
    createApplyFilterEvent,
    createExpandTreeEvent
} from './Utils'
import { updateSankeyTree } from './SankeyUtils'
import {
    COLOR_GREEN,
    COLOR_MODIFIED,
    COLOR_RED,
    MARGIN,
    MODIFIED,
    ROOT_NODE_NAME,
    UNMODIFIED
} from './TreeConstants'
import {
    Dictionary,
    MyNode,
    SortingOption,
    SortingOrder,
    SvgSelections,
    Tree,
    TreeNodesFilter,
    UniverseProps
} from './TreeTypes'
import TreeInputForm from './TreeInputForm'
import Visualization from '../Visualization'

export default class SankeyTreeVisualization implements Visualization {
    universesMetadata: Dictionary<UniverseProps>
    filter: TreeNodesFilter

    tree: Tree

    constructor(universeTexts: string[], universeNames: string[]) {
        this.universesMetadata = {}
        this.filter = {
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
                .separation(function (a, b) {
                    let totalWidth = countPrivateLeaves(a) + countPrivateLeaves(b)
                    return totalWidth / dx + 1
                })

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
                updateSankeyTree(
                    createExpandTreeEvent(this.filter),
                    this.tree.root,
                    this.tree,
                    svgSelections,
                    this.universesMetadata
                )
            })

            updateSankeyTree(
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

        updateSankeyTree(
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
}
