import HierarchyNode from './SharedInterfaces/HierarchyNode'
import { parse } from 'papaparse'
import { NodeWithSize } from './SharedTypes/NodeWithSize'
import { NodeType } from './SharedTypes/Node'

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

export function parseBuildReportToNodeWithSizeHierarchy(buildReport: Map<string, any>[]): NodeWithSize {
    const root: NodeWithSize = {
        name: 'root',
        type: NodeType.Package,
        children: [] as NodeWithSize[],
        size: 0
    }

    let currentChildren: NodeWithSize[]
    let parent: NodeWithSize

    buildReport.forEach((report: Map<string, any>) => {
        currentChildren = root.children
        parent = root

        const name = report.get('name')
        if (name) {
            const packageList: string[] = _getPackageList(name)
            const classList: string[] = _getClassList(name)
            const method: string = _getMethodName(name)

            packageList.forEach((packageName: string) => {
                let packageNode: NodeWithSize = currentChildren.find((node: NodeWithSize) => node.name === packageName)

                if (!packageNode) {
                    packageNode = {
                        name: packageName,
                        type: NodeType.Package,
                        children: [] as NodeWithSize[],
                        size: 0
                    }

                    currentChildren.push(packageNode)
                }

                currentChildren = packageNode.children
                parent = packageNode
            })

            classList.forEach((className: string) => {
                let classNode: NodeWithSize = currentChildren.find((node: NodeWithSize) => node.name === className)

                if (!classNode) {
                    classNode = {
                        name: className,
                        type: NodeType.Package,
                        children: [] as NodeWithSize[],
                        size: 0
                    }

                    currentChildren.push(classNode)
                }

                currentChildren = classNode.children
                parent = classNode
            })

            let methodNode = currentChildren.find((node: NodeWithSize) => node.name === method)
            if (!methodNode) {
                methodNode = {
                    name: method,
                    type: NodeType.Method,
                    children: [] as NodeWithSize[],
                    size: report.get('size')
                }

                currentChildren.push(methodNode)
            }
        }
    })

    return root
}

function _getPackageList(name: string): string[] {
    name = _removeFunctionQualifier(name)
    
    // check if it has a $ before the end, indicating an inner class
    if (name.match(/\$.*$/)) {
        // remove everything from the first $ on aka the inner classes
        name = name.replace(/\$.*$/, '')
        // remove everything from the first dot on aka the first class
        name = name.replace(/(\.[^.]*)$/, '')
    }

    return name.split('.')
}

function _getClassList(name: string): string[] {
    name = _removeFunctionQualifier(name)

    // check if it has a last dot before the end
    if (name.match(/.*(?=\.)\./)) {
        // remove everything before the last dot aka the package list
        name = name.replace(/.*(?=\.)\./, '')
    }

    return name.split('$')
}

function _getMethodName(path: string): string {
    // check if it has a ( before the end
    if (path.match(/\(.*$/)) {
        // remove everything from the first ( on aka the function parameters
        path = path.replace(/\(.*$/, '')
    }

    return path.replace(/.*(?=\.)\./, '')    
}

function _removeFunctionQualifier(path: string): string {
    // check if it has a ( before the end
    if (path.match(/\(.*$/)) {
        // remove everything from the first ( on aka the function parameters
        path = path.replace(/\(.*$/, '')
        // remove everything from the last dot on aka the function name
        path = path.replace(/(\.[^.]*)$/, '')
    }

    return path
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

    hierarchyString.split('\n').forEach((row: string) => {
        // filters out any row that includes the substrings '.$' or '$$' 
        // as these are elements generated by graal which we don't need for this visualization
        if (!row.match(/[\$\.]\$/)) {
            // Classes within classes are denoted with a '$' but we want to handle them 
            // just like the rest of the package hierarchy
            row = row.replaceAll('$', '.')

            let currentChildren: HierarchyNode[] = data.children
            let parent = data

            let splittedRow = row.split('.')
            splittedRow.forEach((pathSegment: string, index: number) => {
                let child = currentChildren.find(
                    (child: HierarchyNode) => child.name === pathSegment
                )

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
        }
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
