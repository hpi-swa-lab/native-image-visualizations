import * as d3 from 'd3'
import { HierarchyPointNode } from 'd3'
import {
    countPrivateLeaves,
    createHierarchyFromPackages,
    margin,
    removeFilterFromTree,
    filterNodesFromLeaves,
    updateTree,
    markNodesModifiedFromLeaves,
    setNodeSizeFromLeaves
} from './TreeUtils'
import { COLOR_GREEN, COLOR_MODIFIED, COLOR_RED, ROOT_NODE_NAME, UNMODIFIED } from './TreeConstants'
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
        // this.universesMetadata = {}
        this.universesMetadata = {
            '0': { name: 'micronautguide', color: COLOR_RED },
            '1': { name: 'helloworld', color: COLOR_GREEN },
            '01': { name: 'micronautguide, helloworld', color: d3.rgb(150, 150, 150) },
            MODIFIED: { name: 'modified packages', color: COLOR_MODIFIED }
        }
        this.filter = {
            universes: new Set(
                Object.keys(this.universesMetadata).filter((key) => key.length == 1)
            ),
            // universes: new Set('1'),
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
            const innerWidth = width - margin.left - margin.right
            const innerHeight = height - margin.top - margin.bottom

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
                .attr('width', innerWidth - margin.left)
                .attr('height', innerHeight * 0.5)
                .attr('transform', `translate(${margin.left}, ${innerHeight * 0.5})`)

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
        // must be in the same order as read-in files!
        const universeNames = ['micronautguide', 'helloworld']
        const texts = await Promise.all([
            d3.text('../assets/data/used_methods_micronautguide.txt'),
            d3.text('../assets/data/used_methods_helloworld.txt')
        ])

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

        // let colors:d3.RGBColor[] = [d3.rgb(200,0,0), d3.rgb(0,200,0), d3.rgb(150,150,150)]
        //
        // myTree.sets.forEach((setId, i) => {
        //     that.universesMetadata[setId] = {
        //         name: setId.split('').map((id:string) => universeNames[parseInt(id)]).join(', '),
        //         color: colors[i]
        //     }
        // })
        //
        // that.universesMetadata[MODIFIED] = {
        //     name: 'common but modified',
        //     color: d3.rgb(0,0,200)
        // }

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
        keys.pop() // removes the modified but common option
        const filteredKeys = keys.filter((key) => key.length == 1)

        // add checkboxes & labels
        filteredKeys.forEach((key) => {
            fieldset.appendChild(
                this.createCheckboxLabelDiv(
                    key,
                    this.universesMetadata[key].name,
                    this.universesMetadata[key].color.toString()
                )
            )
        })
        fieldset.appendChild(this.createCheckboxLabelDiv(UNMODIFIED, 'unmodified packages', '#555'))

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

    createCheckboxLabelDiv(id: string, label: string, backgroundColor: string) {
        const div = document.createElement('div')
        div.classList.add('form-check')
        const checkboxEl = document.createElement('input')
        checkboxEl.classList.add('form-check-input')
        checkboxEl.setAttribute('type', 'checkbox')
        checkboxEl.setAttribute('id', id)
        checkboxEl.setAttribute('value', id)

        if (this.filter.universes.has(id)) {
            checkboxEl.checked = true
        }

        const labelEl = document.createElement('Label')
        labelEl.classList.add('form-check-label')
        labelEl.setAttribute('for', id)
        labelEl.innerText = label
        div.style.backgroundColor = backgroundColor

        div.appendChild(checkboxEl)
        div.appendChild(labelEl)

        return div
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
