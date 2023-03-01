/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                // Color schemes from https://observablehq.com/@d3/color-schemes
                TABLEAU_10: {
                    first: '#4e79a7',
                    second: '#f28e2c',
                    third: '#e15759',
                    fourth: '#76b7b2',
                    fifth: '#59a14f',
                    sixth: '#edc949',
                    seventh: '#af7aa1',
                    eigth: '#ff9da7',
                    ninth: '#9c755f',
                    tenth: '#bab0ab'
                },
                CATEGORY_10: {
                    first: '#1f77b4',
                    second: '#ff7f0e',
                    third: '#2ca02c',
                    fourth: '#d62728',
                    fifth: '#9467bd',
                    sixth: '#8c564b',
                    seventh: '#e377c2',
                    eight: '#7f7f7f',
                    ninth: '#bcbd22',
                    tenth: '#17becf'
                },
                PASTEL_1: {
                    first: '#fbb4ae',
                    second: '#b3cde3',
                    third: '#ccebc5',
                    fourth: '#decbe4',
                    fifth: '#fed9a6',
                    sixth: '#ffffcc',
                    seventh: '#e5d8bd',
                    eight: '#fddaec',
                    ninth: '#f2f2f2'
                },
                SET_3: {
                    first: '#8dd3c7',
                    second: '#ffffb3',
                    third: '#bebada',
                    fourth: '#fb8072',
                    fifth: '#80b1d3',
                    sixth: '#fdb462',
                    seventh: '#b3de69',
                    eight: '#fccde5',
                    ninth: '#d9d9d9',
                    tenth: '#bc80bd',
                    eleventh: '#ccebc5',
                    twelfth: '#ffed6f'
                },
                PAIRED: {
                    first: '#a6cee3',
                    second: '#1f78b4',
                    third: '#b2df8a',
                    fourth: '#33a02c',
                    fifth: '#fb9a99',
                    sixth: '#e31a1c',
                    seventh: '#fdbf6f',
                    eight: '#ff7f00',
                    ninth: '#cab2d6',
                    tenth: '#6a3d9a',
                    eleventh: '#ffff99',
                    twelfth: '#b15928'
                }
            },
            keyframes: {
                flash: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' }
                }
            },
            animation: {
                flash: 'flash 0.7s ease-out'
            }
        }
    },
    plugins: []
}
