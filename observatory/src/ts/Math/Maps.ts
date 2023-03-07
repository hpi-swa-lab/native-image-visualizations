export function mapEquals<K, V>(
    a: Map<K, V>,
    b: Map<K, V>,
    valueEquals: (a: V, b: V) => boolean = (a, b) => a === b
): boolean {
    return (
        a.size == b.size &&
        Array.from(a.entries()).every(([key, value]) => {
            const other = b.get(key)
            return other && valueEquals(value, other)
        })
    )
}
