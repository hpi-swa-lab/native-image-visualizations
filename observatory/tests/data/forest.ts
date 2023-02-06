import { Node } from '../../src/ts/UniverseTypes/Node'
import { Leaf, InitKind } from '../../src/ts/UniverseTypes/Leaf'
import { Universe } from '../../src/ts/UniverseTypes/Universe'

export function universeFactory(): Record<string, Universe> {
    return {
        childlessRoot: {
            name: 'childlessRoot',
            root: new Node('Native Image')
        },
        method: { name: 'method', root: new Leaf('method', 10, InitKind.BUILD_TIME) },
        simpleTree: {
            name: 'simpleTree',
            root: new Node('Class', [
                new Leaf('methodA', 10, InitKind.BUILD_TIME),
                new Leaf('methodB', 7, InitKind.BUILD_TIME),
                new Leaf('methodC', 5, InitKind.RERUN),
                new Leaf('methodD', 20, InitKind.BUILD_TIME),
                new Leaf('methodE', 0, InitKind.BUILD_TIME),
                new Leaf('methodF', 10, InitKind.BUILD_TIME)
            ])
        },
        layeredTree: {
            name: 'layeredTree',
            root: new Node('module', [
                new Node('packageA', [
                    new Node('ClassAA', [new Leaf('methodAAA', 10, InitKind.BUILD_TIME)]),
                    new Node('ClassAB', [
                        new Leaf('methodABA', 7, InitKind.BUILD_TIME),
                        new Leaf('methodABB', 5, InitKind.RERUN)
                    ])
                ]),
                new Node('packageB', [
                    new Node('ClassBA', [
                        new Leaf('methodBAA', 20, InitKind.BUILD_TIME),
                        new Leaf('methodBAB', 0, InitKind.BUILD_TIME),
                        new Leaf('methodBAC', 10, InitKind.BUILD_TIME)
                    ])
                ])
            ])
        },
        overlappingTreeA: {
            name: 'overlappingTreeA',
            root: new Node('packageA', [
                new Node('ClassA', [new Node('methodAA')]),
                new Node('ClassB', [new Node('methodBA')])
            ])
        },
        overlappingTreeB: {
            name: 'overlappingTreeB',
            root: new Node('packageA', [
                new Node('ClassA', [new Node('methodAC')]),
                new Node('ClassC', [new Node('methodCA')])
            ])
        },
        overlappingTreeC: {
            name: 'overlappingTreeC',
            root: new Node('packageA', [new Node('ClassA'), new Node('ClassX'), new Node('ClassY')])
        },
        differentPackageTree: {
            name: 'differentPackageTree',
            root: new Node('packageB', [
                new Node('ClassA', [new Node('methodAA')]),
                new Node('ClassX', [new Node('methodXA')]),
                new Node('ClassY', [new Node('methodYA')])
            ])
        }
    }
}

export const universes = universeFactory()
