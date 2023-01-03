import * as d3 from 'd3'
import '../data'
import {
    combinationFromNames,
    MergedNodeWithSizes,
    NodeWithSize,
    UniverseCombination,
    UniverseName
} from '../data'
import { mergeUniverses, parseUsedMethods, sortAlphabetically, withSizes } from '../parser'

// async function loadUniverses() {
//     const texts = await Promise.all([
//         d3.text('used-methods-helloworld.txt'),
//         d3.text('used-methods-micronaut.txt'),
//         d3.text('used-methods-micronaut-no-log4j.txt')
//     ])
//     const parsed = texts.map(parseUsedMethods).map(withSizes)
//     let merged = mergeUniverses(
//         new Map(
//             Object.entries({
//                 // 'helloworld': parsed[0],
//                 micronaut: parsed[1],
//                 'no-log4j': parsed[2]
//             })
//         )
//     )
//     sortAlphabetically(merged)
//     return merged
// }
// const universes = await loadUniverses()
// console.debug('Universes:')
// console.debug(universes)

// Constants that determine how the visualization looks.

// const colors = new Map(
//     Object.entries({
//         helloworld: '#f28e2c',
//         micronaut: '#1b9e77',
//         // 'micronaut': '#ffdd00',
//         'no-log4j': '#72286f'
//     })
// )

const mixAlpha = 0.4
const explosionThreshold = 100 // at this height, entities explode into children

const lineWidth = 256
const linePadding = 16

const fontSize = 16
const textHorizontalPadding = 8
const textVerticalPadding = 2
const hierarchyGaps = 2 // used between boxes of the hierarchy

export async function createTreeLineVisualization() {
    let universes = new Map()
    for (const example of ['micronaut', 'no-log4j']) {
        const text = await d3.text(`used-methods-${example}.txt`)
        universes.set(example, withSizes(parseUsedMethods(text)))
    }

    let tree = new TreeLineVisualization(
        universes,
        new Map(
            Object.entries({
                // 'helloworld': '#f28e2c',
                micronaut: '#1b9e77',
                // 'micronaut': '#ffdd00',
                'no-log4j': '#72286f'
            })
        )
    )
    return tree
}

export class TreeLineVisualization implements Visualization {
    mergedUniverses: MergedNodeWithSizes
    combinations: UniverseCombination[]
    colors: Map<UniverseName, string>

    constructor(universes: Map<UniverseName, NodeWithSize>, colors: Map<UniverseName, string>) {
        this.mergedUniverses = mergeUniverses(universes)
        sortAlphabetically(this.mergedUniverses)

        const names: UniverseName[] = Array.from(universes.keys())
        if (names.length == 1) {
            this.combinations = [names[0]]
        } else if (names.length == 2) {
            this.combinations = [`${names[0]}`, `${names[0]},${names[1]}`, `${names[1]}`]
        } else {
            // From https://codereview.stackexchange.com/questions/139095/generate-powerset-in-js
            const powerset = (l: string[]) => {
                return (function ps(list): string[][] {
                    if (list.length === 0) {
                        return [[]]
                    }
                    var head = list.pop()
                    var tailPS = ps(list)
                    return tailPS.concat(
                        tailPS.map(function (e) {
                            return [head].concat(e)
                        })
                    )
                })(l.slice())
            }
            for (const combination of powerset(names)) {
                if (combination.length > 0) {
                    this.combinations.push(combinationFromNames(combination))
                }
            }
        }

        this.colors = colors
    }

    generate(): void {
        console.log('This will soon be a nice Tree')
        const canvas = document.createElement('canvas') as HTMLCanvasElement
        document.body.appendChild(canvas)
        const context = canvas.getContext('2d', { alpha: false })

        let fillStyles: Map<UniverseCombination, string | CanvasGradient> = new Map()
        const buildFillStyles = () => {
            const lightenedColors: Map<UniverseName, string> = new Map()
            for (const [name, color] of this.colors.entries()) {
                lightenedColors.set(name, lightenColor(color))
            }

            for (const combination of this.combinations) {
                if (!combination.includes(',')) {
                    fillStyles.set(combination, this.colors.get(combination))
                    continue
                }

                const gradientColors = combination
                    .split(',')
                    .map((universe) => lightenedColors.get(universe))
                const size = Math.max(canvas.width, canvas.height)
                const gradient = context.createLinearGradient(0, 0, size, size)
                const numSteps = Math.sqrt(2 * Math.pow(size, 2)) / 5

                for (let i = 0; i < numSteps; i += 1) {
                    const d = (1 / numSteps) * i
                    gradient.addColorStop(d, gradientColors[i % gradientColors.length])
                    if (d + 0.001 <= 1) {
                        gradient.addColorStop(
                            d + 0.001,
                            gradientColors[(i + 1) % gradientColors.length]
                        )
                    }
                }

                fillStyles.set(combination, gradient)
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

        function drawDiagram(
            tree: MergedNodeWithSizes,
            top: number,
            pixelsPerByte: number,
            path: string[],
            leftOfHierarchy: number
        ) {
            const height = tree.unionedSize * pixelsPerByte

            if (top > canvas.height || top + height < 0) {
                return // Outside of the visible area.
            }

            // Show the hierarchy on the right.
            let leftOfSubHierarchy = undefined
            if (path.length == 0) {
                leftOfSubHierarchy = leftOfHierarchy
            } else {
                let containingCombinations = Object.entries(tree.exclusiveSizes)
                    .filter((combinationAndSize) => combinationAndSize[1] > 0)
                    .map((combinationAndSize) => combinationAndSize[0])

                const widthOfBox = drawHierarchyBox(
                    leftOfHierarchy,
                    top,
                    height,
                    path[path.length - 1],
                    containingCombinations
                )
                leftOfSubHierarchy = leftOfHierarchy + widthOfBox + hierarchyGaps
            }

            const shouldExplode =
                tree.children.length == 1 ||
                (height >= explosionThreshold && tree.children.length > 0)
            if (shouldExplode) {
                let childOffsetFromTop = top
                for (const child of tree.children) {
                    let childPath = path.slice()
                    childPath.push(child.name)
                    drawDiagram(
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
                    context.fillStyle = this.colors.get(combination)
                    // Note: Floating point calculations are never accurate, so
                    // `floor` and `ceil` are used to avoid the background
                    // peeking through the gaps.
                    context.fillStyle = fillStyles.get(combination)
                    context.fillRect(offsetFromLeft, Math.floor(top), width, Math.ceil(height))

                    // context.fillRect(offsetFromLeft, Math.floor(top), width, Math.ceil(height))
                    offsetFromLeft += width
                }
            }
        }
        function drawHierarchyBox(
            left: number,
            top: number,
            height: number,
            text: string,
            containingCombinations: UniverseCombination[]
        ) {
            context.font = `${fontSize}px sans-serif`

            const textWidth = context.measureText(text).width
            const boxWidth = textWidth + 2 * textHorizontalPadding

            context.fillStyle =
                containingCombinations.length == 1
                    ? fillStyles.get(containingCombinations[0])
                    : '#cccccc'
            context.fillRect(left, top, boxWidth, height - hierarchyGaps)

            const visibleStart = top.clamp(0, canvas.height)
            const visibleEnd = (top + height).clamp(0, canvas.height)

            if (height >= fontSize + 2 * textVerticalPadding) {
                const textRadius = fontSize / 2
                const textCenterY = ((visibleStart + visibleEnd) / 2).clamp(
                    top + textRadius + textVerticalPadding,
                    top + height - textRadius - textVerticalPadding
                )

                context.fillStyle = 'black'
                context.textBaseline = 'middle'
                context.fillText(text, left + textHorizontalPadding, textCenterY)
            }

            return boxWidth
        }

        function fitToScreen() {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight - 5
            buildFillStyles()
        }
        fitToScreen()

        let initialBarHeight = canvas.height - linePadding * 2
        let initialPixelsPerByte = initialBarHeight / this.mergedUniverses.unionedSize
        let initialTop = linePadding

        function redraw(event: any | undefined) {
            const transform = event?.transform ?? { x: 0, y: 0, k: 1 }

            fitToScreen()

            context.fillStyle = 'white'
            context.fillRect(0, 0, canvas.width, canvas.height)

            const top = initialTop + transform.y
            const pixelsPerByte = initialPixelsPerByte * transform.k

            const leftOfHierarchy = linePadding + lineWidth + linePadding

            drawDiagram(this.mergedUniverses, top, pixelsPerByte, [], leftOfHierarchy)
        }
        redraw(undefined)

        d3.select(canvas).call(d3.zoom().scaleExtent([1, 10000]).on('zoom', redraw))
        window.addEventListener('resize', redraw)
    }
}

