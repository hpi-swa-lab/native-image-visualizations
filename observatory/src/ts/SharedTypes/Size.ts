export type Bytes = number

export const inKB = (b:Bytes) => b/BYTES_IN_KB
export const inMB = (b:Bytes) => b/BYTES_IN_MB

const BYTES_IN_KB = 1000
const BYTES_IN_MB = BYTES_IN_KB * 1000
const BYTES_IN_GB = BYTES_IN_MB * 1000
const BYTES_IN_TB = BYTES_IN_GB * 1000