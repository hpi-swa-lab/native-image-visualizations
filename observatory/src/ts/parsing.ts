/* eslint-disable guard-for-in */
/* Reason for exclulde: In the json file, the name
of packages, fields, methods etc is a json attribute.
We iterate through each of them and access the
parents field at the names, which eslint falsly recognizes
as an attribute which may not exist*/
import { Bytes } from './SharedTypes/Size'
import { Leaf, InitKind } from './UniverseTypes/Leaf'
import { Universe } from './UniverseTypes/Universe'
import { Node } from './UniverseTypes/Node'

interface Methods {
    [methodName: string]: { size: Bytes; flags?: string[] }
}

interface Fields {
    [fieldName: string]: { flags?: string[] }
}

interface Types {
    [typeName: string]: { methods: Methods; fields: Fields; 'init-kind'?: string[] }
}

interface Packages {
    [packageName: string]: { types: Types }
}

interface TopLevelOrigin {
    // Either path or module is set in the serialized data
    path?: string
    module?: string

    packages: Packages
}

type JSONScheme = Array<TopLevelOrigin>

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

export async function loadJson(file: File): Promise<JSONScheme> {
    return new Promise<JSONScheme>((resolve, reject) => {
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

export function parseReachabilityExport(reachabilityExport: JSONScheme, imageName: string): Node {
    const root = new Node(imageName)

    root.push(
        ...reachabilityExport.map((topLevelOrigin: TopLevelOrigin) => {
            let name = ''
            if (topLevelOrigin.path) name = topLevelOrigin.path
            if (topLevelOrigin.module) name = topLevelOrigin.module

            return new Node(name, parsePackages(topLevelOrigin.packages))
        })
    )
    return root
}

function parsePackages(packages: Packages): Node[] {
    return Object.entries(packages).map(
        ([packageName, packageData]) => new Node(packageName, parseTypes(packageData.types))
    )
}

function parseTypes(types: Types): Node[] {
    return Object.entries(types).map(([typeName, typeData]) => {
        const initKinds = typeData['init-kind'] ? typeData['init-kind'] : []
        return new Node(typeName, parseMethods(typeData.methods, initKinds.map(parseInitKind)))
    })
}

function parseMethods(methods: Methods, initKinds: InitKind[]): Node[] {
    return Object.entries(methods).map(([methodName, methodData]) => {
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
