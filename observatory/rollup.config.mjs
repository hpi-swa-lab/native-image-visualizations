import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript  from '@rollup/plugin-typescript';

export default [
    {
        input: 'assets/js/dist/venn_diagram.js',
        output: {
            sourcemap: true,
            file: 'assets/js/dist/venn_diagram.min.js',
            format: 'iife',
        },
        plugins: [nodeResolve(), typescript({sourceMap: false})]
    },
    {
        input: 'assets/js/dist/tree_viz.js',
        output: {
                sourcemap: true,
                file: 'assets/js/dist/tree_viz.min.js',
                format: 'iife',
            },
        plugins: [nodeResolve(), typescript({sourceMap: false})]
    },
]