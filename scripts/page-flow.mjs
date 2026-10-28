// @ts-check

/**
 * Stop one owned page flow on its first uncaught browser error.
 * @template Result
 * @param {import('playwright').Page} page
 * @param {(track: <Value>(promise: Promise<Value>) => Promise<Value>) => Promise<Result>} flow
 * @returns {Promise<Result | undefined>}
 */
export async function runPageFlow(page, flow) {
    const context = page.context();
    /** @type {unknown} */
    let firstError;
    /** @type {Promise<void> | undefined} */
    let closure;
    /** @type {unknown[]} */
    const cleanupErrors = [];
    /** @type {Array<Promise<PromiseSettledResult<unknown>>>} */
    const waiters = [];
    const closeContext = () => {
        closure ??= context.close().catch(error => { cleanupErrors.push(error); });
        return closure;
    };
    const onPageError = error => {
        firstError ??= error;
        void closeContext();
    };
    /** @template Value @param {Promise<Value>} promise @returns {Promise<Value>} */
    const track = promise => {
        waiters.push(promise.then(
            value => ({ status: 'fulfilled', value }),
            reason => {
                onPageError(reason);
                return { status: 'rejected', reason };
            },
        ));
        return promise;
    };
    page.on('pageerror', onPageError);
    let result;
    try {
        result = await flow(track);
    } catch (error) {
        firstError ??= error;
    } finally {
        await closeContext();
        for (const waiter of await Promise.all(waiters)) {
            if (waiter.status === 'rejected') firstError ??= waiter.reason;
        }
        page.off('pageerror', onPageError);
    }
    if (cleanupErrors.length) {
        const errors = firstError === undefined ? cleanupErrors : [firstError, ...cleanupErrors];
        throw new AggregateError(errors, firstError instanceof Error ? firstError.message : 'Page flow cleanup failed.');
    }
    if (firstError !== undefined) throw firstError;
    return result;
}


/**
 * Finish every owned cleanup and preserve the first flow error.
 * @template Result
 * @param {() => Promise<Result>} flow
 * @param {Array<() => Promise<unknown>>} cleanups
 * @returns {Promise<Result | undefined>}
 */
export async function runWithOwnedCleanup(flow, cleanups) {
    const errors = [];
    let result;
    try { result = await flow(); } catch (error) { errors.push(error); }
    for (const cleanup of cleanups) {
        try { await cleanup(); } catch (error) { errors.push(error); }
    }
    if (errors.length === 1) throw errors[0];
    if (errors.length > 1) {
        throw new AggregateError(errors, errors[0] instanceof Error ? errors[0].message : 'Owned flow and cleanup failed.');
    }
    return result;
}
