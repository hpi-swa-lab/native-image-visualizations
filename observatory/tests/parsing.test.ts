import { describe, expect, test } from '@jest/globals'
import { parseReachabilityExport, InvalidReachabilityFormatError } from '../src/ts/parsing'
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
            test('throws error for empty json', () => {
                expect(() => {
                    parseReachabilityExport({}, 'universe')
                }).toThrow(InvalidReachabilityFormatError)
            })

            test('throws error when not array on top level', () => {
                const json = {
                    name: 'John Smith',
                    age: 35,
                    email: 'john.smith@example.com',
                    phone: '555-1234'
                }

                expect(() => {
                    parseReachabilityExport(json, 'universe')
                }).toThrow(InvalidReachabilityFormatError)
            })

            test('throws error when no module name could be found', () => {
                const json = [
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
                ]

                expect(() => {
                    parseReachabilityExport(json, 'universe')
                }).toThrow(InvalidReachabilityFormatError)
            })

            test('throws error when module and path are not strings', () => {
                const json = [
                    {
                        module: ['not a string but array'],
                        path: { anObject: 'but not a string' },
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
                ]

                expect(() => {
                    parseReachabilityExport(json, 'universe')
                }).toThrow(InvalidReachabilityFormatError)
            })

            test('throws error when no packages attribute', () => {
                const json = [
                    {
                        module: 'Module',
                        notNamedProperly: {
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
                ]

                expect(() => {
                    parseReachabilityExport(json, 'universe')
                }).toThrow(InvalidReachabilityFormatError)
            })

            test('throws error when packages is an array', () => {
                const json = [
                    {
                        module: 'Module',
                        packages: [
                            {
                                types: {
                                    Class: {
                                        methods: { '<init>()': { size: 0 } },
                                        fields: {}
                                    }
                                }
                            }
                        ]
                    }
                ]

                expect(() => {
                    parseReachabilityExport(json, 'universe')
                }).toThrow(InvalidReachabilityFormatError)
            })

            test('throws error when packages is a number', () => {
                const json = [
                    {
                        module: 'Module',
                        packages: 3
                    }
                ]

                expect(() => {
                    parseReachabilityExport(json, 'universe')
                }).toThrow(InvalidReachabilityFormatError)
            })

            test('throws error when packages is a string', () => {
                const json = [
                    {
                        module: 'Module',
                        packages: 'I should be an object type'
                    }
                ]

                expect(() => {
                    parseReachabilityExport(json, 'universe')
                }).toThrow(InvalidReachabilityFormatError)
            })

            test('throws error when packages is a boolean', () => {
                const json = [
                    {
                        module: 'Module',
                        packages: true
                    }
                ]

                expect(() => {
                    parseReachabilityExport(json, 'universe')
                }).toThrow(InvalidReachabilityFormatError)
            })

            test('throws error when packages is null', () => {
                const json = [
                    {
                        module: 'Module',
                        packages: null
                    }
                ]

                expect(() => {
                    parseReachabilityExport(json, 'universe')
                }).toThrow(InvalidReachabilityFormatError)
            })

            test('throws error when package does not have types attribute', () => {
                const json = [
                    {
                        module: 'Module',
                        packages: {
                            package: {
                                notNamedProperly: {
                                    Class: {
                                        methods: { '<init>()': { size: 0 } },
                                        fields: {}
                                    }
                                }
                            }
                        }
                    }
                ]

                expect(() => {
                    parseReachabilityExport(json, 'universe')
                }).toThrow(InvalidReachabilityFormatError)
            })

            test('throws error when types is an array', () => {
                const json = [
                    {
                        module: 'Module',
                        packages: {
                            package: {
                                types: [
                                    {
                                        methods: { '<init>()': { size: 0 } },
                                        fields: {}
                                    }
                                ]
                            }
                        }
                    }
                ]

                expect(() => {
                    parseReachabilityExport(json, 'universe')
                }).toThrow(InvalidReachabilityFormatError)
            })

            test('throws error when types is a string', () => {
                const json = [
                    {
                        module: 'Module',
                        packages: {
                            package: {
                                types: 'wrong type'
                            }
                        }
                    }
                ]

                expect(() => {
                    parseReachabilityExport(json, 'universe')
                }).toThrow(InvalidReachabilityFormatError)
            })

            test('throws error when types is a number', () => {
                const json = [
                    {
                        module: 'Module',
                        packages: {
                            package: {
                                types: 3
                            }
                        }
                    }
                ]

                expect(() => {
                    parseReachabilityExport(json, 'universe')
                }).toThrow(InvalidReachabilityFormatError)
            })

            test('throws error when types is a boolean', () => {
                const json = [
                    {
                        module: 'Module',
                        packages: {
                            package: {
                                types: true
                            }
                        }
                    }
                ]

                expect(() => {
                    parseReachabilityExport(json, 'universe')
                }).toThrow(InvalidReachabilityFormatError)
            })

            test('throws error when types is null', () => {
                const json = [
                    {
                        module: 'Module',
                        packages: {
                            package: {
                                types: null
                            }
                        }
                    }
                ]

                expect(() => {
                    parseReachabilityExport(json, 'universe')
                }).toThrow(InvalidReachabilityFormatError)
            })

            test('throws error when type does not have methods attribute', () => {
                const json = [
                    {
                        module: 'Module',
                        packages: {
                            package: {
                                types: {
                                    Class: {
                                        notNamedProperly: { '<init>()': { size: 0 } },
                                        fields: {}
                                    }
                                }
                            }
                        }
                    }
                ]

                expect(() => {
                    parseReachabilityExport(json, 'universe')
                }).toThrow(InvalidReachabilityFormatError)
            })

            test('throws error when methods is an array', () => {
                const json = [
                    {
                        module: 'Module',
                        packages: {
                            package: {
                                types: {
                                    Class: {
                                        methods: [{ size: 0 }],
                                        fields: {}
                                    }
                                }
                            }
                        }
                    }
                ]

                expect(() => {
                    parseReachabilityExport(json, 'universe')
                }).toThrow(InvalidReachabilityFormatError)
            })

            test('throws error when methods is a string', () => {
                const json = [
                    {
                        module: 'Module',
                        packages: {
                            package: {
                                types: {
                                    Class: {
                                        methods: 'wrong type',
                                        fields: {}
                                    }
                                }
                            }
                        }
                    }
                ]

                expect(() => {
                    parseReachabilityExport(json, 'universe')
                }).toThrow(InvalidReachabilityFormatError)
            })

            test('throws error when methods is a number', () => {
                const json = [
                    {
                        module: 'Module',
                        packages: {
                            package: {
                                types: {
                                    Class: {
                                        methods: 3,
                                        fields: {}
                                    }
                                }
                            }
                        }
                    }
                ]

                expect(() => {
                    parseReachabilityExport(json, 'universe')
                }).toThrow(InvalidReachabilityFormatError)
            })

            test('throws error when methods is a boolean', () => {
                const json = [
                    {
                        module: 'Module',
                        packages: {
                            package: {
                                types: {
                                    Class: {
                                        methods: true,
                                        fields: {}
                                    }
                                }
                            }
                        }
                    }
                ]

                expect(() => {
                    parseReachabilityExport(json, 'universe')
                }).toThrow(InvalidReachabilityFormatError)
            })

            test('throws error when methods is null', () => {
                const json = [
                    {
                        module: 'Module',
                        packages: {
                            package: {
                                types: {
                                    Class: {
                                        methods: null,
                                        fields: {}
                                    }
                                }
                            }
                        }
                    }
                ]

                expect(() => {
                    parseReachabilityExport(json, 'universe')
                }).toThrow(InvalidReachabilityFormatError)
            })

            test('throws error when method does not have size', () => {
                const json = [
                    {
                        module: 'Module',
                        packages: {
                            package: {
                                types: {
                                    Class: {
                                        methods: { '<init>()': { somethingElse: 0 } },
                                        fields: {}
                                    }
                                }
                            }
                        }
                    }
                ]

                expect(() => {
                    parseReachabilityExport(json, 'universe')
                }).toThrow(InvalidReachabilityFormatError)
            })

            test('throws error when size is not a number', () => {
                const json = [
                    {
                        module: 'Module',
                        packages: {
                            package: {
                                types: {
                                    Class: {
                                        methods: { '<init>()': { size: 'string' } },
                                        fields: {}
                                    }
                                }
                            }
                        }
                    }
                ]

                expect(() => {
                    parseReachabilityExport(json, 'universe')
                }).toThrow(InvalidReachabilityFormatError)
            })

            test('does not throw an error when size is zero', () => {
                const json = [
                    {
                        module: 'Module',
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
                ]

                expect(() => {
                    parseReachabilityExport(json, 'universe')
                }).not.toThrow(InvalidReachabilityFormatError)
            })
        })

        describe('valid format', () => {
            test('Simple Image with one object each layer is parsed to equal tree', () => {
                const json = [
                    {
                        module: 'Module',
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
                ]

                const expected = new Node('universe', [
                    new Node('Module', [
                        new Node('package', [
                            new Node('Class', [
                                new Leaf('<init>()', 0, [InitKind.NO_CLASS_CONSTRUCTOR])
                            ])
                        ])
                    ])
                ])

                expect(() => {
                    parseReachabilityExport(json, 'universe').equals(expected)
                }).toBeTruthy()
            })

            test('Simple Image with a few objects, different attributes each', () => {
                const json = [
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
                ]

                const expected = new Node('universe', [
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

                expect(() => {
                    parseReachabilityExport(json, 'universe').equals(expected)
                }).toBeTruthy()
            })

            test('Multiple init kinds in class', () => {
                const json = [
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
                ]

                const expected = new Node('universe', [
                    new Node('java.base', [
                        new Node('java.util.zip', [
                            new Node('CRC32', [
                                new Leaf('<clinit>()', 92, [
                                    InitKind.RUN_TIME,
                                    InitKind.BUILD_TIME
                                ]),
                                new Leaf('<init>()', 0, [InitKind.RUN_TIME, InitKind.BUILD_TIME])
                            ])
                        ])
                    ])
                ])

                expect(() => {
                    parseReachabilityExport(json, 'universe').equals(expected)
                }).toBeTruthy()
            })
        })
    })
})
