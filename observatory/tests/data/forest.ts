import { Node } from '../../src/ts/UniverseTypes/Node'
import { Leaf } from '../../src/ts/UniverseTypes/Leaf'
import { InitKind } from '../../src/ts/enums/InitKind'

export const forestFactory = () => ({
    childlessRoot: new Node('Native Image'),
    method: new Leaf('method', 10, [InitKind.BUILD_TIME]),
    simpleTree: new Node('Class', [
        new Leaf('methodA', 10, [InitKind.BUILD_TIME]),
        new Leaf('methodB', 7, [InitKind.BUILD_TIME]),
        new Leaf('methodC', 5, [InitKind.RERUN]),
        new Leaf('methodD', 20, [InitKind.BUILD_TIME]),
        new Leaf('methodE', 0, [InitKind.BUILD_TIME]),
        new Leaf('methodF', 10, [InitKind.BUILD_TIME])
    ]),
    layeredTree: new Node('module', [
        new Node('packageA', [
            new Node('ClassAA', [new Leaf('methodAAA', 10, [InitKind.BUILD_TIME])]),
            new Node('ClassAB', [
                new Leaf('methodABA', 7, [InitKind.BUILD_TIME]),
                new Leaf('methodABB', 5, [InitKind.RERUN])
            ])
        ]),
        new Node('packageB', [
            new Node('ClassBA', [
                new Leaf('methodBAA', 20, [InitKind.BUILD_TIME]),
                new Leaf('methodBAB', 0, [InitKind.BUILD_TIME]),
                new Leaf('methodBAC', 10, [InitKind.BUILD_TIME])
            ])
        ])
    ]),
    duplicatedNames: new Node('anotherModule', [
        new Node('packageA', [
            new Node('ClassA', [new Leaf('methodA', 10, [InitKind.BUILD_TIME])]),
            new Node('ClassB', [
                new Leaf('methodA', 7, [InitKind.BUILD_TIME]),
                new Leaf('methodB', 5, [InitKind.RERUN])
            ])
        ]),
        new Node('packageB', [
            new Node('ClassB', [
                new Leaf('methodA', 20, [InitKind.BUILD_TIME]),
                new Leaf('methodB', 0, [InitKind.BUILD_TIME]),
                new Leaf('methodC', 10, [InitKind.BUILD_TIME])
            ])
        ])
    ]),
    overlappingTreeA: new Node('universe', [
        new Node('packageA', [
            new Node('ClassA', [new Leaf('methodAA', 1, [InitKind.BUILD_TIME])]),
            new Node('ClassB', [new Leaf('methodBA', 1, [InitKind.BUILD_TIME])])
        ])
    ]),
    overlappingTreeB: new Node('universe', [
        new Node('packageA', [
            new Node('ClassA', [new Leaf('methodAC', 1, [InitKind.BUILD_TIME])]),
            new Node('ClassC', [new Leaf('methodCA', 1, [InitKind.BUILD_TIME])])
        ])
    ]),
    overlappingTreeC: new Node('universe', [
        new Node('packageA', [new Node('ClassA'), new Node('ClassX'), new Node('ClassY')])
    ]),
    differentPackageTree: new Node('universe', [
        new Node('packageB', [
            new Node('ClassA', [new Leaf('methodAA', 1, [InitKind.BUILD_TIME])]),
            new Node('ClassX', [new Leaf('methodXA', 1, [InitKind.BUILD_TIME])]),
            new Node('ClassY', [new Leaf('methodYA', 1, [InitKind.BUILD_TIME])])
        ])
    ]),
    overlappingImageA: new Node('universe', [
        new Node('packageA', [
            new Node('ClassA', [new Leaf('methodAA', 10, [InitKind.BUILD_TIME])]),
            new Node('ClassB', [new Leaf('methodBA', 10, [InitKind.BUILD_TIME])])
        ])
    ]),
    overlappingImageB: new Node('universe', [
        new Node('packageA', [
            new Node('ClassA', [new Leaf('methodAC', 15, [InitKind.BUILD_TIME])]),
            new Node('ClassC', [new Leaf('methodCA', 20, [InitKind.BUILD_TIME])])
        ])
    ]),
    overlappingImageC: new Node('universe', [
        new Node('packageA', [
            new Node('ClassA', [new Leaf('methodAC', 15, [InitKind.BUILD_TIME])]),
            new Node('ClassX', [new Leaf('methodXA', 30, [InitKind.BUILD_TIME])]),
            new Node('ClassY', [new Leaf('methodYA', 200, [InitKind.BUILD_TIME])])
        ])
    ])
})

export const forest = forestFactory()
