// / Lightens up a color by moving it closer to white.
export function lightenColor(color: string, alpha: number): string {
    const r = parseInt(color.substring(1, 3), 16)
    const g = parseInt(color.substring(3, 5), 16)
    const b = parseInt(color.substring(5, 7), 16)

    const rr = Math.round(r * alpha + 255 * (1 - alpha))
    const gg = Math.round(g * alpha + 255 * (1 - alpha))
    const bb = Math.round(b * alpha + 255 * (1 - alpha))

    const rrr = rr.toString(16).length === 1 ? `0${rr.toString(16)}` : rr.toString(16)
    const ggg = gg.toString(16).length === 1 ? `0${gg.toString(16)}` : gg.toString(16)
    const bbb = bb.toString(16).length === 1 ? `0${bb.toString(16)}` : bb.toString(16)

    return `#${rrr}${ggg}${bbb}`
}

export function mapEquals<K, V>(
    a: Map<K, V>,
    b: Map<K, V>,
    equals: (a: V, b: V) => boolean = (a, b) => a == b
): boolean {
    return (
        a.size == b.size &&
        Array.from(a.entries()).every(([key, value]) => {
            const other = b.get(key)
            return other && equals(value, other)
        })
    )
}
