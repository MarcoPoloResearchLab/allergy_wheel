// @ts-check
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';
import { ParentText, ExternalService } from '../js/constants.js';
import { MobileLocation } from '../mobile/constants.js';
import { widgetSource, widgetConfigUrl } from './feedback-flow.mjs';
import { runWithOwnedCleanup } from '../scripts/page-flow.mjs';

execFileSync(process.execPath, ['scripts/build-mobile-game.mjs'], { stdio: 'inherit' });
const source = await readFile('mobile/generated/parents.html', 'utf8');
const sizes = [{ width: 390, height: 690 }, { width: 320, height: 568 }, { width: 440, height: 800 }, { width: 768, height: 900 }, { width: 844, height: 320 }];
for (const browserType of [chromium, webkit]) {
    const browser = await browserType.launch();
    await runWithOwnedCleanup(async () => {
        for (const viewport of sizes) {
            const context = await browser.newContext({ viewport });
            await runWithOwnedCleanup(async () => {
                const requests = [];
                await context.route('**/*', (route) => {
                    const url = route.request().url();
                    if (url === MobileLocation.PARENTS) return route.fulfill({ contentType: 'text/html', body: source });
                    requests.push(url);
                    if (url === ExternalService.LOOP_FEEDBACK) return route.fulfill({ contentType: 'text/javascript', body: widgetSource });
                    if (url === widgetConfigUrl) return route.fulfill({ json: {} });
                    return route.abort();
                });
                const page = await context.newPage();
                await page.goto(MobileLocation.PARENTS);
                assert.equal(await page.getByRole('heading', { name: 'A quick adult check', exact: true }).count(), 1, 'Explain the adult check before its question.');
                assert.equal(requests.length, 0, 'The entry must not load external services.');
                const answer = page.getByLabel(ParentText.ANSWER, { exact: true });
                const next = page.getByRole('button', { name: ParentText.CONTINUE, exact: true });
                assert.equal(await answer.getAttribute('inputmode'), 'numeric');
                assert.equal(await next.isDisabled(), true, 'An empty answer must not continue.');
                const inputBounds = await answer.boundingBox();
                const buttonBounds = await next.boundingBox();
                assert.ok(inputBounds.height >= 44 && buttonBounds.height >= 44);
                assert.ok(buttonBounds.width >= inputBounds.width - 2, 'The primary action must be easy to find.');
                assert.equal(await page.locator('#privacy-text').isVisible(), false);
                assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
                if (viewport.width === 390) await page.screenshot({ path: `/output/${browserType.name()}-feedback-entry.png`, fullPage: true });
                await answer.fill('1');
                await next.click();
                assert.equal(await answer.getAttribute('aria-invalid'), 'true');
                assert.equal(await answer.evaluate((element) => document.activeElement === element), true);
                const factors = (await page.locator('#parent-question').innerText()).match(/\d+/g).map(Number);
                await answer.fill(String(factors[0] * factors[1]));
                await next.click();
                const agreement = page.getByRole('checkbox', { name: ParentText.AGREEMENT, exact: true });
                const open = page.getByRole('button', { name: ParentText.FEEDBACK, exact: true });
                assert.equal(await agreement.evaluate((element) => document.activeElement === element), true);
                assert.equal(await open.isDisabled(), true);
                assert.equal(requests.length, 0);
                if (viewport.width === 390) await page.screenshot({ path: `/output/${browserType.name()}-feedback-agreement.png`, fullPage: true });
                await agreement.check();
                await open.click();
                const panel = page.locator('#mp-feedback-panel');
                await panel.waitFor({ state: 'visible' });
                const bounds = await panel.boundingBox();
                assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= viewport.width + 1, 'LoopAware must fit the viewport width.');
                assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= viewport.height + 1, 'LoopAware must fit a short viewport.');
                if (viewport.width === 390) await page.screenshot({ path: `/output/${browserType.name()}-feedback-open.png`, fullPage: true });
                await page.getByRole('button', { name: 'Close feedback panel', exact: true }).click();
                await open.click();
                await panel.waitFor({ state: 'visible' });
                assert.equal(requests.filter((url) => url === ExternalService.LOOP_FEEDBACK).length, 1, 'Reopening must use the existing service.');
                await page.reload();
                assert.equal(await page.locator('#mp-feedback-panel').count(), 0, 'A new visit must reset feedback access.');
                assert.equal(await page.getByRole('button', { name: ParentText.FEEDBACK, exact: true }).isVisible(), false);
                assert.equal(await answer.inputValue(), '');
                console.info(`${browserType.name()} feedback ${viewport.width}×${viewport.height} passed.`);
            }, [() => context.close()]);
        }
    }, [() => browser.close()]);
}
