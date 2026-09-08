// @ts-check
import { ExternalService } from '../constants.js';

/** Own external service destinations; the caller supplies DOM resource adapters. */
export function createAnalyticsGateway({ loadScript, globalScope = globalThis }) {
    return Object.freeze({
        async enableAnalytics() {
            globalScope.dataLayer = [];
            globalScope.gtag = function () { globalScope.dataLayer.push(arguments); };
            globalScope.gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
            globalScope.gtag('js', new Date());
            globalScope.gtag('config', ExternalService.GOOGLE_ID, { page_location: ExternalService.PAGE, page_title: ExternalService.PAGE_TITLE, allow_google_signals: false, allow_ad_personalization_signals: false });
            await Promise.all([loadScript(ExternalService.GOOGLE_TAG), loadScript(ExternalService.LOOP_ANALYTICS)]);
        }
    });
}

/** Supply the feedback operation to the parent gate. */
export function createFeedbackGateway({ loadFeedback }) {
    return Object.freeze({ openFeedback: () => loadFeedback(ExternalService.LOOP_FEEDBACK) });
}
