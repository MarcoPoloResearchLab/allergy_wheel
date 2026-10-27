// @ts-check
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ExternalService } from '../js/constants.js';
const { verifyFeedback } = await import('../scripts/verify-feedback.mjs');

const widgetSource = await readFile('tests/fixtures/loopaware-widget.js', 'utf8');
const siteId = new URL(ExternalService.LOOP_FEEDBACK).searchParams.get('site_id');
const configurationUrl = `https://loopaware-api.mprlab.com/public/widget-config?site_id=${siteId}`;
const providerRequests = [];

/** Supply controlled provider HTTP responses while the verifier and widget remain real. */
async function routeProviderRequest(route) {
    const request = route.request();
    providerRequests.push({ url: request.url(), method: request.method() });
    if (request.url() === ExternalService.LOOP_FEEDBACK) {
        return route.fulfill({ contentType: 'text/javascript', body: widgetSource });
    }
    assert.equal(request.url(), configurationUrl, 'The verifier must request the selected feedback configuration.');
    return route.fulfill({ json: { site_id: siteId } });
}

const results = await verifyFeedback({ routeProviderRequest });
assert.deepEqual(results.map(({ engine, scenario, configurationStatus, feedbackFormVisible, submission }) => ({
    engine, scenario, configurationStatus, feedbackFormVisible, submission
})), ['chromium', 'webkit'].flatMap((engine) => ['website embed', 'packaged parent document'].map((scenario) => ({
    engine, scenario, configurationStatus: 200, feedbackFormVisible: true, submission: 'not-performed'
}))));
assert.equal(providerRequests.filter(({ url }) => url === configurationUrl).length, results.length);
assert.equal(providerRequests.every(({ method }) => method === 'GET'), true, 'No feedback submission is permitted.');
assert.equal(providerRequests.some(({ url }) => url === ExternalService.LOOP_COUNTS), false, 'Feedback verification must not send counts.');
console.info('Feedback verifier passed both browser engines and entry points with controlled provider responses and no submission.');
