import HierarchyNode from './SharedInterfaces/HierarchyNode'
import { parse } from 'papaparse'

export function loadTextFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = (event) => {
            if (event.target == null) {
                reject('No target given')
            } else if (event.target.result == null) {
                reject('No target result given')
            } else {
                resolve(event.target.result.toString())
            }
        }
        reader.onerror = (event) => reject(event)

        reader.readAsText(file)
    })
}

export function loadCSVFile(file: File): Promise<unknown[]> {
    return new Promise((resolve, reject) => {
        parse(file, {
            worker: true,
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (result, file) => {
                resolve(result.data)
            },
            error: (error, file) => {
                reject(error)
            }
        })
    })
}

export function parseToPackageHierarchy(hierarchyString: string): HierarchyNode {
    const data: HierarchyNode = {
        id: 0,
        parent: null,
        name: 'root',
        fullPath: '',
        children: [],
        subTreeSize: 0
    }

    let counter: number = 1

    hierarchyString.split('\n').forEach((row: string) => {
        let currentChildren: HierarchyNode[] = data.children
        let parent = data

        let splittedRow = row.split('.')
        splittedRow.forEach((pathSegment: string, index: number) => {
            let child = currentChildren.find((child: HierarchyNode) => child.name === pathSegment)

            if (!child) {
                child = {
                    id: counter,
                    parent: parent,
                    name: pathSegment,
                    fullPath: splittedRow.slice(0, index + 1).join('.'),
                    children: [],
                    subTreeSize: 0
                }
                currentChildren.push(child)
                counter++
            }

            currentChildren = child.children
            parent = child
        })
    })

    _addSubTreeSizes(data)

    return data
}

function filterOutGeneratedCode(rows: string[]): string[] {
    // filters out any row that includes the substrings '.$' or '$$'
    // as these are elements generated by graal which we don't need for this visualization
    return rows.filter((row: string) => !row.match(/[\$\.]\$/))
}

function parseSubclassesToPackageNames(rows: string[]): string[] {
    // Classes within classes are denoted with a '$' but we want to handle them
    // just like the rest of the package hierarchy
    return rows.map((row: string) => row.replaceAll('$', '.'))
}

function getNodesById(methods: Record<string, any>[]): Record<number, Record<string, any>> {
    const result: Record<number, Record<string, any>> = {}

    methods.forEach((method: Record<string, any>) => {
        result[method.Id] = method
    })

    return result
}

export function parseToCausalityGraph(
    entryPoints: Record<string, any>[],
    methods: Record<string, any>[],
    directEdges: Record<string, any>[],
    virtualEdges: Record<string, any>[]
) {
    const nodesById = getNodesById(methods)

    entryPoints.forEach((entryPoint: Record<string, number>) => {
        nodesById[entryPoint.Id]['IsEntryPoint'] = true
    })

    directEdges.forEach((directEdge: Record<string, any>) => {
        const source = nodesById[directEdge.StartId]

        if (!source.directEdges) {
            source.directEdges = []
        }

        source.directEdges.push({
            Target: directEdge.EndId,
            BytecodeIndexes: directEdge.BytecodeIndexes
        })
    })

    virtualEdges.forEach((virtualEdge: Record<string, any>) => {
        const source = nodesById[virtualEdge.StartId]

        if (!source.virtualEdges) {
            source.virtualEdges = []
        }

        source.virtualEdges.push({
            Target: virtualEdge.EndId,
            BytecodeIndexes: virtualEdge.BytecodeIndexes
        })
    })

    return nodesById
}

export function parseToCleanedPackageHierarchy(hierarchyString: string): HierarchyNode {
    const data: HierarchyNode = {
        id: 0,
        parent: null,
        name: 'root',
        fullPath: '',
        children: [],
        subTreeSize: 0
    }

    let counter: number = 1

    let rows = hierarchyString.split('\n')
    rows = filterOutGeneratedCode(rows)
    rows = parseSubclassesToPackageNames(rows)

    rows.forEach((row: string) => {
        let currentChildren: HierarchyNode[] = data.children
        let parent = data

        let splittedRow = row.split('.')
        splittedRow.forEach((pathSegment: string, index: number) => {
            let child = currentChildren.find((child: HierarchyNode) => child.name === pathSegment)

            if (!child) {
                child = {
                    id: counter,
                    parent: parent,
                    name: pathSegment,
                    fullPath: splittedRow.slice(0, index + 1).join('.'),
                    children: [],
                    subTreeSize: 0
                }
                currentChildren.push(child)
                counter++
            }

            currentChildren = child.children
            parent = child
        })
    })

    _addSubTreeSizes(data)
    console.log(data)

    return data
}

function _addSubTreeSizes(startingPoint: HierarchyNode): void {
    if (startingPoint.children.length === 0) {
        startingPoint.subTreeSize = 0
    } else {
        startingPoint.children.forEach((child) => {
            _addSubTreeSizes(child)
        })

        startingPoint.subTreeSize = startingPoint.children.reduce(
            (sum: number, child: HierarchyNode) => sum + child.subTreeSize,
            1
        )
    }
}

export function extractLastHierarchyLevel(hierarchyString: string): string[] {
    const lastLevels: string[] = []

    hierarchyString.split('\n').forEach((row: string) => {
        if (!row.match(/[\$\.]\$/)) {
            row = row.replaceAll('$', '.')

            const splitRow: string[] = row.split('.')
            const lastLevel: string = splitRow[splitRow.length - 1]

            lastLevels.push(lastLevel)
        }
    })

    return lastLevels
}
