import { ExportConfig } from './ExportConfig'

export function loadStringParameter<T>(
    name: string,
    config: ExportConfig,
    parsingFunction: (value: string) => T | undefined,
    onSuccess: (value: T) => void
) {
    if (!(name in config)) return

    const value = config[name]

    if (typeof value !== 'string') return

    const parsedObject: T | undefined = parsingFunction(value)

    if (parsedObject !== undefined) {
        onSuccess(parsedObject)
    }
}

export function loadStringArrayParameter<T>(
    name: string,
    config: ExportConfig,
    parsingFunction: (value: string[]) => T | undefined,
    onSuccess: (value: T) => void
) {
    if (!(name in config)) return

    const value = config[name]

    if (!Array.isArray(value) || value.some((entry: unknown) => typeof entry !== 'string')) return

    const parsedObject: T | undefined = parsingFunction(value)

    if (parsedObject !== undefined) {
        onSuccess(parsedObject)
    }
}
