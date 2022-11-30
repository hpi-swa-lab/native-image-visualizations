import HierarchyNode from "./SharedInterfaces/HierarchyNode"

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
        parent: null,
        name: 'root',
        fullPath: '',
        children: []
    }

    hierarchyString.split('\n').forEach((row: string) => {

            let currentChildren: HierarchyNode[] = data.children
            let parent = data

            let splittedRow = row.split('.')
            splittedRow.forEach((pathSegment: string, index: number) => {
                let child = currentChildren.find((child: HierarchyNode) => child.name === pathSegment)

                if (!child) {
                    child = {
                        parent: parent,
                        name: pathSegment,
                        fullPath: splittedRow.slice(0, index + 1).join('.'),
                        children: []
                    }
                    currentChildren.push(child)
                }

                currentChildren = child.children
                parent = child
            })
    })

    return data
}

export function parseToCleanedPackageHierarchy(hierarchyString: string): HierarchyNode {
    const data: HierarchyNode = {
        parent: null,
        name: 'root',
        fullPath: '',
        children: []
    }

    hierarchyString.split('\n').forEach((row: string) => {
        if (!row.match(/[\$\.]\$/)) {
            row = row.replaceAll('$', '.')

            let currentChildren: HierarchyNode[] = data.children
            let parent = data

            let splittedRow = row.split('.')
            splittedRow.forEach((pathSegment: string, index: number) => {
                let child = currentChildren.find((child: HierarchyNode) => child.name === pathSegment)

                if (!child) {
                    child = {
                        parent: parent,
                        name: pathSegment,
                        fullPath: splittedRow.slice(0, index + 1).join('.'),
                        children: []
                    }
                    currentChildren.push(child)
                }

                currentChildren = child.children
                parent = child
            })
        }
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
