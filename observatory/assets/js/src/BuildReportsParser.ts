import HierarchyNode from './SharedInterfaces/HierarchyNode'
import { ParseResult, parse } from 'papaparse'
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

/**
 * 
 * Interprets the given file object as a csv file and uses parses it using papaparse.
 * The following parameters of papaparse are set:
 * 
 *      worker: true
 *      header: true
 *      dynamicTypeing: true
 *      skipEmptyLines: true
 * 
 * @param {File} file: the input file to parse
 * @returns {Promise<unknown[]>} a promise which contains the parsed data if resolved
 */
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

/**
 * 
 * Interprets the given file as a build report and parses the relevant data.
 * A build report can be collected by using the build option `-H:+PrintMethodHistogram`. 
 * It is then printed on the command line. After piping it to a file, this file can be inputted here.
 * 
 * @param {File} file: the input file to parse 
 * @returns {Promise<Record<string, any>[]>} a promise which contains the parsed data if resolved
 */
export function loadBuildReport(file: File): Promise<Record<string, any>[]> {
    return new Promise(async (resolve, reject) => {
        let rawText: string = await loadTextFile(file)

        const header =
            'Code Size; Nodes Parsing; Nodes Before; Nodes After; Is Trivial; Deopt Target; Code Size; Nodes Parsing; Nodes Before; Nodes After; Deopt Entries; Deopt During Call; Entry Points; Direct Calls; Virtual Calls; Method'
        const firstLineOutsideData = 'Size all methods'

        rawText = rawText.slice(rawText.indexOf(header), rawText.indexOf(firstLineOutsideData))

        rawText = rawText.replaceAll(' ', '')

        const data = parse(rawText, { header: false, skipEmptyLines: true, dynamicTyping: true })

        if (data.errors.length > 0) {
            reject(data.errors)
        } else {
            const parsed_data = data.data

            const tableHeader = parsed_data[0] as string[]
            const body = parsed_data.slice(1)

            const result: Record<string, any>[] = []

            body.forEach((entry: any[]) => {
                const resultEntry: Record<string, any> = {}

                const indicesWithoutAnyConversion = [0, 1, 2, 3, 12, 13, 14, 15]
                const indicesWithBooleanConversion = [4]

                indicesWithoutAnyConversion.forEach((index) => {
                    resultEntry[tableHeader[index]] = entry[index]
                })

                indicesWithBooleanConversion.forEach((index) => {
                    resultEntry[tableHeader[index]] = Boolean(entry[index])
                })

                result.push(resultEntry)
            })

            resolve(result)
        }
    })
}

/**
 * @param {Record<string, any>[]} buildReportData: A list of dictionaries. Each dictionary represents one line of the build reports.
 * The entries are expected to follow this schema:
 *
 * ```json
 * 
 * { 
 *     "CodeSize": {
 *          "description": "The method's withing the generated binary. Packages are separated with dots, inner classes with a dollar sign and the Method then again with a dot",
 *          "type": "int"
 *      }, 
 *      "Method": {
 *          "description": "The method's full qualifier",
 *          "type": "string"
 *      }, 
 * }
 * 
 * ```
 * 
 * @returns {NodeWithSize} An artificially created root node under which the package hierarchy is appended. The children of the root node are the top-level packages
 */
export function parseBuildReportToNodeWithSizeHierarchy(
    buildReportData: Record<string, any>[]
): NodeWithSize {
    const root: NodeWithSize = {
        name: 'root',
        type: NodeType.Package,
        children: [] as NodeWithSize[],
        size: 0
    }

    let currentChildren: NodeWithSize[]
    let parent: NodeWithSize

    buildReportData.forEach((report: Record<string, any>) => {
        currentChildren = root.children
        parent = root

        const packageList: string[] = _getPackageList(report.Method)
        const classList: string[] = _getClassList(report.Method)
        const method: string = _getMethodName(report.Method)

        packageList.forEach((packageName: string) => {
            let packageNode: NodeWithSize = currentChildren.find(
                (node: NodeWithSize) => node.name === packageName
            )

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
            let classNode: NodeWithSize = currentChildren.find(
                (node: NodeWithSize) => node.name === className
            )

            if (!classNode) {
                classNode = {
                    name: className,
                    type: NodeType.Class,
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
                size: report.CodeSize ? report.CodeSize : 0
            }

            currentChildren.push(methodNode)
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
    }

    // remove everything from the last dot on aka the first class
    name = name.replace(/(\.[^.]*)$/, '')

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
