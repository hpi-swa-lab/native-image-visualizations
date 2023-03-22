export function formatByteSizeWithUnitPrefix(size: number) {
    if (size > 1000000) return (size / 1000000).toPrecision(3) + ' MB'
    else if (size > 1000) return (size / 1000).toPrecision(3) + ' KB'
    else return size.toPrecision(3) + ' B'
}
