import * as d3 from 'd3'
import { UniverseIndex } from '../SharedTypes/Indices'
import { Bytes } from '../SharedTypes/Size'
import { Multiverse } from '../UniverseTypes/Multiverse'
import { Node } from '../UniverseTypes/Node'
import { clamp, lightenColor, powerSet } from '../utils'
import { MultiverseVisualization } from './MultiverseVisualization'

type UniverseCombination = string
type ExclusiveSizes = Map<UniverseCombination, Bytes>

function universeCombination(indices: UniverseIndex[]): UniverseCombination {
    return indices.sort().join(',')
}

// Constants for the line on the left
const LINE_WIDTH = 256
const LINE_PADDING = 16

// At this height, entities explode into children.
const EXPLOSION_THRESHOLD = 100

// Constants for the hierarchy on the right
const HIERARCHY_GAPS = 2
const FONT_SIZE = 11
const TEXT_HORIZONTAL_PADDING = 8
const TEXT_VERTICAL_PADDING = 2

// Colors
const STRIPED_MIX_ALPHA = 0.4
const DEFAULT_FILL_STYLE = '#cccccc'
const TEXT_COLOR = 'black'

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

        this.exclusiveSizes = new Map()
        this.computeExclusiveSizes(indices, multiverse.root)

        this.generate()
    }
    setSelection(selection: Node[]): void {
        // TODO
    }
    setHighlights(highlights: Node[]): void {
        // TODO
    }

    computeExclusiveSizes(universeIndices: UniverseIndex[], mergedNode: Node) {
        const exclusiveSizes = new Map<UniverseCombination, Bytes>()

        if (mergedNode.children.length == 0) {
            // At the lowest level in the tree, the concept of code shared
            // between universes becomes a bit blurry. For example, a method
            // `foo` may have a code size of 300 bytes in universe A and only
            // 120 bytes in universe B. Now, what amount of code is shared? The
            // correct answer is that we can't tell – the method may have a
            // completely different implementation, or perhaps it's the same
            // code but the GraalVM analysis had a bit more information about
            // type flows and was able to simplify the code.
            //
            // It would make no sense to treat the implementation of methods as
            // entirely different (this would make the visualization useless),
            // but it also doesn't make sense to treat the unioned code size as
            // being in all universes – after all, a smaller universe should be
            // reported to be smaller.
            //
            // What we do here is a "share-as-much-as-is-reasonable" approach:
            // Let's say there's a method with the following code sizes in three
            // universes:
            //
            // - 20 bytes in universe A
            // - 50 bytes in universe B
            // - 80 bytes in universe C
            //
            // We treat the minimum size (20 bytes) as being shared among all
            // universes. We then repeat this process for the universes that
            // still contain more code with the remaining code sizes. Finally,
            // we end up with this result:
            //
            // - 20 bytes shared among A, B, and C
            // - 30 bytes shared among B and C
            // - 30 bytes exclusively in C

            const remainingSizes = new Map()
            for (const index of universeIndices) {
                remainingSizes.set(index, mergedNode.sources.get(index)?.codeSize ?? 0)
            }

            while (true) {
                for (const [index, size] of remainingSizes.entries()) {
                    if (size == 0) {
                        remainingSizes.delete(index)
                    }
                }
                if (remainingSizes.size == 0) {
                    break
                }

                const minimum = Array.from(remainingSizes.values()).reduce((a, b) => Math.min(a, b))
                const combination = universeCombination(Array.from(remainingSizes.keys()))
                exclusiveSizes.set(combination, minimum)

                for (const index of remainingSizes.keys()) {
                    remainingSizes.set(index, remainingSizes.get(index) - minimum)
                }
            }
        } else {
            mergedNode.children.forEach((child: Node) =>
                this.computeExclusiveSizes(universeIndices, child)
            )

            for (const child of mergedNode.children) {
                this.exclusiveSizes.get(child)!.forEach((size, combination) => {
                    if (!exclusiveSizes.get(combination)) exclusiveSizes.set(combination, 0)
                    exclusiveSizes.set(combination, exclusiveSizes.get(combination)! + size)
                })
            }
        }

        this.exclusiveSizes.set(mergedNode, exclusiveSizes)
    }

    generate(): void {
        this.container.innerHTML = ''

        this.canvas = document.createElement('canvas') as HTMLCanvasElement
        this.container.appendChild(this.canvas)
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
            lightenedColors.set(index, lightenColor(color, STRIPED_MIX_ALPHA))
        })

        for (const combination of this.combinations) {
            // console.log(`Creating fill style for ${combination}`)
            if (!combination.includes(',')) {
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

        console.log('Fill styles', this.fillStyles)
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
            const exclusiveSizes = this.exclusiveSizes.get(tree)!
            const totalSize = Array.from(exclusiveSizes.values()).reduce((a, b) => a + b, 0)

            for (const combination of this.combinations) {
                const size = exclusiveSizes.get(combination) ?? 0
                // TODO before merge: Make sure codeSize is the sum of all exclusiveSizes.
                const width = (LINE_WIDTH * size) / totalSize // tree.codeSize

                // Note: Floating point calculations are never accurate, so
                // `floor` and `ceil` are used to avoid the background
                // peeking through the gaps.
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
        if (!this.canvas || !this.context) {
            throw "Canvas doesn't exist yet."
        }

        this.context.font = `${FONT_SIZE}px sans-serif`

        const textWidth = this.context.measureText(text).width
        const boxWidth = textWidth + 2 * TEXT_HORIZONTAL_PADDING

        this.context.fillStyle =
            containingCombinations.length == 1
                ? this.fillStyles.get(containingCombinations[0])!
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

            this.context.fillStyle = TEXT_COLOR
            this.context.textBaseline = 'middle'
            this.context.fillText(text, left + TEXT_HORIZONTAL_PADDING, textCenterY)
        }

        return boxWidth
    }
}
