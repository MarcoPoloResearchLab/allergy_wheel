// @ts-check
import { ExternalService, BrowserAnalytics } from '../constants.js';

/** Configure denied browser storage before the external analytics script starts. */
export function createBrowserAnalyticsGateway({ enqueueCommand, loadAnalytics }) {
    return Object.freeze({
        async enableAnalytics() {
            enqueueCommand('consent', 'default', BrowserAnalytics.DEFAULT_CONSENT);
            enqueueCommand('set', 'ads_data_redaction', true);
            enqueueCommand('js', new Date());
            enqueueCommand('config', BrowserAnalytics.MEASUREMENT_ID, BrowserAnalytics.CONFIG);
            await loadAnalytics(BrowserAnalytics.SCRIPT_URL);
        }
    });
}

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
