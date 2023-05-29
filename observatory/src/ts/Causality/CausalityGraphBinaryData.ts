export const causalityBinaryFileNames = [
    'typestates.bin',
    'interflows.bin',
    'direct_invokes.bin',
    'typeflow_methods.bin',
    'typeflow_filters.bin',
    'hyper_edges.bin'
] as const

type CausalityBinaryFileName = (typeof causalityBinaryFileNames)[number]

export type CausalityGraphBinaryData = {
    [name in CausalityBinaryFileName]: Uint8Array
}
