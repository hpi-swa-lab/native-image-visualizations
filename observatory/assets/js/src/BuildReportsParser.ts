import HierarchyNode from "./interfaces/HierarchyNode"

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

export function parseToPackageHierarchy(hierarchyString: string): HierarchyNode {
    const data: HierarchyNode = {
        name: 'root',
        children: []
    }

    hierarchyString.split('\n').forEach((row: string) => {
        let currentChildren: HierarchyNode[] = data.children

        row.split('.').forEach((pathSegment: string) => {
            let child = currentChildren.find((child: HierarchyNode) => child.name === pathSegment)

            if (!child) {
                child = {
                    name: pathSegment,
                    children: []
                }
                currentChildren.push(child)
            }

            currentChildren = child.children
        })
    })

    return data
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
