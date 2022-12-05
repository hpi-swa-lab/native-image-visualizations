import { load_csv_file } from './csv_parser.js'

export async function constructCausalityHierarchyGraph(
    entryPointsFile,
    methodsFile,
    directEdgesFile,
    virtualEdgesFile
) {
    promises = [
        load_csv_file(entryPointsFile),
        load_csv_file(methodsFile),
        load_csv_file(directEdgesFile),
        load_csv_file(virtualEdgesFile)
    ]

    results = await Promise.all(promises)

    return constructGraph(results)
}

function constructGraph(entryPoints, methods, directEdges, virtualEdges) {}
