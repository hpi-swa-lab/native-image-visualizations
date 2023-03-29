// To enable currying (e.g. functions such as `[_, a] => a` that ignore some
// parameters), disable the unused-vars lint.
/* eslint-disable @typescript-eslint/no-unused-vars */

import * as d3 from 'd3'
import { ZoomBehavior } from 'd3'
import { lightenColor } from '../Math/Colors'
import { clamp } from '../Math/Numbers'
import { powerSet } from '../Math/Sets'
import { computeExclusiveSizes, ExclusiveSizes } from '../Math/Universes'
import { ColorScheme } from '../SharedTypes/Colors'
import { Filter } from '../SharedTypes/Filters'
import { UniverseIndex } from '../SharedTypes/Indices'
import { formatBytes } from '../SharedTypes/Size'
import { Multiverse } from '../UniverseTypes/Multiverse'
import { Node } from '../UniverseTypes/Node'
import { Universe } from '../UniverseTypes/Universe'
import {
    indicesAsUniverseCombination,
    UniverseCombination,
    universeCombinationAsIndices
} from '../UniverseTypes/UniverseCombination'
import { MultiverseVisualization } from './MultiverseVisualization'

const LINE_WIDTH = 256
const LINE_PADDING = 16
const HIERARCHY_GAPS = 4

// Info areas correspond to interactive parts of the layout. They are used by
// tooltips.
type InfoArea = {
    // In the line on the left, size information is shown. In the package
    // hierarchy on the right, information about nodes is shown.
    info: SizeInfo | Node
    x: number
    y: number
    width: number
    height: number
}
export type SizeInfo = {
    sources: UniverseCombination
    size: number
}
function doesAreaContain(area: InfoArea, x: number, y: number): boolean {
    return area.x <= x && area.x + area.width >= x && area.y <= y && area.y + area.height >= y
}

export class TreeLine implements MultiverseVisualization {
    multiverse: Multiverse = new Multiverse([])
    colorScheme: ColorScheme
    selection: Set<string> = new Set<string>()
    highlights: Set<string> = new Set<string>()
    filters: Filter[] = []

    combinations: UniverseCombination[] = []
    exclusiveSizes: Map<Node, ExclusiveSizes> = new Map([[this.multiverse.root, new Map([])]])

    colorsByIndex: Map<UniverseIndex, string> = new Map()
    fillStyles: Map<UniverseCombination, string | CanvasGradient> = new Map()
    fadedOutFillStyles: Map<UniverseCombination, string | CanvasGradient> = new Map()

    canvas: HTMLCanvasElement
    context: CanvasRenderingContext2D
    zoom: ZoomBehavior<Element, unknown>
    transform = { y: 0, k: 1 }
    infoAreas = [] as InfoArea[]

    constructor(
        container: HTMLDivElement,
        colorScheme: ColorScheme,
        highlights: Set<string>,
        selection: Set<string>,
        filters: Filter[]
    ) {
        this.colorScheme = colorScheme
        this.filters = filters
        this.highlights = highlights
        this.selection = selection

        this.canvas = document.createElement('canvas') as HTMLCanvasElement
        container.appendChild(this.canvas)

        // The canvas's `getContext` may return `null` if we already requested
        // a different context from it (such as a "webgl" context for 3D
        // rendering). We don't ever do this, so this succeeds.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.context = this.canvas.getContext('2d', { alpha: false })!

        this.zoom = d3.zoom().on('zoom', (event) => {
            this.transform = event?.transform ?? this.transform
            return this.redraw()
        })
        d3.select(this.canvas as Element).call(this.zoom)
        window.addEventListener('resize', () => this.redraw())

        this.redraw()
    }

    public setMultiverse(multiverse: Multiverse): void {
        this.multiverse = multiverse

        const indices: UniverseIndex[] = multiverse.sources.map((_, i) => i)
        this.combinations = powerSet(indices).splice(1).map(indicesAsUniverseCombination)

        this.exclusiveSizes = computeExclusiveSizes(multiverse)

        this.buildColors()
        this.buildFillStyles()
        this.redraw()
    }

    public setColorScheme(colorScheme: ColorScheme) {
        this.colorScheme = colorScheme
        this.buildColors()
        this.buildFillStyles()
        this.redraw()
    }

    public setSelection(selection: Set<string>): void {
        this.selection = selection
        this.redraw()
    }

    public setHighlights(highlights: Set<string>): void {
        this.highlights = highlights
        this.redraw()
    }

    public getInfoAtPosition(x: number, y: number): SizeInfo | Node | undefined {
        return this.infoAreas.find((area) => doesAreaContain(area, x, y))?.info
    }

    public setFilters(filters: Filter[]): void {
        this.filters = filters
        this.zoom.translateTo(d3.select(this.canvas as Element), 0, 0)
        this.redraw()
    }

    private buildColors() {
        this.colorsByIndex = new Map()
        this.multiverse.sources.forEach((universe: Universe, index: number) => {
            this.colorsByIndex.set(index, universe.color)
        })
    }

    private buildFillStyles() {
        for (const combination of this.combinations) {
            const indices = universeCombinationAsIndices(combination)
            // There exists a color for every universe.
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const colors = indices.map((index) => this.colorsByIndex.get(index)!)

            if (indices.length == 1) {
                const color = colors[0]
                this.fillStyles.set(combination, color)
                this.fadedOutFillStyles.set(combination, lightenColor(color, 0.2))
                continue
            }

            this.fillStyles.set(
                combination,
                this.buildGradient(colors.map((color) => lightenColor(color, 0.6)))
            )
            this.fadedOutFillStyles.set(
                combination,
                this.buildGradient(colors.map((color) => lightenColor(color, 0.2)))
            )
        }
    }

    private buildGradient(colors: string[]): CanvasGradient {
        const size = Math.max(this.canvas.width, this.canvas.height)
        const gradient = this.context.createLinearGradient(0, 0, size, size)
        const numSteps = Math.sqrt(2 * Math.pow(size, 2)) / 5

        for (let i = 0; i < numSteps; i += 1) {
            const d = (1 / numSteps) * i
            // Because we calculate mod the length of the colors, the access
            // definitely succeeds.
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            gradient.addColorStop(d, colors[i % colors.length]!)
            if (d + 0.001 <= 1) {
                gradient.addColorStop(
                    d + 0.001,
                    // Because we calculate mod the length of the colors,
                    // the access definitely succeeds.
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    colors[(i + 1) % colors.length]!
                )
            }
        }

        return gradient
    }

    private fitToScreen() {
        const targetWidth = window.innerWidth
        const targetHeight = window.innerHeight

        if (this.canvas.width != targetWidth || this.canvas.height != targetHeight) {
            this.canvas.width = targetWidth
            this.canvas.height = targetHeight
            this.buildFillStyles()
        }
    }

    private redraw() {
        this.fitToScreen()

        this.context.fillStyle = 'white'
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height)

        if (this.multiverse.root.codeSize === 0) {
            return
        }

        const multiverse = this.multiverse

        const initialBarHeight = this.canvas.height - LINE_PADDING * 3 - 18
        const initialPixelsPerByte = initialBarHeight / this.multiverse.root.codeSize
        const initialTop = LINE_PADDING

        const top = initialTop + this.transform.y
        const pixelsPerByte = initialPixelsPerByte * this.transform.k

        const leftOfHierarchy = LINE_PADDING + LINE_WIDTH + LINE_PADDING

        this.drawTotal(top + pixelsPerByte * this.multiverse.root.codeSize + LINE_PADDING)

        this.infoAreas = []
        this.drawDiagram(multiverse.root, top, pixelsPerByte, leftOfHierarchy)
    }

    private drawTotal(top: number) {
        this.context.fillStyle = 'black'
        this.context.font = '11px sans-serif'

        this.context.fillText(
            `${formatBytes(this.multiverse.root.codeSize)} in total`,
            LINE_PADDING,
            top
        )

        if (this.multiverse.sources.length > 1) {
            const exclusiveSizes = this.exclusiveSizes.get(this.multiverse.root)!

            this.multiverse.sources.forEach((universe, index) => {
                const size = exclusiveSizes.get(`${index}`) ?? 0
                this.context.fillText(
                    `${formatBytes(size)} exclusively in ${universe.name}`,
                    LINE_PADDING,
                    top + 18 * (index + 1)
                )
            })
        }
    }

    private drawDiagram(node: Node, top: number, pixelsPerByte: number, leftOfHierarchy: number) {
        // At this height, entities explode into children.
        const EXPLOSION_THRESHOLD = 100

        const height = node.codeSize * pixelsPerByte

        if (!this.isVisible(top, height)) return

        // Show the hierarchy on the right.
        let leftOfSubHierarchy = leftOfHierarchy
        if (node.parent) {
            const widthOfBox = this.drawHierarchyBox(leftOfHierarchy, top, height, node)
            if (height > 2) {
                this.infoAreas.push({
                    x: leftOfHierarchy,
                    y: top,
                    height: height,
                    width: widthOfBox,
                    info: node
                })
            }
            leftOfSubHierarchy = leftOfHierarchy + widthOfBox + HIERARCHY_GAPS
        }

        const suitableChildren = node.children.filter((child) =>
            Filter.applyAll(this.filters, child)
        )

        const shouldExplode =
            suitableChildren.length == 1 ||
            (height >= EXPLOSION_THRESHOLD && suitableChildren.length > 0)
        if (shouldExplode) {
            let childOffsetFromTop = top
            for (const child of suitableChildren) {
                this.drawDiagram(child, childOffsetFromTop, pixelsPerByte, leftOfSubHierarchy)
                childOffsetFromTop += child.codeSize * pixelsPerByte
            }
        } else {
            let offsetFromLeft = LINE_PADDING
            // The exclusive sizes are calculated for all nodes.
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const exclusiveSizes = this.exclusiveSizes.get(node)!
            const totalSize = Array.from(exclusiveSizes.values()).reduce((a, b) => a + b, 0)

            for (const combination of this.combinations) {
                const size = exclusiveSizes.get(combination) ?? 0
                if (size === 0) continue
                const width = (LINE_WIDTH * size) / totalSize

                // Note: Floating point calculations are never accurate, so
                // `floor` and `ceil` are used to avoid the background
                // peeking through the gaps.

                // The fill styles are calculated for all nodes.
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                this.context.fillStyle = this.fillStyles.get(combination)!
                this.context.fillRect(offsetFromLeft, Math.floor(top), width, Math.ceil(height))

                if (height > 2) {
                    this.infoAreas.push({
                        x: offsetFromLeft,
                        y: top,
                        height: height,
                        width: width,
                        info: {
                            sources: combination,
                            size: size
                        }
                    })
                }

                offsetFromLeft += width
            }
        }
    }

    private isVisible(top: number, height: number): boolean {
        return top < this.canvas.height && top + height > 0
    }

    private drawHierarchyBox(left: number, top: number, height: number, node: Node): number {
        const FONT_SIZE = 11
        const TEXT_HORIZONTAL_PADDING = 8
        const TEXT_VERTICAL_PADDING = 2
        const DEFAULT_FILL_STYLE = '#cccccc'

        // The exclusive sizes are calculated for all nodes.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const containingCombinations = Array.from(this.exclusiveSizes.get(node)!.entries())
            .filter(([_, size]) => size > 0)
            .map(([combination, _]) => combination)

        const text = node.name
        this.context.font = `${FONT_SIZE}px sans-serif`
        const textWidth = this.context.measureText(text).width
        const boxWidth = textWidth + 2 * TEXT_HORIZONTAL_PADDING

        const isFaded = this.highlights.size > 0 && !this.highlights.has(node.identifier)
        const isBordered = this.selection.has(node.identifier)

        if (isBordered) {
            this.context.lineWidth = HIERARCHY_GAPS * 2
            this.context.strokeRect(left, top, boxWidth, height - HIERARCHY_GAPS)
            this.context.strokeStyle = 'black'
        }

        if (containingCombinations.length > 1) {
            this.context.fillStyle = isFaded
                ? lightenColor(DEFAULT_FILL_STYLE, 0.5)
                : DEFAULT_FILL_STYLE
        } else {
            const fillStyles = isFaded ? this.fadedOutFillStyles : this.fillStyles
            // The fill styles are calculated for all nodes.
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            this.context.fillStyle = fillStyles.get(containingCombinations[0])!
        }

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
