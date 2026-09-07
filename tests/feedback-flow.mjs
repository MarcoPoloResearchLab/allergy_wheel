// @ts-check
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ParentService, ParentText } from '../js/constants.js';
import { MobileLocation } from '../mobile/constants.js';

export const widgetSource = await readFile('tests/fixtures/loopaware-widget.js', 'utf8');
export const widgetConfigUrl = `https://loopaware-api.mprlab.com/public/widget-config?site_id=${new URL(ParentService.LOOP_FEEDBACK).searchParams.get('site_id')}`;

/** Verify the real provider script through the packaged parent entry point. */
export async function runFeedbackFlow(browser, parentSource) {
    for (const statusCode of [403, 404, 200]) {
        const context = await browser.newContext();
        const page = await context.newPage();
        let responseStatus = statusCode;
        let releaseConfig;
        const configGate = new Promise((resolve) => { releaseConfig = resolve; });
        let scriptRequests = 0;
        await context.route('**/*', async (route) => {
            const url = route.request().url();
            if (url === MobileLocation.PARENTS) return route.fulfill({ contentType: 'text/html', body: parentSource });
            if (url === ParentService.LOOP_FEEDBACK) {
                scriptRequests += 1;
                return route.fulfill({ contentType: 'text/javascript', body: widgetSource });
            }
            if (url === widgetConfigUrl) {
                await configGate;
                return route.fulfill({ status: responseStatus, json: {} });
            }
            return route.abort();
        });
        await page.clock.install();
        await page.goto(MobileLocation.PARENTS);
        const factors = (await page.locator('#parent-question').innerText()).match(/\d+/g).map(Number);
        await page.getByLabel(ParentText.ANSWER).fill(String(factors[0] * factors[1]));
        await page.getByRole('button', { name: ParentText.CONTINUE, exact: true }).click();
        const button = page.getByRole('button', { name: ParentText.FEEDBACK, exact: true });
        const configRequest = page.waitForRequest(widgetConfigUrl);
        await button.click();
        await configRequest;
        assert.notEqual(await page.getByRole('status').innerText(), ParentText.READY, 'Script download is not widget readiness.');
        const configResponse = page.waitForResponse(widgetConfigUrl);
        releaseConfig();
        await configResponse;
        if (statusCode !== 200) {
            await page.clock.runFor(10_100);
            assert.equal(await page.getByRole('status').innerText(), ParentText.UNAVAILABLE);
            assert.equal(await button.isEnabled(), true, 'A failed initialization must allow another attempt.');
            assert.equal(await page.locator('#mp-feedback-bubble').count(), 0);
            responseStatus = 200;
            await button.click();
        }
        await page.locator('#mp-feedback-bubble').waitFor();
        await page.waitForFunction((ready) => document.querySelector('[role="status"]').textContent === ready, ParentText.READY);
        await page.locator('#mp-feedback-bubble').click();
        await page.locator('#mp-feedback-contact').waitFor();
        assert.equal(await page.locator('#mp-feedback-panel').isVisible(), true);
        assert.equal(await page.locator('#mp-feedback-bubble').count(), 1);
        assert.equal(scriptRequests, statusCode === 200 ? 1 : 2);
        await context.close();
    }
    console.info('Feedback initialization passed real-widget 403/404 failures, delayed readiness, and successful retry.');
}
