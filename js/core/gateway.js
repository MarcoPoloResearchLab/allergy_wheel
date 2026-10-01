// @ts-check
import { ExternalService } from '../constants.js';

/** Send one startup count through the restricted LoopAware collector. */
export function createAnalyticsGateway({ sendRequest = globalThis.fetch.bind(globalThis) } = {}) {
    return Object.freeze({
        async enableAnalytics() {
            const response = await sendRequest(ExternalService.LOOP_COUNTS, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
                credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error', cache: 'no-store'
            });
            if (response.status !== 204) throw new Error('LoopAware count was not accepted.');
        }
    });
}

/** Supply the feedback operation to the parent gate. */
export function createFeedbackGateway({ loadFeedback }) {
    return Object.freeze({ openFeedback: () => loadFeedback(ExternalService.LOOP_FEEDBACK) });
}
