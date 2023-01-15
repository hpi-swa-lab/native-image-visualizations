import HierarchyBubbles from './Visualizations/HierarchyBubbles'
import VennVisualization from './Visualizations/venn/VennVisualization'
import { TreeLineVisualization } from './Visualizations/TreeLineVisualization'
import SankeyTreeVisualization from './Visualizations/tree/SankeyTreeVisualization'
import BubbleTreeVisualization from './Visualizations/tree/BubbleTreeVisualization'
import {
    loadBuildReport, loadBuildReportFromString,
    loadTextFile,
    parseBuildReportToNodeWithSizeHierarchy
} from './BuildReportsParser'
import * as d3 from 'd3'
import {parseUsedMethods, withSizes} from "./parser";
import FileInput, {FileInputContainer} from "./Components/FileInput";

export function appendFileInput(visualizationCallback: Function, browsingDisabled: boolean = false): FileInputContainer {
    return new FileInput().create(visualizationCallback, browsingDisabled)
}

export async function generateHierarchyBubbles(file: File|null|undefined): Promise<HierarchyBubbles> {
    console.log(file)
    let text: string
    if (!file) {
        // TODO remove later when not needed
        const filePath = '../assets/data/method_histogram_micronaut.txt'
        text = await d3.text(filePath)
        console.log("fetched hard-coded file")
    } else {
        text = await loadTextFile(file)
    }
    const reportData = await loadBuildReportFromString(text)
    const hierarchy = parseBuildReportToNodeWithSizeHierarchy(reportData, true)

    const visualization = new HierarchyBubbles(hierarchy)
    visualization.generate()

    return visualization
}

export function generateVenn() {
    let venn = new VennVisualization()
    venn.generate()
}

export async function generateTreeLine() {
    let universes = new Map()
    for (const example of ['micronautguide-empty', 'micronautguide-conference']) {
        const text = await d3.text(`../assets/data/used_methods_${example}.txt`)
        universes.set(example, withSizes(parseUsedMethods(text)))
    }

    console.log('Creating tree line visualization')
    let tree = new TreeLineVisualization(
        universes,
        new Map(
            Object.entries({
                // 'helloworld': '#f28e2c',
                'micronautguide-empty': '#1b9e77',
                // 'micronaut': '#ffdd00',
                'micronautguide-conference': '#72286f'
            })
        )
    )
    console.log('Generating visualization')
    tree.generate()
}

export async function generateBubbleTree(fileList: FileList) {
    let texts: string[]
    let universeNames: string[]
    if (fileList.length < 2) {
        // TODO remove later when not needed
        [texts, universeNames] = await getLocalTreeTexts()
    } else {
        const files = Array.from(fileList)
        texts = await Promise.all(files.map((file) => loadTextFile(file)))
        universeNames = getUniverseNames(files)
    }

    let tree = new BubbleTreeVisualization(texts, universeNames)
    tree.generate()
}

export async function generateSankeyTree(fileList: FileList) {
    let texts: string[]
    let universeNames: string[]
    if (fileList.length < 2) {
        // TODO remove later when not needed
        [texts, universeNames] = await getLocalTreeTexts()
    } else {
        const files = Array.from(fileList)
        texts = await Promise.all(files.map((file) => loadTextFile(file)))
        universeNames = getUniverseNames(files)
    }

    let sankeyTree = new SankeyTreeVisualization(texts, universeNames)
    sankeyTree.generate()
}

async function getLocalTreeTexts(): Promise<[string[], string[]]>{
    console.log('fetch')
    const filePaths = [
        '../assets/data/used_methods_micronautguide-empty.txt',
        '../assets/data/used_methods_micronautguide-conference.txt'
        // '../assets/data/used_methods_micronautguide.txt',
        // '../assets/data/used_methods_helloworld.txt'
    ]

    console.log('filePaths')
    const texts: string[] = await Promise.all(filePaths.map((file) => d3.text(file)))
    console.log('texts')
    let universeNames: string[] = filePaths.map((path) => {
        const pathSegments = path.split('/')
        const nameSegments = pathSegments[pathSegments.length - 1].split('_')
        return nameSegments[nameSegments.length - 1].split('.')[0]
    })

    return [texts, universeNames]
}

function getUniverseNames(files: File[]) {
    return files.map((file) => {
        const nameSegments = file.name.split('_')
        return nameSegments[nameSegments.length - 1].split('.')[0]
    })
}

export async function testBuildReportParser(file: File) {
    const reportData = await loadBuildReport(file)
    console.log('Report data: ', reportData)

    const parsedHierarchy = parseBuildReportToNodeWithSizeHierarchy(reportData)
    console.log('Parsed hierarchy: ', parsedHierarchy)
}
