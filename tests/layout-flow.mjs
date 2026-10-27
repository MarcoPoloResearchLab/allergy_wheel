// @ts-check
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';
import { MobileLocation } from '../mobile/constants.js';

const websiteUrl = 'https://allergy.mprlab.com/';
const screenshotDirectory = '/output';
const viewports = [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 1024, height: 768 }
];
/** Check that navigation and wheel controls remain visible without page scrolling. */
async function assertWheelFits(page) {
    const layout = await page.evaluate(() => {
        const header = document.querySelector('header').getBoundingClientRect();
        const wheel = document.querySelector('.wheel-wrap').getBoundingClientRect();
        const control = document.querySelector('#wheel-control').getBoundingClientRect();
        return {
            headerVisible: header.top >= 0 && header.bottom <= innerHeight,
            wheelVisible: wheel.top >= header.bottom && wheel.bottom <= innerHeight,
            controlVisible: control.top >= header.bottom && control.bottom <= innerHeight,
            scrollWidth: document.documentElement.scrollWidth,
            viewportWidth: innerWidth
        };
    });
    assert.equal(layout.headerVisible, true, 'The header must stay in the viewport during play.');
    assert.equal(layout.wheelVisible, true, 'The wheel must fit below the header.');
    assert.equal(layout.controlVisible, true, 'Wheel controls must stay in the viewport.');
    assert.ok(layout.scrollWidth <= layout.viewportWidth, `The game must fit the viewport width (${layout.scrollWidth}/${layout.viewportWidth}).`);
}

const contentTypes = Object.freeze({
    html: 'text/html', js: 'text/javascript', css: 'text/css',
    json: 'application/json', svg: 'image/svg+xml'
});

execFileSync(process.execPath, ['scripts/build-mobile-game.mjs'], { stdio: 'inherit' });
const mobileSource = await readFile('mobile/generated/game.html', 'utf8');
await mkdir(screenshotDirectory, { recursive: true });

for (const engine of [chromium, webkit]) {
    const browser = await engine.launch();
    try {
        for (const surface of ['browser', 'mobile']) {
            for (const viewport of viewports) {
                const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
                await context.route('**/*', async (route) => {
                    const url = new URL(route.request().url());
                    if (url.href === MobileLocation.GAME) return route.fulfill({ contentType: contentTypes.html, body: mobileSource });
                    if (url.origin !== new URL(websiteUrl).origin) return route.abort();
                    const path = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
                    const extension = path.split('.').at(-1);
                    return route.fulfill({ body: await readFile(path), contentType: contentTypes[extension] });
                });
                const page = await context.newPage();
                try {
                    await page.clock.install();
                    await page.goto(surface === 'mobile' ? MobileLocation.GAME : websiteUrl);
                    await page.locator('#loading[hidden]').waitFor({ state: 'attached' });
                    const header = await page.locator('header').boundingBox();
                    assert.ok(header && header.height <= 172, `${surface} ${viewport.width}: header must leave room for the game (actual ${header?.height}).`);
                    await page.locator('input[value="peanuts"]').check();
                    await page.locator('#mute').click();
                    await page.locator('#start').click();
                    await assertWheelFits(page);
                    await page.locator('#wheel-continue').click();
                    await page.locator('#reveal[aria-hidden="false"]').waitFor();
                    const resultLayout = await page.locator('#reveal').evaluate((overlay) => {
                        const card = overlay.querySelector('.reveal-card');
                        const bounds = card.getBoundingClientRect();
                        const title = overlay.querySelector('#dish-title');
                        title.scrollIntoView({ block: 'nearest' });
                        const titleBounds = title.getBoundingClientRect();
                        const topElement = document.elementFromPoint(titleBounds.left + titleBounds.width / 2, titleBounds.top + titleBounds.height / 2);
                        return {
                            titleVisible: overlay.contains(topElement),
                            fits: bounds.left >= 8 && bounds.right <= innerWidth - 8 && bounds.top >= 8 && bounds.bottom <= innerHeight - 8,
                            scrollFits: card.scrollWidth <= card.clientWidth,
                            width: bounds.width
                        };
                    });
                    assert.equal(resultLayout.titleVisible, true, 'The result title must appear above the header.');
                    assert.equal(resultLayout.fits, true, 'The result dialog must fit inside the viewport.');
                    assert.equal(resultLayout.scrollFits, true, 'Result content must wrap within the dialog.');
                    await page.locator('#again').scrollIntoViewIfNeeded();
                    await page.screenshot({ path: `${screenshotDirectory}/${engine.name()}-${surface}-${viewport.width}-result.png` });
                    await page.locator('#again').click();
                    assert.equal(await page.locator('#reveal').getAttribute('aria-hidden'), 'true');
                    await assertWheelFits(page);
                    await page.screenshot({ path: `${screenshotDirectory}/${engine.name()}-${surface}-${viewport.width}-wheel.png` });
                    await page.locator('#wheel-continue').click();
                    await page.locator('#reveal[aria-hidden="false"]').waitFor();
                    await page.keyboard.press('Escape');
                    await page.locator('#wheel-restart').click();
                    const restartCoversViewport = await page.locator('#restart-confirmation-overlay').evaluate((overlay) => {
                        const bounds = overlay.getBoundingClientRect();
                        return bounds.top === 0 && bounds.left === 0 && bounds.width === innerWidth && bounds.height === innerHeight
                            && document.elementFromPoint(1, 1) === overlay;
                    });
                    assert.equal(restartCoversViewport, true, 'Restart confirmation must cover the viewport and header.');
                    await page.locator('#restart-confirmation-cancel').click();
                    console.info(`${engine.name()} ${surface} ${viewport.width}×${viewport.height}: header, result layering, wrapping, and Spin Again passed.`);
                } finally {
                    await context.close();
                }
            }
        }
    } finally {
        await browser.close();
    }
}
