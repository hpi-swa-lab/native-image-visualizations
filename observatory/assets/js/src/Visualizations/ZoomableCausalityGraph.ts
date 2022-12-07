import Visualization from './Visualization'
import * as d3 from 'd3'

export default class ZoomableCausalityGraph implements Visualization {
    entryPoints: Record<string, any>[]
    methods: Record<string, any>[]
    directEdges: Record<string, any>[]
    virtualEdges: Record<string, any>[]

    constructor(
        entryPoints: Record<string, any>[],
        methods: Record<string, any>[],
        directEdges: Record<string, any>[],
        virtualEdges: Record<string, any>[]
    ) {
        this.entryPoints = entryPoints
        this.methods = methods
        this.directEdges = directEdges
        this.virtualEdges = virtualEdges

        debugger
    }

    generate(): void {}
}

/*

Daten, die wir rein bekommen:

entryPoint: {
    Id: 0
}

method: {
    Display: 'c.q.l.c.L.toString',
    Flags: 'p',
    Id: 0,
    Name: "toString",
    Parameters: 'empty',
    Return: 'java.lang.string',
    Type: 'ch.qos,logback.classic.Level
}

directEdge: {
    BytecodeIndexes: '5->68',
    EndId: 10855,
    StartId: 36339
}

virtualEdge: {
    BytecodeIndexes: 303,
    EndId: 61908,
    StartId: 29465
}

*/
