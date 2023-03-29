/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                // Color schemes from https://observablehq.com/@d3/color-schemes
                UNIVERSE_COLORS: {
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
                UNMODIFIED: '#bbbbbb',
                MODIFIED: '#baa17e'
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
