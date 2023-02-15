import * as d3 from 'd3'
import { UniverseIndex } from '../SharedTypes/Indices'
import { Bytes } from '../SharedTypes/Size'
import { Multiverse } from '../UniverseTypes/Multiverse'
import { Node } from '../UniverseTypes/Node'
import { clamp, lightenColor, powerSet } from '../utils'
// import { clamp, lightenColor, powerSet } from '../utils'
import { MultiverseVisualization } from './MultiverseVisualization'

type UniverseCombination = UniverseIndex[]
type ExclusiveSizes = Map<UniverseCombination, Bytes>

function computeExclusiveSizes(
    allExclusiveSizes: Map<Node, ExclusiveSizes>,
    universeIndices: UniverseIndex[],
    mergedNode: Node
) {
    const exclusiveSizes = new Map()

    if (mergedNode.children.length == 0) {
        const combination: UniverseIndex[] = []
        for (const index of universeIndices) {
            if (mergedNode.sources.get(index)!.codeSize > 0) {
                combination.push(index)
            }
        }

        exclusiveSizes.set(combination, 1) // TODO: Method size hardcoded to 1.
    } else {
        mergedNode.children.forEach((child: Node) =>
            computeExclusiveSizes(allExclusiveSizes, universeIndices, child)
        )

        for (const child of mergedNode.children) {
            allExclusiveSizes.get(child)!.forEach((size, combination) => {
                if (!exclusiveSizes.get(combination)) exclusiveSizes.set(combination, 0)
                exclusiveSizes.set(combination, exclusiveSizes.get(combination)! + size)
            })
        }
    }

    allExclusiveSizes.set(mergedNode, exclusiveSizes)
}

const MIX_ALPHA = 0.4
const EXPLOSION_THRESHOLD = 100 // at this height, entities explode into children

const LINE_WIDTH = 256
const LINE_PADDING = 16

const FONT_SIZE = 16
const TEXT_HORIZONTAL_PADDING = 8
const TEXT_VERTICAL_PADDING = 2
const HIERARCHY_GAPS = 2 // used between boxes of the hierarchy

export class TreeLine implements MultiverseVisualization {
    multiverse: Multiverse = new Multiverse([])
    selection: Node[] = []

    combinations: UniverseCombination[] = []
    exclusiveSizes: Map<Node, ExclusiveSizes> = new Map()

    colors: Map<UniverseIndex, string> = new Map()
    fillStyles: Map<UniverseCombination, string | CanvasGradient> = new Map()

    container: HTMLDivElement
    canvas: HTMLCanvasElement | null = null
    context: CanvasRenderingContext2D | null = null

    constructor(container: HTMLDivElement, colors: Map<UniverseIndex, string>) {
        this.container = container
        this.colors = colors
    }

    setMultiverse(multiverse: Multiverse): void {
        this.multiverse = multiverse

        const indices: UniverseIndex[] = multiverse.sources.map((_, i) => i)
        if (indices.length == 1) {
            this.combinations = [indices]
        } else if (indices.length == 2) {
            this.combinations = [[0], [0, 1], [1]]
        } else {
            this.combinations = []
            for (const combination of powerSet(indices)) {
                if (combination.length > 0) {
                    this.combinations.push(combination)
                }
            }
        }

        this.exclusiveSizes = new Map()
        computeExclusiveSizes(this.exclusiveSizes, indices, multiverse.root)

        console.log('Set multiverse', this.multiverse)
    }
    setSelection(selection: Node[]): void {
        // TODO
    }
    setHighlights(highlights: Node[]): void {
        // TODO
    }
    generate(): void {
        const container = document.getElementById('tree-line-container')!

        this.canvas = document.createElement('canvas') as HTMLCanvasElement
        container.appendChild(this.canvas)
        this.context = this.canvas.getContext('2d', { alpha: false })

        const fitToScreen = () => {
            if (!this.canvas) {
                return
            }

            const targetWidth = window.innerWidth
            const targetHeight = window.innerHeight

            if (this.canvas.width != targetWidth || this.canvas.height != targetHeight) {
                this.canvas.width = targetWidth
                this.canvas.height = targetHeight
                this.buildFillStyles()
            }
        }
        fitToScreen()

        let initialBarHeight = this.canvas.height - LINE_PADDING * 2
        let initialPixelsPerByte = initialBarHeight / this.multiverse!.root.codeSize
        let initialTop = LINE_PADDING

        const multiverse = this.multiverse
        const redraw = (event: any | undefined) => {
            console.log('redrawing')
            if (!this.canvas || !this.context) {
                throw "Canvas doesn't exist yet."
            }

            const transform = event?.transform ?? { x: 0, y: 0, k: 1 }

            fitToScreen()

            this.context.fillStyle = 'white'
            this.context.fillRect(0, 0, this.canvas.width, this.canvas.height)

            const top = initialTop + transform.y
            const pixelsPerByte = initialPixelsPerByte * transform.k

            const leftOfHierarchy = LINE_PADDING + LINE_WIDTH + LINE_PADDING

            this.drawDiagram(multiverse.root, top, pixelsPerByte, [], leftOfHierarchy)
        }
        redraw(undefined)

        d3.select(this.canvas).call(d3.zoom().scaleExtent([1, 10000]).on('zoom', redraw))
        window.addEventListener('resize', redraw)
    }

    buildFillStyles() {
        if (!this.canvas || !this.context) {
            throw "Canvas doesn't exist yet."
        }

        const lightenedColors: Map<UniverseIndex, string> = new Map()
        this.colors.forEach((color, index) => {
            lightenedColors.set(index, lightenColor(color, MIX_ALPHA))
        })

        for (const combination of this.combinations) {
            console.log(`Creating fill style for ${combination}`)
            if (combination.length == 1) {
                this.fillStyles.set(combination, this.colors.get(combination[0])!)
                continue
            }

            const gradientColors = combination.map((universe) => lightenedColors.get(universe))
            const size = Math.max(this.canvas.width, this.canvas.height)
            const gradient = this.context.createLinearGradient(0, 0, size, size)
            const numSteps = Math.sqrt(2 * Math.pow(size, 2)) / 5

            for (let i = 0; i < numSteps; i += 1) {
                const d = (1 / numSteps) * i
                gradient.addColorStop(d, gradientColors[i % gradientColors.length]!)
                if (d + 0.001 <= 1) {
                    gradient.addColorStop(
                        d + 0.001,
                        gradientColors[(i + 1) % gradientColors.length]!
                    )
                }
            }

            this.fillStyles.set(combination, gradient)
        }
    }

    drawDiagram(
        tree: Node,
        top: number,
        pixelsPerByte: number,
        path: string[],
        leftOfHierarchy: number
    ) {
        if (!this.canvas || !this.context) {
            throw "Canvas doesn't exist yet."
        }

        // console.log('Drawing diagram of tree')
        // console.log(tree)
        const height = tree.codeSize * pixelsPerByte

        if (top > this.canvas.height || top + height < 0) {
            return // Outside of the visible area.
        }

        // Show the hierarchy on the right.
        let leftOfSubHierarchy = undefined
        if (path.length == 0) {
            leftOfSubHierarchy = leftOfHierarchy
        } else {
            let containingCombinations = Array.from(this.exclusiveSizes.get(tree)!.entries())
                .filter(([_, size]) => size > 0)
                .map(([combination, _]) => combination)

            const widthOfBox = this.drawHierarchyBox(
                leftOfHierarchy,
                top,
                height,
                path[path.length - 1],
                containingCombinations
            )
            leftOfSubHierarchy = leftOfHierarchy + widthOfBox + HIERARCHY_GAPS
        }

        const shouldExplode =
            tree.children.length == 1 || (height >= EXPLOSION_THRESHOLD && tree.children.length > 0)
        if (shouldExplode) {
            let childOffsetFromTop = top
            for (const child of tree.children) {
                let childPath = path.slice()
                childPath.push(child.name)
                this.drawDiagram(
                    child,
                    childOffsetFromTop,
                    pixelsPerByte,
                    childPath,
                    leftOfSubHierarchy
                )
                childOffsetFromTop += child.codeSize * pixelsPerByte
            }
        } else {
            let offsetFromLeft = LINE_PADDING
            for (const combination of this.combinations) {
                const size = this.exclusiveSizes.get(tree)!.get(combination) ?? 0
                const width = (LINE_WIDTH * size) / tree.codeSize

                // Note: Floating point calculations are never accurate, so
                // `floor` and `ceil` are used to avoid the background
                // peeking through the gaps.
                this.context.fillStyle = this.fillStyles.get(combination)!
                this.context.fillRect(offsetFromLeft, Math.floor(top), width, Math.ceil(height))

                offsetFromLeft += width
            }
        }
    }

    drawHierarchyBox(
        left: number,
        top: number,
        height: number,
        text: string,
        containingCombinations: UniverseCombination[]
    ): number {
        if (!this.canvas || !this.context) {
            throw "Canvas doesn't exist yet."
        }

        this.context.font = `${FONT_SIZE}px sans-serif`

        const textWidth = this.context.measureText(text).width
        const boxWidth = textWidth + 2 * TEXT_HORIZONTAL_PADDING

        this.context.fillStyle =
            containingCombinations.length == 1
                ? this.fillStyles.get(containingCombinations[0])!
                : '#cccccc'
        this.context.fillRect(left, top, boxWidth, height - HIERARCHY_GAPS)

        const visibleStart = clamp(top, 0, this.canvas.height)
        const visibleEnd = clamp(top + height, 0, this.canvas.height)

        if (height >= FONT_SIZE + 2 * TEXT_VERTICAL_PADDING) {
            const textRadius = FONT_SIZE / 2
            const textCenterY = clamp(
                (visibleStart + visibleEnd) / 2,
                top + textRadius + TEXT_VERTICAL_PADDING,
                top + height - textRadius - TEXT_VERTICAL_PADDING
            )

            this.context.fillStyle = 'black'
            this.context.textBaseline = 'middle'
            this.context.fillText(text, left + TEXT_HORIZONTAL_PADDING, textCenterY)
        }

        return boxWidth
    }
}
