import { Node } from '../UniverseTypes/Node'
import { HIERARCHY_NAME_SEPARATOR } from '../globals'

export type NodeValidator = (node: Node) => boolean

type serializedFilter = {
    description: string
    appliesComplement: boolean
    validator: string
    isCustom: boolean
}

export class Filter {
    public description: string
    public validator: NodeValidator
    public applyComplement: boolean
    public isCustom: boolean

    constructor(
        description: string,
        validator: NodeValidator,
        applyComplement = false,
        isCustom = false
    ) {
        this.description = description
        this.validator = validator
        this.applyComplement = applyComplement
        this.isCustom = isCustom
    }

    static applyAll(filters: Filter[], node: Node): boolean {
        return filters.every((filter) => filter.validate(node))
    }

    static parse(json: string): Filter {
        const serialized = JSON.parse(json) as serializedFilter
        return new Filter(
            serialized.description,
            new Function('return ' + serialized.validator)(),
            serialized.appliesComplement,
            serialized.isCustom
        )
    }

    static fromSearchTerm(term: string): Filter {
        return new Filter(
            `${term}`,
            (node) => node.identifier.toLowerCase().includes(term.toLowerCase()),
            false,
            true
        )
    }

    static fromSelection(selection: Set<string>): Filter {
        // we have to check for "selectionTerm + HIERARCHY_NAME_SEPARATOR" in cases
        // of packages like "java.util", where selecting "java.util" must not add the package
        // "java.util.regex"
        const copy = [...selection]
        return new Filter(
            `User Selection with ${selection.size} items`,
            (node) =>
                copy.some(
                    (selectionTerm) =>
                        node.identifier
                            .toLowerCase()
                            .includes(selectionTerm + HIERARCHY_NAME_SEPARATOR) ||
                        node.identifier.toLowerCase().endsWith(selectionTerm)
                ),
            false,
            true
        )
    }

    public equals(another: Filter): boolean {
        // Comparison validity https://stackoverflow.com/a/9817699
        return (
            '' + this.validator === '' + another.validator &&
            this.description === another.description
        )
    }

    public validate(node: Node): boolean {
        return this.applyComplement ? !this.validator(node) : this.validator(node)
    }

    public serialize(): string {
        return `{"description":"${this.description}","applyComplement":${
            this.applyComplement
        }, "validator":"${this.validator.toString()}", "isCustom":${this.isCustom}}`
    }
}
