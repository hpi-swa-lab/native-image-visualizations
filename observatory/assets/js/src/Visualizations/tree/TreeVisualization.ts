import * as d3 from 'd3'
import { HierarchyPointNode } from 'd3'
import {
    countPrivateLeaves,
    createHierarchyFromPackages,
    removeFilterFromTree,
    filterNodesFromLeaves,
    updateTree,
    markNodesModifiedFromLeaves,
    setNodeSizeFromLeaves,
    createCheckboxLabelDiv,
    createLabelDiv
} from './TreeUtils'
import {
    COLOR_GREEN,
    COLOR_MODIFIED,
    COLOR_RED,
    COLOR_UNMODIFIED,
    MARGIN,
    MODIFIED,
    ROOT_NODE_NAME,
    UNMODIFIED
} from './TreeConstants'
import {
    Dictionary,
    MyNode,
    SvgSelections,
    Tree,
    TreeNodesFilter,
    UniverseProps
} from './TreeTypes'

export default class TreeVisualization implements Visualization {
    universesMetadata: Dictionary<UniverseProps>
    filter: TreeNodesFilter

    constructor() {
        this.universesMetadata = {}
        this.filter = {
            universes: new Set(['0', '1']),
            // universes: new Set(
            //     Object.keys(this.universesMetadata).filter((key) => key.length == 1)
            // ),
            showUnmodified: false,
            ignore: false
        }
    }

    generate(): void {
        this.loadUniverses().then((tree: Tree) => {
            console.debug('Universes: ', tree)

            const form = this.createInputForm()

            const svg = d3.select('body').append('svg')

            const width = document.body.clientWidth
            const height = document.body.clientHeight
            const innerWidth = width - MARGIN.left - MARGIN.right
            const innerHeight = height - MARGIN.top - MARGIN.bottom

            const defaultViewbox = [0, 0, innerWidth, innerHeight].join(' ')

            tree.root.descendants().forEach((d: any, i) => {
                d.id = i
                d._children = d.children
                // FIXME ? only expand first level of children
                // if (d.depth > 0) d.children = null; // only expand the first level of children
            })

            const dx = 20
            const dy = innerWidth / 6

            tree.layout = d3
                .tree()
                .nodeSize([dx, dy])
                .separation(function (a, b) {
                    let totalWidth = countPrivateLeaves(a) / 2 + countPrivateLeaves(b) / 2
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
                    this.filter.ignore = true // to not apply filter to filter all node's children on transition
                    updateTree(
                        null,
                        tree.root,
                        this.filter,
                        tree,
                        svgSelections,
                        this.universesMetadata
                    )
                })
            )

            form.addEventListener('submit', (e) =>
                this.onSubmit(e, tree, svgSelections, this.universesMetadata)
            )

            updateTree(null, tree.root, this.filter, tree, svgSelections, this.universesMetadata)
        })
    }

    // ##################################################################
    // ### BUILD TREE HELPER FUNCTIONS #############################################
    // ##################################################################

    async loadUniverses() {
        const files = [
            '../assets/data/used_methods_micronautguide.txt',
            '../assets/data/used_methods_helloworld.txt'
        ]

        const universeNames = files.map((path) => {
            const pathSegments = path.split('/')
            const nameSegments = pathSegments[pathSegments.length - 1].split('_')
            return nameSegments[nameSegments.length - 1].split('.')[0]
        })

        const texts = await Promise.all(files.map((file) => d3.text(file)))

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
        filterNodesFromLeaves(tree.leaves, this.filter)

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

    createInputForm() {
        const form = document.createElement('form')
        const fieldset = document.createElement('fieldset')
        fieldset.classList.add('border', 'p-2', 'w-auto')
        const legend = document.createElement('legend')
        legend.classList.add('w-auto', 'float-none', 'p-2')
        legend.innerText = 'Choose Universe(s) to be displayed'
        fieldset.appendChild(legend)
        const keys = Object.keys(this.universesMetadata)
        const filteredKeys = keys.filter((key) => key.length == 1)

        // add checkboxes & labels
        filteredKeys.forEach((key) => {
            fieldset.appendChild(
                createCheckboxLabelDiv(
                    key,
                    this.universesMetadata[key].name,
                    this.universesMetadata[key].color.toString(),
                    this.filter
                )
            )
        })
        fieldset.appendChild(
            createCheckboxLabelDiv(
                UNMODIFIED,
                'unmodified packages',
                COLOR_UNMODIFIED.toString(),
                this.filter
            )
        )
        fieldset.appendChild(
            createLabelDiv(MODIFIED, 'modified packages', COLOR_MODIFIED.toString())
        )

        form.appendChild(fieldset)

        // add submit button
        const submitBtn = document.createElement('button')
        submitBtn.setAttribute('type', 'submit')
        submitBtn.classList.add('btn')
        submitBtn.classList.add('btn-sm')
        submitBtn.classList.add('btn-primary')
        submitBtn.innerText = 'update tree'
        fieldset.appendChild(submitBtn)
        document.body.appendChild(form)

        return form
    }

    onSubmit(
        e: SubmitEvent,
        tree: Tree,
        svgSelections: SvgSelections,
        universePropsDict: Dictionary<UniverseProps>
    ) {
        e.preventDefault() // prevent page refresh

        const form = e.target as HTMLFormElement
        const checkedKeys = Array.from(form.querySelectorAll('input[type=checkbox]:checked')).map(
            (item: HTMLInputElement) => item.value
        )
        console.log(`%c form submitted [${checkedKeys}]`, 'background: green')

        this.filter.universes = new Set(checkedKeys)
        this.filter.ignore = false
        this.filter.showUnmodified = checkedKeys.includes(UNMODIFIED)

        removeFilterFromTree(tree.treeData)
        filterNodesFromLeaves(tree.leaves, this.filter)

        updateTree(null, tree.root, this.filter, tree, svgSelections, universePropsDict)
    }
}
