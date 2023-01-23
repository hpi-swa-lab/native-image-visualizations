import * as d3 from 'd3'
import { mergeUniverses, _sortAlphabetically } from '../mergeUniverses'
import MergedNodeWithSizes from '../SharedInterfaces/MergedNodeWithSizes'
import NodeWithSize from '../SharedInterfaces/NodeWithSize'
import { combinationFromNames, UniverseCombination, UniverseName } from '../SharedTypes/Universe'
import { powerSet } from '../utils'
import Visualization from './Visualization'

const mixAlpha = 0.4
const explosionThreshold = 100 // at this height, entities explode into children

const lineWidth = 256
const linePadding = 16

const fontSize = 16
const textHorizontalPadding = 8
const textVerticalPadding = 2
const hierarchyGaps = 2 // used between boxes of the hierarchy

export default class TreeLineVisualization implements Visualization {
    mergedUniverses: MergedNodeWithSizes
    combinations: UniverseCombination[]
    colors: Map<UniverseName, string>

    fillStyles: Map<UniverseCombination, string | CanvasGradient> = new Map()
    canvas: HTMLCanvasElement | null = null
    context: CanvasRenderingContext2D | null = null

    constructor(universes: Map<UniverseName, NodeWithSize>, colors: Map<UniverseName, string>) {
        this.mergedUniverses = mergeUniverses(universes)
        _sortAlphabetically(this.mergedUniverses)
        console.log(this.mergedUniverses)

        const names: UniverseName[] = Array.from(universes.keys())
        if (names.length == 1) {
            this.combinations = [names[0]]
        } else if (names.length == 2) {
            this.combinations = [`${names[0]}`, `${names[0]},${names[1]}`, `${names[1]}`]
        } else {
            this.combinations = []
            for (const combination of powerSet(names)) {
                if (combination.length > 0) {
                    this.combinations.push(combinationFromNames(combination))
                }
            }
        }

        this.colors = colors
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

        let initialBarHeight = this.canvas.height - linePadding * 2
        let initialPixelsPerByte = initialBarHeight / this.mergedUniverses.unionedSize
        let initialTop = linePadding

        const mergedUniverses = this.mergedUniverses
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

            const leftOfHierarchy = linePadding + lineWidth + linePadding

            this.drawDiagram(mergedUniverses, top, pixelsPerByte, [], leftOfHierarchy)
        }
        redraw(undefined)

        d3.select(this.canvas).call(d3.zoom().scaleExtent([1, 10000]).on('zoom', redraw))
        window.addEventListener('resize', redraw)
    }

    buildFillStyles() {
        if (!this.canvas || !this.context) {
            throw "Canvas doesn't exist yet."
        }

        const lightenedColors: Map<UniverseName, string> = new Map()
        this.colors.forEach((color, name) => {
            lightenedColors.set(name, lightenColor(color))
        })

        for (const combination of this.combinations) {
            console.log(`Creating fill style for ${combination}`)
            if (!combination.includes(',')) {
                this.fillStyles.set(combination, this.colors.get(combination)!)
                continue
            }

            const gradientColors = combination
                .split(',')
                .map((universe) => lightenedColors.get(universe))
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
        tree: MergedNodeWithSizes,
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
        const height = tree.unionedSize * pixelsPerByte

        if (top > this.canvas.height || top + height < 0) {
            return // Outside of the visible area.
        }

        // Show the hierarchy on the right.
        let leftOfSubHierarchy = undefined
        if (path.length == 0) {
            leftOfSubHierarchy = leftOfHierarchy
        } else {
            let containingCombinations = Array.from(tree.exclusiveSizes.entries())
                .filter((combinationAndSize) => combinationAndSize[1] > 0)
                .map((combinationAndSize) => combinationAndSize[0])

            const widthOfBox = this.drawHierarchyBox(
                leftOfHierarchy,
                top,
                height,
                path[path.length - 1],
                containingCombinations
            )
            leftOfSubHierarchy = leftOfHierarchy + widthOfBox + hierarchyGaps
        }

        const shouldExplode =
            tree.children.length == 1 || (height >= explosionThreshold && tree.children.length > 0)
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
                childOffsetFromTop += child.unionedSize * pixelsPerByte
            }
        } else {
            let offsetFromLeft = linePadding
            for (const combination of this.combinations) {
                const size = tree.exclusiveSizes.get(combination) ?? 0
                const width = (lineWidth * size) / tree.unionedSize

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

        this.context.font = `${fontSize}px sans-serif`

        const textWidth = this.context.measureText(text).width
        const boxWidth = textWidth + 2 * textHorizontalPadding

        this.context.fillStyle =
            containingCombinations.length == 1
                ? this.fillStyles.get(containingCombinations[0])!
                : '#cccccc'
        this.context.fillRect(left, top, boxWidth, height - hierarchyGaps)

        // console.log('todo')
        const visibleStart = top.clamp(0, this.canvas.height)
        const visibleEnd = (top + height).clamp(0, this.canvas.height)

        if (height >= fontSize + 2 * textVerticalPadding) {
            const textRadius = fontSize / 2
            const textCenterY = ((visibleStart + visibleEnd) / 2).clamp(
                top + textRadius + textVerticalPadding,
                top + height - textRadius - textVerticalPadding
            )

            this.context.fillStyle = 'black'
            this.context.textBaseline = 'middle'
            this.context.fillText(text, left + textHorizontalPadding, textCenterY)
        }

        return boxWidth
    }
}

function lightenColor(color: string): string {
    let r = parseInt(color.substring(1, 3), 16)
    let g = parseInt(color.substring(3, 5), 16)
    let b = parseInt(color.substring(5, 7), 16)

    const rr = Math.round(r * mixAlpha + 255 * (1 - mixAlpha))
    const gg = Math.round(g * mixAlpha + 255 * (1 - mixAlpha))
    const bb = Math.round(b * mixAlpha + 255 * (1 - mixAlpha))

    const rrr = rr.toString(16).length === 1 ? `0${rr.toString(16)}` : rr.toString(16)
    const ggg = gg.toString(16).length === 1 ? `0${gg.toString(16)}` : gg.toString(16)
    const bbb = bb.toString(16).length === 1 ? `0${bb.toString(16)}` : bb.toString(16)

    return `#${rrr}${ggg}${bbb}`
}

