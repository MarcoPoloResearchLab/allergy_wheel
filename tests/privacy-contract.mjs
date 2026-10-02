// @ts-check
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { chromium, webkit } from 'playwright';
import { ExternalService, ParentText } from '../js/constants.js';
import { MobileLocation } from '../mobile/constants.js';

execFileSync(process.execPath, ['scripts/build-mobile-game.mjs'], { stdio: 'inherit' });
const gameSource = await readFile('mobile/generated/game.html', 'utf8');
const parentSource = await readFile('mobile/generated/parents.html', 'utf8');
const analyticsSource = await readFile('mobile/generated/analytics.html', 'utf8');
const widgetSource = await readFile('tests/fixtures/loopaware-widget.js', 'utf8');
const fontFileUrl = 'https://fonts.gstatic.com/privacy-test.woff2';
const websiteUrl = 'https://allergy.mprlab.com/';

for (const engine of [chromium, webkit]) {
    const browser = await engine.launch();
    try {
        const context = await browser.newContext();
        const requests = [];
        await context.addCookies([{ name: 'private-session', value: 'private-marker', domain: 'loopaware-api.mprlab.com', path: '/' }]);
        await context.route('**/*', async (route) => {
            const request = route.request();
            const url = new URL(request.url());
            if (request.url() === MobileLocation.GAME) return route.fulfill({ contentType: 'text/html', body: gameSource });
            if (request.url() === MobileLocation.PARENTS) return route.fulfill({ contentType: 'text/html', body: parentSource });
            if (request.url() === MobileLocation.ANALYTICS) return route.fulfill({ contentType: 'text/html', body: analyticsSource });
            if (url.origin === new URL(websiteUrl).origin) {
                const path = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
                const contentType = path.endsWith('.js') ? 'text/javascript' : path.endsWith('.css') ? 'text/css' : path.endsWith('.json') ? 'application/json' : path.endsWith('.svg') ? 'image/svg+xml' : path.endsWith('.html') ? 'text/html' : undefined;
                return route.fulfill({ body: await readFile(path), contentType });
            }
            requests.push({ url: request.url(), method: request.method(), body: request.postData(), headers: await request.allHeaders() });
            if (request.url() === ExternalService.FONTS) return route.fulfill({ contentType: 'text/css', body: `@font-face { font-family: 'Fredoka One'; src: url('${fontFileUrl}'); }` });
            if (request.url() === fontFileUrl) return route.fulfill({ status: 404 });
            if (url.hostname === 'www.googletagmanager.com') return route.fulfill({ contentType: 'text/javascript', body: 'window.analyticsCommandsAtLoad = window.dataLayer.map((command) => Array.from(command)); window.analyticsCommandTypes = window.dataLayer.map((command) => Object.prototype.toString.call(command));' });
            if (request.url() === ExternalService.LOOP_COUNTS) return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*' } });
            if (request.url() === ExternalService.LOOP_FEEDBACK) return route.fulfill({ contentType: 'text/javascript', body: widgetSource });
            if (url.pathname === '/public/widget-config') return route.fulfill({ json: { site_id: url.searchParams.get('site_id') } });
            throw new Error(`Unexpected privacy request: ${request.method()} ${request.url()}`);
        });
        try {
            const websitePage = await context.newPage();
            await websitePage.goto(websiteUrl);
            await websitePage.waitForFunction(() => window.analyticsCommandsAtLoad);
            const commands = await websitePage.evaluate(() => window.analyticsCommandsAtLoad);
            assert.deepEqual(await websitePage.evaluate(() => window.analyticsCommandTypes), commands.map(() => '[object Arguments]'), 'Use the documented Google tag command format.');
            const defaultIndex = commands.findIndex((command) => command[0] === 'consent' && command[1] === 'default');
            const configIndex = commands.findIndex((command) => command[0] === 'config');
            assert.ok(defaultIndex >= 0 && defaultIndex < configIndex, 'Denied consent must precede browser measurement.');
            assert.deepEqual(commands[defaultIndex][2], { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
            assert.equal(commands[configIndex][2].allow_google_signals, false);
            assert.equal(commands[configIndex][2].allow_ad_personalization_signals, false);
            const mobileRequestsStart = requests.length;
            const gamePage = await context.newPage();
            await gamePage.goto(MobileLocation.GAME);
            await gamePage.locator('#loading[hidden]').waitFor({ state: 'attached' });
            await gamePage.locator('input[value="peanuts"]').check();
            await gamePage.locator('#start').click();
            await gamePage.locator('#wheel-continue').click();
            await gamePage.locator('#reveal[aria-hidden="false"]').waitFor();
            assert.deepEqual(await gamePage.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) })), { local: [], session: [] });
            await gamePage.reload();
            await gamePage.locator('#loading[hidden]').waitFor({ state: 'attached' });
            assert.equal(await gamePage.locator('input[value="peanuts"]').isChecked(), false);
            assert.equal(await gamePage.locator('#start').isDisabled(), true);
            await gamePage.evaluate(() => localStorage.setItem('privacy-boundary-sentinel', 'private-game-value'));
            const analyticsPage = await context.newPage();
            await analyticsPage.goto(MobileLocation.ANALYTICS);
            await analyticsPage.waitForFunction(() => document.documentElement.dataset.analyticsState === 'ready');
            const counts = requests.slice(mobileRequestsStart).filter(({ url }) => url === ExternalService.LOOP_COUNTS);
            assert.equal(counts.length, 1);
            assert.equal(counts[0].method, 'POST');
            assert.equal(counts[0].body, '{}');
            assert.equal(counts[0].headers.cookie, undefined);
            assert.equal(counts[0].headers.referer, undefined);
            assert.equal(requests.slice(mobileRequestsStart).some(({ url }) => url === fontFileUrl), true, 'Font inventory must include the font file.');
            assert.equal(requests.slice(mobileRequestsStart).some(({ url }) => /google.*analytics|googletagmanager/.test(url)), false);
            assert.deepEqual(await analyticsPage.evaluate(() => Object.keys(localStorage)), []);
            const parentPage = await context.newPage();
            const beforeParent = requests.length;
            await parentPage.goto(MobileLocation.PARENTS);
            assert.equal(requests.length, beforeParent);
            const factors = (await parentPage.locator('#parent-question').innerText()).match(/\d+/g).map(Number);
            await parentPage.getByLabel(ParentText.ANSWER).fill(String(factors[0] * factors[1]));
            await parentPage.getByRole('button', { name: ParentText.CONTINUE, exact: true }).click();
            const feedback = parentPage.getByRole('button', { name: ParentText.FEEDBACK, exact: true });
            assert.equal(await feedback.isEnabled(), false, 'Adult agreement is required before provider loading.');
            assert.equal(requests.length, beforeParent);
            await parentPage.getByRole('checkbox', { name: /I am an adult and agree/ }).check();
            await feedback.click();
            await parentPage.getByRole('status').filter({ hasText: ParentText.READY }).waitFor();
            assert.deepEqual(await parentPage.evaluate(() => Object.keys(localStorage)), []);
            await parentPage.getByText(ParentText.PRIVACY_TITLE, { exact: true }).click();
            const privacyText = await parentPage.locator('#privacy-text').innerText();
            assert.match(privacyText, /90.*days/i);
            assert.match(privacyText, /30.*days/i);
            assert.match(privacyText, /IP address/i);
            assert.match(privacyText, /Google Fonts/i);
            assert.match(privacyText, /support correspondence/i);
            assert.match(privacyText, /clear.*storage/i);
            await parentPage.close();
            const freshParent = await context.newPage();
            const beforeReopen = requests.length;
            await freshParent.goto(MobileLocation.PARENTS);
            assert.equal(requests.length, beforeReopen);
            assert.equal(await freshParent.getByRole('button', { name: ParentText.FEEDBACK, exact: true }).isVisible(), false);
            await websitePage.goto(new URL('privacy.html', websiteUrl).href);
            assert.equal(await websitePage.locator('#privacy-text').innerText(), privacyText);
            assert.equal(requests.slice(beforeParent).every(({ method }) => method === 'GET'), true, 'Feedback verification must not submit data.');
            console.info(`${engine.name()}: browser defaults, session-only selection, isolated counts, complete fonts, adult agreement, session reset, and privacy parity passed.`);
        } finally {
            await context.close();
        }
    } finally {
        await browser.close();
    }
}

const output = await mkdtemp(join(tmpdir(), 'allergy-privacy-disclosures-'));
try {
    execFileSync(process.execPath, ['scripts/prepare-privacy-disclosures.mjs', '--output', output], { stdio: 'inherit' });
    const disclosure = JSON.parse(await readFile(join(output, 'privacy-disclosures.json'), 'utf8'));
    assert.equal(disclosure.audience.minimumAge, 6);
    assert.equal(disclosure.native.googleAnalytics, false);
    assert.equal(disclosure.native.counts.retentionDays, 90);
    assert.equal(disclosure.native.feedback.deletionDays, 30);
    assert.equal(disclosure.browser.googleAnalytics, true);
    assert.equal(disclosure.storeCertification, 'not-certified');
    const review = JSON.parse(await readFile(join(output, 'store-disclosure-review.json'), 'utf8'));
    assert.equal(review.status, 'operator-review-required');
    assert.equal(review.candidateMappings.length, 6);
    assert.equal(disclosure.native.preferences.persistentStorage, false);
    assert.equal(await readFile(join(output, 'privacy-policy.txt'), 'utf8'), `${disclosure.sections.join('\n\n')}\n`);
} finally {
    await rm(output, { recursive: true, force: true });
}
