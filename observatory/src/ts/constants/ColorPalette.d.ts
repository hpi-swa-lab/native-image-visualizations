import colors from 'tailwindcss/colors'

interface ColorPalette {
    red: colors.red[400]
    green: colors.lime[400]
    blue: colors.sky[300]
    gray: colors.red[400]
}

declare const COLORS: ColorPalette
export = COLORS
