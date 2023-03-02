import { Node } from './Node'
import { Universe } from './Universe'
import { UniverseIndex } from '../SharedTypes/Indices'

export class CausalityGraphUniverse extends Universe {
    public causalityData

    constructor(name: string, root: Node, causalityData) {
        super(name, root)
        this.causalityData = causalityData
    }
}
