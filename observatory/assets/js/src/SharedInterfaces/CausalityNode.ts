import CausalityEdge from "./CausalityEdge"

export default interface CausalityNode {
    display: string
    flags: string
    id: number
    name: string
    parameters: string
    returnType: string
    type: string
    isEntryPoint: boolean
    directEdges: CausalityEdge[]
    virtualEdges: CausalityEdge[]
}