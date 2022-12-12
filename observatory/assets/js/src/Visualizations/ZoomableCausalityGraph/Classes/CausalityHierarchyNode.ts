import CausalityNode from '../Interfaces/CausalityNode'
import CausalityEdge from '../Interfaces/CausalityEdge'

export default class CausalityHierarchyNode implements CausalityNode {
    // data parameters

    flags: string
    id: number
    name: string
    parameters: string
    returnType: string
    type: string
    isEntryPoint: boolean
    directEdges: CausalityEdge[]
    virtualEdges: CausalityEdge[]
    parent: CausalityHierarchyNode | null
    children: CausalityHierarchyNode[]

    // visual parameters

    display: string
    x: number
    y: number
    radius: number
    color: string

    constructor(
        display: string = '',
        flags: string = '',
        id: number = -1,
        name: string = '',
        parameters: string = '',
        returnType: string = '',
        type: string = '',
        isEntryPoint: boolean = false,
        directEdges: CausalityEdge[] = [],
        virtualEdges: CausalityEdge[] = [],
        parent: CausalityHierarchyNode | null = null,
        children: CausalityHierarchyNode[] = [],
        x: number = 50,
        y: number = 50,
        radius: number = 5,
        color: string = 'hotpink'
    ) {
        this.display = display
        this.flags = flags
        this.id = id
        this.name = name
        this.parameters = parameters
        this.returnType = returnType
        this.type = type
        this.isEntryPoint = isEntryPoint
        this.directEdges = directEdges
        this.virtualEdges = virtualEdges
        this.parent = parent
        this.children = children
        this.x = x
        this.y = y
        this.radius = radius
        this.color = color
    }

    static fromCausalityNode(
        node: CausalityNode,
        parent: CausalityHierarchyNode | null = null,
        children: CausalityHierarchyNode[] = [],
        x: number = 50,
        y: number = 50,
        radius: number = 5,
        color: string = 'hotpink'
    ): CausalityHierarchyNode {
        return new CausalityHierarchyNode(
            node.display,
            node.flags,
            node.id,
            node.name,
            node.parameters,
            node.returnType,
            node.type,
            node.isEntryPoint,
            node.directEdges,
            node.virtualEdges,
            parent,
            children,
            x,
            y,
            radius,
            color
        )
    }

    static buildHierarchy(nodes: CausalityHierarchyNode[]): CausalityHierarchyNode {
        const root = new CausalityHierarchyNode()
        const nodesByFullPath: Record<string, CausalityHierarchyNode> = {}

        // reset hierarchy
        nodes.forEach((node: CausalityHierarchyNode) => {
            node.parent = null
            node.children = []
        })

        let count = nodes.length

        nodes.forEach((node: CausalityHierarchyNode) => {
            let parent = root
            let currentChildren = root.children

            const pathSegments: string[] = node.type.split('.')
            for (let i = 0; i < pathSegments.length; i++) {
                const pathSegment = pathSegments[i - 1]
                const pathToHere = pathSegments.slice(0, i + 1).join('.')

                let currentNode: CausalityHierarchyNode | undefined = nodesByFullPath[pathToHere]
                if (!currentNode) {
                    currentNode = new CausalityHierarchyNode(
                        pathToHere,
                        '',
                        count,
                        pathSegment,
                        '',
                        '',
                        '',
                        node.isEntryPoint,
                        [],
                        [],
                        parent,
                        []
                    )

                    nodesByFullPath[pathToHere] = currentNode
                    currentChildren.push(currentNode)
                    count++
                }

                currentChildren = currentNode.children
                parent = currentNode
            }

            node.parent = parent
            parent.children.push(node)
        })

        // if the root has only one child, this is probably the true root of the hierarchy
        // in that case we don't need the artificial root
        if (root.children.length === 1) {
            return root.children[0]
        }

        return root
    }
}
