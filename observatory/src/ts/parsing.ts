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
import { Leaf } from './UniverseTypes/Leaf'
import { InitKind } from './enums/InitKind'
import { INVALID_SIZE, Node } from './UniverseTypes/Node'
import JSZip from 'jszip'
import { CausalityGraphData } from './UniverseTypes/CausalityGraphUniverse'
import { causalityBinaryFileNames } from './Causality/CausalityGraphBinaryData'

interface Method {
    flags?: string[]
    size: Bytes
}

interface Methods {
    [methodName: string]: Method
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

interface Type {
    methods: Methods
    flags?: string[]
    'init-kind'?: string[]
}

interface Types {
    [typeName: string]: Type
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

    if (object.flags && !Array.isArray(object.flags)) {
        throw new InvalidReachabilityFormatError(
            '"flags" attribute is expected to be an array for type ' + name
        )
    }
}

interface Packages {
    [packageName: string]: { types: Types }
}

function validatePackageData(object: any, name: string): void {
    if (!object.types || object.types.constructor !== Object) {
        throw new InvalidReachabilityFormatError(
            'Missing "types" object attribute for package ' + name
        )
    }
}

interface TopLevelOrigin {
    path?: string
    module?: string
    flags?: ['system']
    packages: Packages
}

export type ReachabilityJson = [TopLevelOrigin]

function getNameForParsedTopLevelOrigin(object: any): string {
    let name = ''
    if (object.path && object.path.constructor === String) {
        name = object.path.split(/^.*[\\\/]/).pop()
    }
    if (object.module && object.module.constructor === String) name = object.module
    return name
}

function validateTopLevelOrigin(object: any): void {
    const name = getNameForParsedTopLevelOrigin(object)

    if (!object.packages || object.packages.constructor !== Object) {
        throw new InvalidReachabilityFormatError('Missing "packages" attribute for module ' + name)
    }

    if (object.flags && !Array.isArray(object.flags)) {
        throw new InvalidReachabilityFormatError(
            '"flags" attribute is expected to be an array for ' + name
        )
    }
}

export class InvalidReachabilityFormatError extends Error {
    constructor(message: string) {
        super('Invalid Reachability Format: ' + message)

        Object.setPrototypeOf(this, InvalidReachabilityFormatError.prototype)
    }
}

export async function loadCgZip(file: File): Promise<CausalityGraphData> {
    const zip = await new JSZip().loadAsync(file)

    function getZipEntry(path: string) {
        const entry = zip.files[path]
        if (!entry) throw new Error(`Missing zip entry: ${path}`)
        return entry
    }

    const reachabilityData = (await loadJson(
        await getZipEntry('reachability.json').async('blob')
    )) as ReachabilityJson

    const cgData = {
        reachabilityData: reachabilityData,
        nodeLabels: (await getZipEntry('methods.txt').async('string')).split('\n').slice(0, -1),
        typeLabels: (await getZipEntry('types.txt').async('string')).split('\n').slice(0, -1),

        // Only initializing this because the loop below cannot infer
        // that every of these properties will be set
        'typestates.bin': new Uint8Array(),
        'interflows.bin': new Uint8Array(),
        'direct_invokes.bin': new Uint8Array(),
        'typeflow_methods.bin': new Uint8Array(),
        'typeflow_filters.bin': new Uint8Array(),
        'hyper_edges.bin': new Uint8Array()
    }

    for (const path of causalityBinaryFileNames) {
        cgData[path] = await getZipEntry(path).async('uint8array')
    }

    return cgData
}

export async function loadJson(file: Blob): Promise<object> {
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
        ...parsedJSON.map((topLevelOrigin: TopLevelOrigin) => {
            validateTopLevelOrigin(topLevelOrigin)

            const hasSystemFlag =
                topLevelOrigin.flags && topLevelOrigin.flags.includes('system') ? true : false
            return new Node(
                getNameForParsedTopLevelOrigin(topLevelOrigin),
                parsePackages(topLevelOrigin.packages, hasSystemFlag),
                undefined,
                INVALID_SIZE,
                undefined,
                undefined,
                undefined,
                hasSystemFlag
            )
        })
    )
    return root
}

function parsePackages(packages: Packages, hasSystemFlag: boolean): Node[] {
    return Object.entries(packages).map(([packageName, packageData]) => {
        validatePackageData(packageData, packageName)
        return new Node(
            packageName,
            parseTypes(packageData.types, hasSystemFlag),
            undefined,
            INVALID_SIZE,
            undefined,
            undefined,
            undefined,
            hasSystemFlag
        )
    })
}

function parseTypes(types: Types, hasSystemFlag: boolean): Node[] {
    return Object.entries(types).map(([typeName, typeData]) => {
        validateTypeData(typeData, typeName)

        const initKinds = typeData['init-kind'] ? typeData['init-kind'] : []
        const flags = typeData.flags ? typeData.flags : []
        return new Node(
            typeName,
            parseMethods(typeData.methods, initKinds.map(parseInitKind), hasSystemFlag),
            undefined,
            INVALID_SIZE,
            flags.includes('reflection'),
            flags.includes('jni'),
            flags.includes('synthetic'),
            hasSystemFlag
        )
    })
}

function parseMethods(methods: Methods, initKinds: InitKind[], hasSystemFlag: boolean): Node[] {
    return Object.entries(methods).map(([methodName, methodData]) => {
        validateMethodData(methodData, methodName)

        const flags = methodData.flags ? methodData.flags : []
        return new Leaf(
            methodName,
            methodData.size,
            initKinds,
            flags.includes('reflection'),
            flags.includes('jni'),
            flags.includes('synthetic'),
            undefined,
            hasSystemFlag
        )
    })
}

function parseInitKind(initKind: string | undefined): InitKind {
    if (initKind === 'build-time') return InitKind.BUILD_TIME
    if (initKind === 'run-time') return InitKind.RUN_TIME
    return InitKind.NO_CLASS_CONSTRUCTOR
}
