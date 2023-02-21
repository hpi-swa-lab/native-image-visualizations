/* eslint-disable @typescript-eslint/no-explicit-any */
// Reason for disable: @see {@link '../src/ts/parsing'}
import { describe, expect, test } from '@jest/globals'
import {
    parseReachabilityExport,
    InvalidReachabilityFormatError,
    TopLevelOrigin
} from '../src/ts/parsing'
import { InitKind, Leaf } from '../src/ts/UniverseTypes/Leaf'
import { Node } from '../src/ts/UniverseTypes/Node'

describe('parsing', () => {
    describe('parseReachabilityExport', () => {
        /**
         * Many of the tests validate an error for when an attribute is missing,
         * or an attribute may be an invalid json type according to
         * https://json-schema.org/understanding-json-schema/reference/type.html.
         * Since our json scheme is parsed at run time, we can't use static type checks,
         * thus the many type checks to ensure correct behavior in an error case,
         * which may seem redundant.
         */
        describe('error thrown on invalid format', () => {
            let expectedJSONObject: Array<TopLevelOrigin>
            let brokenJSON: any
            beforeEach(() => {
                expectedJSONObject = [
                    {
                        module: 'Module',
                        packages: {
                            somePackage: {
                                types: {
                                    SomeClass: {
                                        methods: { '<init>()': { size: 0 } }
                                    }
                                }
                            }
                        }
                    }
                ]
                brokenJSON = expectedJSONObject as any
            })

            function expectThrow(object: any) {
                expect(() => {
                    parseReachabilityExport(object, 'universe')
                }).toThrow(InvalidReachabilityFormatError)
            }

            test('throws error for empty json', () => {
                expectThrow({})
            })

            test('throws error when not array on top level', () => {
                const json = {
                    name: 'John Smith',
                    age: 35,
                    email: 'john.smith@example.com',
                    phone: '555-1234'
                }

                expectThrow(json)
            })

            test('throws error when no packages attribute', () => {
                brokenJSON[0].packages = undefined

                expectThrow(brokenJSON)
            })

            test('throws error when packages is an array', () => {
                brokenJSON[0].packages = [
                    {
                        types: {
                            Class: {
                                methods: { '<init>()': { size: 0 } },
                                fields: {}
                            }
                        }
                    }
                ]

                expectThrow(brokenJSON)
            })

            test('throws error when packages is a number', () => {
                brokenJSON[0].packages = 4

                expectThrow(brokenJSON)
            })

            test('throws error when packages is a string', () => {
                brokenJSON[0].packages = 'I should be an object type'

                expectThrow(brokenJSON)
            })

            test('throws error when packages is a boolean', () => {
                brokenJSON[0].packages = false

                expectThrow(brokenJSON)
            })

            test('throws error when packages is null', () => {
                brokenJSON[0].packages = null

                expectThrow(brokenJSON)
            })

            test('throws error when package does not have types attribute', () => {
                brokenJSON[0].packages.somePackage.types = undefined

                expectThrow(brokenJSON)
            })

            test('throws error when types is an array', () => {
                brokenJSON[0].packages.somePackage.types = [
                    {
                        methods: { '<init>()': { size: 0 } },
                        fields: {}
                    }
                ]

                expectThrow(brokenJSON)
            })

            test('throws error when types is a string', () => {
                brokenJSON[0].packages.somePackage.types = 'I should be an object type'

                expectThrow(brokenJSON)
            })

            test('throws error when types is a number', () => {
                brokenJSON[0].packages.somePackage.types = 3

                expectThrow(brokenJSON)
            })

            test('throws error when types is a boolean', () => {
                brokenJSON[0].packages.somePackage.types = false

                expectThrow(brokenJSON)
            })

            test('throws error when types is null', () => {
                brokenJSON[0].packages.somePackage.types = null

                expectThrow(brokenJSON)
            })

            test('throws error when type does not have methods attribute', () => {
                brokenJSON[0].packages.somePackage.types.SomeClass.methods = undefined

                expectThrow(brokenJSON)
            })

            test('throws error when methods is an array', () => {
                brokenJSON[0].packages.somePackage.types.SomeClass.methods = [{ size: 0 }]

                expectThrow(brokenJSON)
            })

            test('throws error when methods is a string', () => {
                brokenJSON[0].packages.somePackage.types.SomeClass.methods =
                    'I should be an object type'

                expectThrow(brokenJSON)
            })

            test('throws error when methods is a number', () => {
                brokenJSON[0].packages.somePackage.types.SomeClass.methods = 3

                expectThrow(brokenJSON)
            })

            test('throws error when methods is a boolean', () => {
                brokenJSON[0].packages.somePackage.types.SomeClass.methods = false

                expectThrow(brokenJSON)
            })

            test('throws error when methods is null', () => {
                brokenJSON[0].packages.somePackage.types.SomeClass.methods = null

                expectThrow(brokenJSON)
            })

            test('throws error when method does not have size', () => {
                brokenJSON[0].packages.somePackage.types.SomeClass.methods['<init>()'].size =
                    undefined

                expectThrow(brokenJSON)
            })

            test('throws error when size is not a number', () => {
                brokenJSON[0].packages.somePackage.types.SomeClass.methods['<init>()'].size =
                    'I should be a number'

                expectThrow(brokenJSON)
            })
        })

        describe('valid format', () => {
            test.each([
                {
                    jsonObject: [
                        {
                            packages: {
                                package: {
                                    types: {
                                        Class: {
                                            methods: { '<init>()': { size: 0 } },
                                            fields: {}
                                        }
                                    }
                                }
                            }
                        }
                    ],
                    expected: new Node('universe', [
                        new Node('', [
                            new Node('package', [
                                new Node('Class', [
                                    new Leaf('<init>()', 0, [InitKind.NO_CLASS_CONSTRUCTOR])
                                ])
                            ])
                        ])
                    ])
                },
                {
                    jsonObject: [
                        {
                            module: 'java.base',
                            packages: {
                                'java.lang.constant': {
                                    types: {
                                        ConstantUtils: {
                                            'init-kind': ['build-time'],
                                            methods: {
                                                'arrayDepth(java.lang.String)': { size: 192 },
                                                'skipOverFieldSignature(java.lang.String, int, int, boolean)':
                                                    {
                                                        size: 1720
                                                    },
                                                'validateMemberName(java.lang.String, boolean)': {
                                                    flags: ['synthetic'],
                                                    size: 3088
                                                }
                                            },
                                            fields: { pointyNames: {} }
                                        }
                                    }
                                }
                            }
                        }
                    ],
                    expected: new Node('universe', [
                        new Node('java.base', [
                            new Node('java.lang.constant', [
                                new Node('ConstantUtils', [
                                    new Leaf('arrayDepth(java.lang.String)', 192, [
                                        InitKind.BUILD_TIME
                                    ]),
                                    new Leaf(
                                        'skipOverFieldSignature(java.lang.String, int, int, boolean)',
                                        1720,
                                        [InitKind.BUILD_TIME]
                                    ),
                                    new Leaf(
                                        'validateMemberName(java.lang.String, boolean)',
                                        3088,
                                        [InitKind.BUILD_TIME],
                                        false,
                                        false,
                                        true
                                    )
                                ])
                            ])
                        ])
                    ])
                },
                {
                    jsonObject: [
                        {
                            module: 'java.base',
                            packages: {
                                'java.util.zip': {
                                    types: {
                                        CRC32: {
                                            'init-kind': ['run-time', 'build-time'],
                                            methods: {
                                                '<clinit>()': { size: 92 },
                                                '<init>()': { size: 0 }
                                            },
                                            fields: { pointyNames: {} }
                                        }
                                    }
                                }
                            }
                        }
                    ],
                    expected: new Node('universe', [
                        new Node('java.base', [
                            new Node('java.util.zip', [
                                new Node('CRC32', [
                                    new Leaf('<clinit>()', 92, [
                                        InitKind.RUN_TIME,
                                        InitKind.BUILD_TIME
                                    ]),
                                    new Leaf('<init>()', 0, [
                                        InitKind.RUN_TIME,
                                        InitKind.BUILD_TIME
                                    ])
                                ])
                            ])
                        ])
                    ])
                }
            ])('.Parse($jsonObject)', ({ jsonObject, expected }) => {
                expect(
                    parseReachabilityExport(jsonObject, 'universe').equals(expected)
                ).toBeTruthy()
            })
        })
    })
})
