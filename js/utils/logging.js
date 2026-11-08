// @ts-check

/** Report an operation failure without replacing it with an empty success state. */
export function reportError(operation, error) {
    console.error(operation, error);
}
