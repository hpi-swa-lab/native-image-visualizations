/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Reason for disable: The parsed object from the JSON file can have any properties.
 * Type unknown is not useful as explicit type checking cannot be done as
 * the JSONs are parsed at run time. Since we use dynamic properties,
 * a static type check with the types Methods, Type, etc., cannot be performed.
 * Even though any is used, the usages do explicitly check for properties before
 * accessing them.
 */
import { Bytes } from './SharedTypes/Size'
import { Leaf, InitKind } from './UniverseTypes/Leaf'
import { Universe } from './UniverseTypes/Universe'
import { Node } from './UniverseTypes/Node'

type Methods = {
    [methodName: string]: { size: Bytes; flags?: string[] }
}

function validateMethodData(object: any, name: string): void {
    // explicitly checking for undefined, as size = 0 should not throw error
    if (object.size === undefined || typeof object.size !== 'number') {
        throw new InvalidReachabilityFormatError(
            'Missing "size" number attribute for method ' + name
        )
    }

    if (object.flags && !Array.isArray(object.flags)) {
        throw new InvalidReachabilityFormatError(
            '"flags" attribute is expected to be an array for method ' + name
        )
    }
}

type Types = {
    [typeName: string]: { methods: Methods; 'init-kind'?: string[] }
}

function validateTypeData(object: any, name: string): void {
    if (!object.methods || object.methods.constructor !== Object) {
        throw new InvalidReachabilityFormatError(
            'Missing "methods" object attribute for type ' + name
        )
    }

    if (object['init-kind'] && !Array.isArray(object['init-kind'])) {
        throw new InvalidReachabilityFormatError(
            '"init-kind" attribute is expected to be an array for type ' + name
        )
    }
}

type Packages = {
    [packageName: string]: { types: Types }
}

function validatePackageData(object: any, name: string): void {
    if (!object.types || object.types.constructor !== Object) {
        throw new InvalidReachabilityFormatError(
            'Missing "types" object attribute for package ' + name
        )
    }
}

export type TopLevelOrigin =
    | {
          path: string
          module?: string

          packages: Packages
      }
    | {
          path?: string
          module: string

          packages: Packages
      }

function findNameForParsedTopLevelOrigin(object: any): string | undefined {
    let name = undefined
    if (object.path && object.path.constructor === String) name = object.path
    if (object.module && object.module.constructor === String) name = object.module
    return name
}

function validateTopLevelOrigin(object: any, index: number): void {
    const name = findNameForParsedTopLevelOrigin(object)

    if (!name) {
        throw new InvalidReachabilityFormatError(
            'Neither "name" or "module" string attribute found on item at index ' + index
        )
    }
    if (!object.packages || object.packages.constructor !== Object) {
        throw new InvalidReachabilityFormatError('Missing "packages" attribute for module ' + name)
    }
    object.name = name
}

export class InvalidReachabilityFormatError extends Error {
    constructor(msg: string) {
        super('Invalid Reachability Format: ' + msg)

        Object.setPrototypeOf(this, InvalidReachabilityFormatError.prototype)
    }
}

export function createConfigSelections(
    selections: Record<string, Node[]>
): Record<string, Record<string, unknown>> {
    const result: Record<string, Record<string, unknown>> = {}

    Object.keys(selections).forEach((name: string) => {
        const currentSelection: Node[] = selections[name]
        result[name] = createConfigSelection(name, currentSelection)
    })

    return result
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function createConfigSelection(name: string, nodes: Node[]): Record<string, unknown> {
    // TODO: implement this, corresponding issue: [#85](https://github.com/hpi-swa-lab/MPWS2022RH1/issues/85)
    return {}
}

export function createConfigUniverses(
    universes: Universe[]
): Record<string, Record<string, unknown>> {
    const result: Record<string, Record<string, unknown>> = {}

    universes.forEach((universe) => {
        result[universe.name] = createConfigUniverse(universe)
    })

    return result
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function createConfigUniverse(universe: Universe): Record<string, unknown> {
    // TODO: implement this, corresponding issue: [#85](https://github.com/hpi-swa-lab/MPWS2022RH1/issues/85v)
    return {}
}

export async function loadJson(file: File): Promise<object> {
    return new Promise<object>((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsText(file)
        reader.onload = () => {
            try {
                const json = JSON.parse(reader.result as string)
                resolve(json)
            } catch (e) {
                reject(e)
            }
        }
        reader.onerror = reject
    })
}

export function parseReachabilityExport(parsedJSON: any, universeName: string): Node {
    if (!Array.isArray(parsedJSON)) {
        throw new InvalidReachabilityFormatError('JSON should be an Array of modules at top level ')
    }

    const root = new Node(universeName)

    root.push(
        ...parsedJSON.map((topLevelOrigin: TopLevelOrigin, index: number) => {
            validateTopLevelOrigin(topLevelOrigin, index)

            return new Node(
                findNameForParsedTopLevelOrigin(topLevelOrigin) ?? '',
                parsePackages(topLevelOrigin.packages)
            )
        })
    )
    return root
}

function parsePackages(packages: Packages): Node[] {
    return Object.entries(packages).map(([packageName, packageData]) => {
        validatePackageData(packageData, packageName)
        return new Node(packageName, parseTypes(packageData.types))
    })
}

function parseTypes(types: Types): Node[] {
    return Object.entries(types).map(([typeName, typeData]) => {
        validateTypeData(typeData, typeName)

        const initKinds = typeData['init-kind'] ? typeData['init-kind'] : []
        return new Node(typeName, parseMethods(typeData.methods, initKinds.map(parseInitKind)))
    })
}

function parseMethods(methods: Methods, initKinds: InitKind[]): Node[] {
    return Object.entries(methods).map(([methodName, methodData]) => {
        validateMethodData(methodData, methodName)

        const flags = methodData.flags ? methodData.flags : []
        return new Leaf(
            methodName,
            methodData.size,
            initKinds,
            flags.includes('reflection'),
            flags.includes('jni'),
            flags.includes('synthetic')
        )
    })
}

function parseInitKind(initKind: string | undefined): InitKind {
    if (initKind === 'build-time') return InitKind.BUILD_TIME
    if (initKind === 'run-time') return InitKind.RUN_TIME
    return InitKind.NO_CLASS_CONSTRUCTOR
}
