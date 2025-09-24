// @ts-check

/**
 * Throws an error when the provided condition is falsy.
 *
 * @param {unknown} condition - Condition to validate.
 * @param {string} message - Error message to throw when the assertion fails.
 * @returns {void}
 */
export function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

/**
 * Asserts that two primitive values are strictly equal.
 *
 * @param {unknown} actual - Observed value.
 * @param {unknown} expected - Expected value.
 * @param {string} message - Error message when the assertion fails.
 * @returns {void}
 */
export function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`${message} (expected ${String(expected)}, received ${String(actual)})`);
    }
}

/**
 * Performs a deep equality check using JSON serialization.
 *
 * @param {unknown} actual - Observed value.
 * @param {unknown} expected - Expected value.
 * @param {string} message - Error message when the assertion fails.
 * @returns {void}
 */
export function assertDeepEqual(actual, expected, message) {
    const actualSerialized = JSON.stringify(actual);
    const expectedSerialized = JSON.stringify(expected);
    if (actualSerialized !== expectedSerialized) {
        throw new Error(`${message} (expected ${expectedSerialized}, received ${actualSerialized})`);
    }
}

/**
 * Verifies that the provided function throws an error.
 *
 * @param {() => unknown | Promise<unknown>} fn - Function expected to throw.
 * @param {string} message - Error message when the function does not throw.
 * @returns {void}
 */
export function assertThrows(fn, message) {
    try {
        fn();
    } catch (error) {
        if (error instanceof Error) {
            return;
        }
        return;
    }
    throw new Error(message);
}
