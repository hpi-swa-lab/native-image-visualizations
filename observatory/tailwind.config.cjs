const colors = require('tailwindcss/colors')

/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                diffRed: colors.red[400],
                diffGreen: colors.lime[400],
                diffBlue: colors.sky[300],
                diffGray: colors.gray[400],
            }
        },
        
    },
    plugins: []
}
