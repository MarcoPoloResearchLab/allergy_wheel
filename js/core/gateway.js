// @ts-check
import { ParentService } from '../constants.js';

/** Own external service destinations; the caller supplies DOM resource adapters. */
export function createParentGateway({ loadScript, loadStylesheet, globalScope = globalThis }) {
    return Object.freeze({
        async enableAnalytics() {
            globalScope.dataLayer = [];
            globalScope.gtag = function () { globalScope.dataLayer.push(arguments); };
            globalScope.gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
            globalScope.gtag('js', new Date());
            globalScope.gtag('config', ParentService.GOOGLE_ID, { page_location: ParentService.PAGE, page_title: 'Allergy Wheel parents', allow_google_signals: false, allow_ad_personalization_signals: false });
            await Promise.all([loadScript(ParentService.GOOGLE_TAG), loadScript(ParentService.LOOP_ANALYTICS)]);
        },
        openFeedback: () => loadScript(ParentService.LOOP_FEEDBACK),
        loadFonts: () => loadStylesheet(ParentService.FONTS)
    });
}
