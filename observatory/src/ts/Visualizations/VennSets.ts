/* eslint-disable @typescript-eslint/no-explicit-any */
// Reason for disable: d3 interfaces often return and expect any types, e.g. 'select'
import * as d3 from 'd3'
import { Multiverse } from '../UniverseTypes/Multiverse'
import { Node } from '../UniverseTypes/Node'
import { MultiverseVisualization } from './MultiverseVisualization'
import { Layers } from '../enums/Layers'
import { getNodesOnLevel } from '../Math/filters'
import { VennPartitions, VennSet } from '../SharedTypes/Venn'
import * as venn from '@upsetjs/venn.js'
import { createVennPartitions, powerSet } from '../Math/Sets'

type Force = {
    combination: string
    point: venn.IPoint
}

type VisualNode = {
    combination: number[]
    combinationIndex: number
    name: string
    radius: number
    x: number
    y: number
}

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
    private vennPartitions: VennPartitions = { inclusive: [], exclusive: [] }

    private container: any

    constructor(containerSelector: string, layer: Layers) {
        const bounds = (d3.select(containerSelector) as any).node().getBoundingClientRect() ?? {
            width: 1280,
            height: 720
        }
        this.container = d3
            .select(containerSelector)
            .append('svg:svg')
            .attr('width', bounds.width)
            .attr('height', bounds.height)

        this.layer = layer
        this.initialiseZoom()
    }

    public setMultiverse(multiverse: Multiverse): void {
        this.multiverse = multiverse
        this.vennPartitions = createVennPartitions(this.multiverse)

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

        this.drawLoadingText()

        const nodesOnLevel: Node[] = getNodesOnLevel(this.layer, this.multiverse.root)
        const nodesContainer = this.drawCircles(this.asVisualNodes(nodesOnLevel))

        this.startForceSimulationFor(nodesContainer, this.container)
        this.visualizeUserSelections()
    }

    private startForceSimulationFor(nodesContainer: any, visualisationContainer: any) {
        const focii: Force[] = this.calculateFociiFor(this.vennPartitions.inclusive)
        const force = d3
            .forceSimulation(nodesContainer.data())
            .force(
                'center',
                d3.forceCenter(0.5 * this.containerWidth(), 0.5 * this.containerHeight())
            )
            .force('charge', d3.forceManyBody())
            .force('x', d3.forceX().strength(0.13))
            .force('y', d3.forceY().strength(0.13))
            .force(
                'collide',
                d3.forceCollide().radius((node: any) => node.radius + 0.5)
            )

        force.on('tick', function () {
            // 'tick' specifially specifies 'this: Simulation<SimulationNodeDatum, undefined>'
            // as argument, which makes arrow functions inapplicable
            // eslint-disable-next-line no-invalid-this, @typescript-eslint/no-this-alias
            const alpha: number = this.alpha()
            const renderingThreshold = focii.length === 1 ? 0.9 : 0.4 // setz den 2. niedriger für low res, je weiter ausgezoomt desto niedriger kann das

            if (alpha < renderingThreshold) {
                visualisationContainer.select('.loading').remove()

                nodesContainer
                    .transition()
                    .duration(TRANSITION_DURATION)
                    .attr('cx', (data: any) => {
                        return data.x
                    })
                    .attr('cy', (data: any) => data.y)

                force.stop()
            } else {
                const strength = alpha * 0.1 // higher -> nodes get stronger attraction to force
                nodesContainer.data().forEach((node: VisualNode) => {
                    node.y += (focii[node.combinationIndex].point.y - node.y) * strength
                    node.x += (focii[node.combinationIndex].point.x - node.x) * strength
                })
            }

            visualisationContainer
                .select('.loading')
                .text(
                    'Calculating Layout: ' +
                        Math.round(
                            (1 - (alpha - renderingThreshold) / (1 - renderingThreshold)) * 100
                        ) +
                        '%'
                )
        })
    }

    private drawCircles(nodes: VisualNode[]): any {
        return this.container
            .append('g')
            .attr('class', 'nodes')
            .selectAll('circle')
            .data(nodes)
            .join('g')
            .attr('class', (node: VisualNode) => node.combination)
            .append('svg:circle')
            .attr('id', (node: VisualNode) => node.name)
            .attr('r', (node: VisualNode) => node.radius)
            .attr('cx', -100)
            .attr('cy', -100)
            .attr(
                'fill',
                (node: VisualNode) => COLORS[node.combinationIndex] // todo
            )
            .on('mouseover', (event: Event, node: VisualNode) => {
                console.log(`
                Exclusive in: ${node.combination
                    .map((index) => this.multiverse.sources[index].name)
                    .join(' intersecting ')}
                Name: ${node.name}
                Code Size: ${node.radius.toFixed(2)} Byte`)
            })
    }

    private drawLoadingText() {
        if (this.multiverse.sources.length === 0) return

        this.container
            .append('svg:text')
            .attr('class', 'loading')
            .attr('x', this.containerWidth() / 2 - 200)
            .attr('y', this.containerHeight() / 2)
            .text('Drawing Bubbles')
    }

    private initialiseZoom() {
        const zoom = d3
            .zoom()
            .scaleExtent([0.01, 4])
            .on('zoom', ({ transform }) => this.container.select('g').attr('transform', transform))
        this.container.call(zoom)
    }

    private asVisualNodes(nodes: Node[]): VisualNode[] {
        const maxValue: number = Math.max(...nodes.map((a) => a.codeSize))
        const scaling = d3.scalePow().exponent(0.5).domain([0, maxValue]).range([3, 40])
        const possibleCombinations = powerSet([...this.multiverse.sources.keys()])
            .map((combination) => JSON.stringify(combination))
            .slice(1) as string[]

        const visualNodes: VisualNode[] = []
        visualNodes.push(
            ...nodes.map((node) => {
                const combination = [...node.sources.keys()]
                return <VisualNode>{
                    combination: combination,
                    combinationIndex: possibleCombinations.indexOf(JSON.stringify(combination)), // todo
                    name: node.name,
                    radius: scaling(node.codeSize)
                }
            })
        )
        return visualNodes
    }

    private calculateFociiFor(set: VennSet[]): Force[] {
        if (set.length === 0) return []
        const solution = venn.venn(set)
        const circles = venn.scaleSolution(
            solution,
            this.containerWidth(),
            this.containerHeight(),
            10
        )
        const focii: { [set: string]: venn.IPoint } = venn.computeTextCentres(circles, set, false)
        return Object.entries(focii).map(([combination, point]) => {
            return { combination: combination, point: point }
        })
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
