// Lightens up a color by moving it closer to white.
export function lightenColor(color: string, alpha: number): string {
    const r = parseInt(color.substring(1, 3), 16)
    const g = parseInt(color.substring(3, 5), 16)
    const b = parseInt(color.substring(5, 7), 16)

    const r2 = Math.round(r * alpha + 255 * (1 - alpha))
    const g2 = Math.round(g * alpha + 255 * (1 - alpha))
    const b2 = Math.round(b * alpha + 255 * (1 - alpha))

    const r3 = r2.toString(16).length === 1 ? `0${r2.toString(16)}` : r2.toString(16)
    const g3 = g2.toString(16).length === 1 ? `0${g2.toString(16)}` : g2.toString(16)
    const b3 = b2.toString(16).length === 1 ? `0${b2.toString(16)}` : b2.toString(16)

    return `#${r3}${g3}${b3}`
}
