export type Bytes = number

const BYTES_IN_KB = 1000
const BYTES_IN_MB = BYTES_IN_KB * 1000
const BYTES_IN_GB = BYTES_IN_MB * 1000
const BYTES_IN_TB = BYTES_IN_GB * 1000

export function formatBytes(bytes: Bytes, cutOffAt = 2): string {
    if (bytes < BYTES_IN_KB) return bytes + ' Bytes'

    if (bytes < BYTES_IN_MB) return (bytes / BYTES_IN_KB).toFixed(cutOffAt) + ' KB'

    if (bytes < BYTES_IN_GB) return (bytes / BYTES_IN_MB).toFixed(cutOffAt) + ' MB'

    if (bytes < BYTES_IN_TB) return (bytes / BYTES_IN_GB).toFixed(cutOffAt) + ' GB'

    return (bytes / BYTES_IN_TB).toFixed(cutOffAt) + ' TB'
}
