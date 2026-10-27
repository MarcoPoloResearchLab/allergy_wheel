// @ts-check

/** Supply the browser command queue without starting an external request. */
export function createBrowserAnalyticsCommandQueue() {
    window.dataLayer = [];
    window.gtag = function enqueueAnalyticsCommand() { window.dataLayer.push(arguments); };
    return window.gtag;
}
