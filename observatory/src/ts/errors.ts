export class InvalidInputError extends Error {
    constructor(message: string) {
        super('Invalid input: ' + message)

        Object.setPrototypeOf(this, InvalidInputError.prototype)
    }
}
