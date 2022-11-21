import * as d3 from 'https://cdn.skypack.dev/d3@7'
import {
    forceSimulation,
    forceLink,
    forceManyBody,
    forceCollide
} from 'https://cdn.skypack.dev/d3-force@3'

async function constructCausalityHierarchyGraph(
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

function load_csv_file(file) {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            complete: (results) => resolve(results),
            error: (err) => reject(err)
        })
    })
}

function constructGraph(entryPoints, methods, directEdges, virtualEdges) {}

const entryPointsInput = document.getElementById('input-file-entry-points')
const methodsInput = document.getElementById('input-file-methods')
const directEdgesInput = document.getElementById('input-file-direct-edges')
const virtualEdgesInput = document.getElementById('input-file-virtual-edges')

const buttonConfirm = document.getElementById('buttonConfirm')

buttonConfirm.addEventListener('click', async () => {
    const errorMessages = []

    if (!entryPointsInput.files.length > 0) {
        errorMessages.push('No entry points file given')
    }
    if (!methodsInput.files.length > 0) {
        errorMessages.push('No methods file given')
    }
    if (!directEdgesInput.files.length > 0) {
        errorMessages.push('No direct edges file given')
    }
    if (!virtualEdgesInput.files.length > 0) {
        errorMessages.push('No virtual edges file given')
    }

    if (errorMessages.length > 0) {
        let alertMessage = ''
        errorMessages.forEach((message) => (alertMessage += `${message}\n\n`))
        alert(alertMessage)

        return
    }

    const graph = await csvParser.constructCausalityHierarchyGraph(
        entryPointsInput.files[0],
        methodsInput.files[0],
        directEdgesInput.files[0],
        virtualEdgesInput.files[0]
    )

    console.log(graph)
})
