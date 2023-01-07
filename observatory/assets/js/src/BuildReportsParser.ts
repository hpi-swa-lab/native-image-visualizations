import HierarchyNode from './SharedInterfaces/HierarchyNode'
import { parse } from 'papaparse'
import { NodeType } from './SharedInterfaces/Node'
import HierarchyNodeWithSize from './SharedInterfaces/HierarchyNodeWithSize'
import { json } from 'd3'

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
 *      dynamicTyping: true
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
            const parsedData = data.data

            const tableHeader = parsedData[0] as string[]
            const body = parsedData.slice(1)

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

export function parseToPackageHierarchy(hierarchyString: string, clean: boolean = false): HierarchyNode {
    const data: HierarchyNode = {
        id: 0,
        parent: null,
        name: 'root',
        fullPath: '',
        children: [],
        subTreeSize: 0,
        type: NodeType.RootNode
    }

    let currentChildren: HierarchyNode[] = data.children
    let parent = data
    let counter: number = 1

    let methodIds = hierarchyString.split('\n')
    
    if (clean) {
        methodIds = methodIds.filter((methodId: string) => !methodId.match(/[\$\.]\$/))
    }

    methodIds.forEach((methodId: string) => {
        currentChildren = data.children
        parent = data

        const packageList: string[] = _getPackageList(methodId)
        const classList: string[] = _getClassList(methodId)
        const method: string = _getMethodName(methodId)

        packageList.forEach((packageName: string, index: number) => {
            let packageNode: HierarchyNode | undefined = currentChildren.find((node: HierarchyNode) => node.name === packageName)

            if (!packageNode) {
                packageNode = {
                    id: counter++,
                    parent: parent,
                    name: packageName,
                    fullPath: packageList.slice(0, index + 1).join('.'),
                    children: [],
                    subTreeSize: 0,
                    type: NodeType.Package,
                }

                currentChildren.push(packageNode)
            }

            currentChildren = packageNode.children
            parent = packageNode
        })

        classList.forEach((className: string, index: number) => {
            let classNode: HierarchyNode | undefined = currentChildren.find((node: HierarchyNode) => node.name === className)

            if (!classNode) {
                classNode = {
                    id: counter++,
                    parent: parent,
                    name: className,
                    fullPath: packageList.concat(classList.slice(0, index + 1)).join('.'),
                    children: [],
                    subTreeSize: 0,
                    type: NodeType.Class,
                }

                currentChildren.push(classNode)
            }

            currentChildren = classNode.children
            parent = classNode
        })

        let methodNode: HierarchyNode | undefined = currentChildren.find((node: HierarchyNode) => node.name === method)
        if (!methodNode) {
            methodNode = {
                id: 0,
                parent: null,
                name: method,
                fullPath: packageList.concat(classList).concat(method).join('.'),
                children: [],
                subTreeSize: 0,
                type: NodeType.Method,
            }

            currentChildren.push(methodNode)
        }
    })

    _addSubTreeSizes(data)

    return data
}

/**
 * @param {Record<string, any>[]} buildReportData: A list of dictionaries. Each dictionary represents one line of the build reports.
 * The entries are expected to follow this schema:
 *
 * ```json
 *
 * {
 *     "CodeSize": {
 *          "description": "The method's size within the generated binary. Packages are separated with dots, inner classes with a dollar sign, and the method then again with a dot",
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
 * @returns {HierarchyNodeWithSize} An artificially created root node under which the package hierarchy is appended. The children of the root node are the top-level packages
 */
export function parseBuildReportToNodeWithSizeHierarchy(
    buildReportData: Record<string, any>[]
): HierarchyNodeWithSize {
    const root: HierarchyNodeWithSize = {
        id: 0,
        parent: null,
        name: 'root',
        fullPath: '',
        children: [],
        size: 0,
        subTreeSize: 0,
        type: NodeType.RootNode,
    }

    let currentChildren: HierarchyNodeWithSize[]
    let parent: HierarchyNodeWithSize
    let counter = 1;

    buildReportData.forEach((report: Record<string, any>) => {
        currentChildren = root.children
        parent = root

        const packageList: string[] = _getPackageList(report.Method)
        const classList: string[] = _getClassList(report.Method)
        const method: string = _getMethodName(report.Method)

        packageList.forEach((packageName: string, index: number) => {
            let packageNode: HierarchyNodeWithSize = currentChildren.find(
                (node: HierarchyNodeWithSize) => node.name === packageName
            )

            if (!packageNode) {
                packageNode = {
                    id: counter++,
                    parent: parent,
                    name: packageName,
                    fullPath: packageList.slice(0, index + 1).join('.'),
                    children: [],
                    size: 0,
                    subTreeSize: 0,
                    type: NodeType.Package,
                }

                currentChildren.push(packageNode)
            }

            currentChildren = packageNode.children
            parent = packageNode
        })

        classList.forEach((className: string, index: number) => {
            let classNode: HierarchyNodeWithSize = currentChildren.find(
                (node: HierarchyNodeWithSize) => node.name === className
            )

            if (!classNode) {
                classNode = {
                    id: counter++,
                    parent: parent,
                    name: className,
                    fullPath: packageList.concat(classList.slice(0, index + 1)).join('.'),
                    children: [],
                    size: 0,
                    subTreeSize: 0,
                    type: NodeType.Class,
                }

                currentChildren.push(classNode)
            }

            currentChildren = classNode.children
            parent = classNode
        })

        let methodNode = currentChildren.find((node: HierarchyNodeWithSize) => node.name === method)
        if (!methodNode) {
            methodNode = {
                id: 0,
                parent: null,
                name: method,
                fullPath: packageList.concat(classList).concat(method).join('.'),
                children: [],
                size: report.CodeSize ? report.CodeSize : 0,
                subTreeSize: 0,
                type: NodeType.Method,
            }

            currentChildren.push(methodNode)
        }
    })

    _addSubTreeSizes(root)

    return root
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

function _getPackageList(name: string): string[] {
    name = _removeFunctionQualifier(name)

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
    let parameters: string = ''

    // check if it has two paranthesis aka the method parameters and return type
    if (path.match(/\(.*\).*$/)) {
        // remove everything after the first ) on aka the return type.
        path = path.replace(/[^)]*$/, '')
        
        // match everything from the first ( on, the method parameters
        const parametersMatch: RegExpMatchArray = path.match(/\(.*$/)
        if (parametersMatch.length > 1) {
            console.warn(`Multiple parameter matches in path ${path}. Using only the first one`)
        }
        // store the parameters as we need them to distinguish function overloads
        parameters = parametersMatch[0]
        // remove parameters for now
        path = path.replace(parameters, '')
    }

    // remove everything before the last dot aka the packages, class and inner classes
    path = path.replace(/.*(?=\.)\./, '')

    return path + parameters
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

function _addSubTreeSizes(startingPoint: HierarchyNode): void {
    if (startingPoint.children.length === 0) {
        startingPoint.subTreeSize = 0
    } else {
        (startingPoint.children).forEach((child) => {
            _addSubTreeSizes(child)
        })

        startingPoint.subTreeSize = startingPoint.children.reduce(
            (sum: number, child: HierarchyNode) => sum + child.subTreeSize,
            1
        )
    }
}
