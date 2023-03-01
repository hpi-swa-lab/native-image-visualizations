import * as d3 from 'd3'
import { lightenColor } from '../Math/Colors'
import { clamp } from '../Math/Numbers'
import { powerSet } from '../Math/Sets'
import { computeExclusiveSizes, ExclusiveSizes } from '../Math/Universes'
import { UniverseIndex } from '../SharedTypes/Indices'
import { Multiverse, universeCombination, UniverseCombination } from '../UniverseTypes/Multiverse'
import { Node } from '../UniverseTypes/Node'
import { MultiverseVisualization } from './MultiverseVisualization'

const LINE_WIDTH = 256
const LINE_PADDING = 16
const HIERARCHY_GAPS = 2

export class TreeLine implements MultiverseVisualization {
    multiverse: Multiverse = new Multiverse([])
    selection: Node[] = []

    combinations: UniverseCombination[] = []
    exclusiveSizes: Map<Node, ExclusiveSizes> = new Map()

    colors: Map<UniverseIndex, string> = new Map()
    fillStyles: Map<UniverseCombination, string | CanvasGradient> = new Map()

    container: HTMLDivElement
    canvas: HTMLCanvasElement = new HTMLCanvasElement()
    context: CanvasRenderingContext2D = new CanvasRenderingContext2D()

    constructor(container: HTMLDivElement, colors: Map<UniverseIndex, string>) {
        this.container = container
        this.colors = colors
    }

    setMultiverse(multiverse: Multiverse): void {
        this.multiverse = multiverse

        // Create a list of combinations sorted in a way that is visually
        // pleasing. The order is hand-picked for few universes.
        const indices: UniverseIndex[] = multiverse.sources.map((_, i) => i)
        if (indices.length == 1) {
            this.combinations = [universeCombination(indices)]
        } else if (indices.length == 2) {
            this.combinations = [
                universeCombination([0]),
                universeCombination([0, 1]),
                universeCombination([1])
            ]
        } else {
            this.combinations = []
            for (const combination of powerSet(indices)) {
                if (combination.length > 0) {
                    this.combinations.push(universeCombination(combination))
                }
            }
        }

        this.exclusiveSizes = computeExclusiveSizes(multiverse)

        this.generate()
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setSelection(selection: Node[]): void {
        // TODO; https://github.com/hpi-swa-lab/MPWS2022RH1/issues/118
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setHighlights(highlights: Node[]): void {
        // TODO; https://github.com/hpi-swa-lab/MPWS2022RH1/issues/118
    }

    generate(): void {
        this.container.innerHTML = ''

        this.canvas = document.createElement('canvas') as HTMLCanvasElement
        this.container.appendChild(this.canvas)
        this.context = this.canvas.getContext('2d', { alpha: false })!

        const fitToScreen = () => {
            const targetWidth = window.innerWidth
            const targetHeight = window.innerHeight

            if (this.canvas.width != targetWidth || this.canvas.height != targetHeight) {
                this.canvas.width = targetWidth
                this.canvas.height = targetHeight
                this.buildFillStyles()
            }
        }
        fitToScreen()

        const initialBarHeight = this.canvas.height - LINE_PADDING * 2
        const initialPixelsPerByte = initialBarHeight / this.multiverse.root.codeSize
        const initialTop = LINE_PADDING

        const multiverse = this.multiverse
        // `d3.zoom().on(..., ...)` expects a function accepting `any`.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const redraw = (event: any | undefined) => {
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

        d3.select(this.canvas as Element).call(d3.zoom().on('zoom', redraw))
        window.addEventListener('resize', redraw)
    }

    buildFillStyles() {
        const lightenedColors: Map<UniverseIndex, string> = new Map()
        this.colors.forEach((color, index) => {
            lightenedColors.set(index, lightenColor(color, 0.4))
        })

        for (const combination of this.combinations) {
            if (!combination.includes(',')) {
                // There's only a single universe in this combination and there
                // exists a color in `this.colors` for every universe.
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                this.fillStyles.set(combination, this.colors.get(parseInt(combination))!)
                continue
            }

            const gradientColors = combination
                .split(',')
                .map((universe) => lightenedColors.get(parseInt(universe)))
            const size = Math.max(this.canvas.width, this.canvas.height)
            const gradient = this.context.createLinearGradient(0, 0, size, size)
            const numSteps = Math.sqrt(2 * Math.pow(size, 2)) / 5

            for (let i = 0; i < numSteps; i += 1) {
                const d = (1 / numSteps) * i
                // Because we calculate mod the length of the colors, the access
                // definitely succeeds.
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                gradient.addColorStop(d, gradientColors[i % gradientColors.length]!)
                if (d + 0.001 <= 1) {
                    gradient.addColorStop(
                        d + 0.001,
                        // Because we calculate mod the length of the colors,
                        // the access definitely succeeds.
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
        // At this height, entities explode into children.
        const EXPLOSION_THRESHOLD = 100

        const height = tree.codeSize * pixelsPerByte

        if (top > this.canvas.height || top + height < 0) {
            return // Outside of the visible area.
        }

        // Show the hierarchy on the right.
        let leftOfSubHierarchy = undefined
        if (path.length == 0) {
            leftOfSubHierarchy = leftOfHierarchy
        } else {
            // The exclusive sizes are calculated for all nodes.
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const containingCombinations = Array.from(this.exclusiveSizes.get(tree)!.entries())
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                .filter(([_, size]) => size > 0)
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
                const childPath = path.slice()
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
            // The exclusive sizes are calculated for all nodes.
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const exclusiveSizes = this.exclusiveSizes.get(tree)!
            const totalSize = Array.from(exclusiveSizes.values()).reduce((a, b) => a + b, 0)

            for (const combination of this.combinations) {
                const size = exclusiveSizes.get(combination) ?? 0
                const width = (LINE_WIDTH * size) / totalSize

                // Note: Floating point calculations are never accurate, so
                // `floor` and `ceil` are used to avoid the background
                // peeking through the gaps.

                // The fill styles are calculated for all nodes.
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                this.context.fillStyle = this.fillStyles.get(combination)!
                this.context.fillRect(offsetFromLeft, Math.floor(top), width, Math.ceil(height))

                offsetFromLeft += width
            }
            2
        }
    }

    drawHierarchyBox(
        left: number,
        top: number,
        height: number,
        text: string,
        containingCombinations: UniverseCombination[]
    ): number {
        const FONT_SIZE = 11
        const TEXT_HORIZONTAL_PADDING = 8
        const TEXT_VERTICAL_PADDING = 2
        const DEFAULT_FILL_STYLE = '#cccccc'

        this.context.font = `${FONT_SIZE}px sans-serif`

        const textWidth = this.context.measureText(text).width
        const boxWidth = textWidth + 2 * TEXT_HORIZONTAL_PADDING

        this.context.fillStyle =
            containingCombinations.length == 1
                ? // The fill styles are calculated for all nodes.
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  this.fillStyles.get(containingCombinations[0])!
                : DEFAULT_FILL_STYLE
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