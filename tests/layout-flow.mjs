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
    { width: 375, height: 812 },
    { width: 390, height: 844 },
    { width: 440, height: 956 },
    { width: 768, height: 1024 },
    { width: 667, height: 375 },
    { width: 704, height: 507 },
    { width: 844, height: 390 },
    { width: 1024, height: 768 },
    { width: 1440, height: 900 }
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
            viewportWidth: innerWidth,
            overflow: [...document.querySelectorAll('body *')].filter((element) => {
                const bounds = element.getBoundingClientRect();
                return bounds.width > 0 && (bounds.right > innerWidth || bounds.left < 0);
            }).map((element) => ({ tag: element.tagName, id: element.id, className: element.className, right: element.getBoundingClientRect().right }))
        };
    });
    assert.equal(layout.headerVisible, true, 'The header must stay in the viewport during play.');
    assert.equal(layout.wheelVisible, true, 'The wheel must fit below the header.');
    assert.equal(layout.controlVisible, true, 'Wheel controls must stay in the viewport.');
    assert.ok(layout.scrollWidth <= layout.viewportWidth, `The game must fit the viewport width (${layout.scrollWidth}/${layout.viewportWidth}): ${JSON.stringify(layout.overflow)}.`);
}

/** Check the visible selection controls through the real game page. */
async function assertSelectionFits(page) {
    const layout = await page.locator('#allergy-list').evaluate((list) => {
        const chips = [...list.querySelectorAll('.chip')];
        return {
            heights: chips.map((chip) => chip.getBoundingClientRect().height),
            visibleEmoji: chips.filter((chip) => {
                const emoji = chip.querySelector('.chip__emoji');
                if (!emoji || !emoji.textContent.trim()) return false;
                const bounds = emoji.getBoundingClientRect();
                const style = getComputedStyle(emoji);
                return bounds.width > 0 && bounds.height > 0 && style.visibility === 'visible' && style.opacity !== '0';
            }).length,
            overflow: chips.filter((chip) => {
                const bounds = chip.getBoundingClientRect();
                const children = [...chip.children];
                return chip.scrollWidth > chip.clientWidth || children.some((child) => {
                    if (child.getClientRects().length === 0 || getComputedStyle(child).opacity === '0') return false;
                    const childBounds = child.getBoundingClientRect();
                    return child.scrollWidth > child.clientWidth + 1
                        || childBounds.left < bounds.left + 2 || childBounds.right > bounds.right - 2
                        || childBounds.top < bounds.top + 2 || childBounds.bottom > bounds.bottom - 2;
                });
            }).map((chip) => chip.textContent),
            pageFits: document.documentElement.scrollWidth <= innerWidth,
            screenFits: document.documentElement.scrollHeight <= innerHeight,
            actionFits: document.querySelector('#start').scrollWidth <= document.querySelector('#start').clientWidth,
            actionBelowOptions: document.querySelector('#start').getBoundingClientRect().top >= list.getBoundingClientRect().bottom,
            headerControlHeights: [...document.querySelectorAll('.header-nav button, .aw-header-controls button')]
                .map((button) => button.getBoundingClientRect().height)
        };
    });
    assert.equal(layout.heights.length, 10, 'Every allergen must be available.');
    assert.equal(layout.visibleEmoji, 10, 'Every allergen must show its food icon at every viewport size.');
    assert.ok(Math.max(...layout.heights) - Math.min(...layout.heights) <= 1,
        `All allergen options must have equal heights (${layout.heights.join(', ')}).`);
    assert.ok(Math.min(...layout.heights) >= 44, 'All options must support touch input.');
    assert.ok(Math.max(...layout.heights) <= 80, `Allergen choices must stay compact (${layout.heights.join(', ')}).`);
    assert.deepEqual(layout.overflow, [], 'Allergen text, radio controls, and emoji must fit inside each option.');
    assert.equal(layout.pageFits, true, 'Selection must fit the viewport width.');
    assert.equal(layout.screenFits, true, 'The complete selection screen must fit without vertical scrolling.');
    assert.equal(layout.actionFits, true, 'The start action must contain its label and icon.');
    assert.equal(layout.actionBelowOptions, true, 'The start action must follow all allergen options.');
    assert.ok(Math.min(...layout.headerControlHeights) >= 44, 'Header buttons must support touch input.');
    assert.ok(Math.max(...layout.headerControlHeights) - Math.min(...layout.headerControlHeights) <= 1, 'Header action buttons must have equal heights.');
}

/** Verify the selection reminder grows rightward after a blocked start. */
async function assertSelectionReminderFits(page, screenshotPath) {
    const title = page.locator('#allergy-title');
    const initialLeft = await title.evaluate((element) => element.getBoundingClientRect().left);
    const startBounds = await page.locator('#start').boundingBox();
    await page.mouse.click(startBounds.x + startBounds.width / 2, startBounds.y + startBounds.height / 2);
    const frames = await title.evaluate((element) => {
        const animation = element.getAnimations()[0];
        if (!animation) throw new Error('A blocked start must animate the allergen heading.');
        animation.pause();
        const duration = Number(animation.effect.getTiming().duration);
        const textRange = document.createRange();
        textRange.selectNodeContents(element);
        const cardBounds = element.closest('.card').getBoundingClientRect();
        return [0, 0.3, 0.5, 0.7, 1, 1.3, 1.7, 2.3, 2.7].map((progress) => {
            animation.currentTime = duration * progress;
            const bounds = element.getBoundingClientRect();
            const textBounds = textRange.getBoundingClientRect();
            return {
                left: bounds.left,
                textFits: textBounds.left >= cardBounds.left && textBounds.right <= cardBounds.right
                    && textBounds.left >= 0 && textBounds.right <= innerWidth,
                pageFits: document.documentElement.scrollWidth <= innerWidth
            };
        });
    });
    if (screenshotPath) await page.screenshot({ path: screenshotPath });
    for (const frame of frames) {
        assert.ok(Math.abs(frame.left - initialLeft) <= 1,
            `The reminder must keep its left edge fixed while growing rightward (${initialLeft} → ${frame.left}).`);
        assert.equal(frame.textFits, true, 'The animated reminder must remain inside the card and viewport.');
        assert.equal(frame.pageFits, true, 'The animated reminder must not create horizontal scrolling.');
    }
    assert.equal(await page.locator('body').getAttribute('data-screen'), 'allergy');
    assert.equal(await page.locator('#allergy-list input:checked').count(), 0);
    await title.evaluate((element) => element.getAnimations().forEach((animation) => animation.finish()));
}

/** Verify all goal slots remain visible and separate from navigation. */
async function assertHeartGoalFits(page) {
    const layout = await page.locator('#hearts-bar').evaluate((bar) => {
        const bounds = bar.getBoundingClientRect();
        const nav = document.querySelector('#nav-toggle').getBoundingClientRect();
        const slots = [...bar.querySelectorAll('.heart')];
        return {
            slots: slots.length,
            visibleSlots: slots.filter((slot) => {
                const rect = slot.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0 && rect.left >= bounds.left && rect.right <= bounds.right;
            }).length,
            fits: bounds.left >= 0 && bounds.right <= innerWidth && bar.scrollWidth <= bar.clientWidth,
            separate: bounds.right <= nav.left || bounds.left >= nav.right || bounds.bottom <= nav.top || bounds.top >= nav.bottom
        };
    });
    assert.equal(layout.slots, 10);
    assert.equal(layout.visibleSlots, 10, 'All ten heart slots must remain visible.');
    assert.equal(layout.fits, true, 'The heart goal must fit the viewport.');
    assert.equal(layout.separate, true, 'Navigation and the heart goal must not overlap.');
}

const contentTypes = Object.freeze({
    html: 'text/html', js: 'text/javascript', css: 'text/css',
    json: 'application/json', svg: 'image/svg+xml'
});

execFileSync(process.execPath, ['scripts/build-mobile-game.mjs'], { stdio: 'inherit' });
const mobileSource = await readFile('mobile/generated/game.html', 'utf8');
const fontData = (await readFile('tests/fixtures/fredoka-one.ttf')).toString('base64');
const scenarios = viewports.flatMap((viewport) => ['offline', 'fredoka'].map((fontMode) => ({ viewport, fontMode })));
await mkdir(screenshotDirectory, { recursive: true });

for (const engine of [chromium, webkit]) {
    const browser = await engine.launch();
    try {
        for (const surface of ['browser', 'mobile']) {
            for (const { viewport, fontMode } of scenarios) {
                const gameViewport = { ...viewport, height: viewport.height - (surface === 'mobile' ? 44 : 0) };
                const context = await browser.newContext({ viewport: gameViewport, reducedMotion: 'reduce' });
                await context.route('**/*', async (route) => {
                    const url = new URL(route.request().url());
                    if (url.href === MobileLocation.GAME) return route.fulfill({ contentType: contentTypes.html, body: mobileSource });
                    if (url.hostname === 'fonts.googleapis.com' && fontMode === 'fredoka') {
                        return route.fulfill({ contentType: 'text/css', body: `@font-face { font-family: 'Fredoka One'; font-weight: 400; src: url(data:font/ttf;base64,${fontData}); }` });
                    }
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
                    await page.evaluate(() => document.fonts.ready);
                    if (fontMode === 'fredoka') {
                        assert.equal(await page.evaluate(async () => (await document.fonts.load('16px "Fredoka One"')).length > 0), true, 'The display font must load in font scenarios.');
                    }
                    const header = await page.locator('header').boundingBox();
                    assert.ok(header && header.height <= 172, `${surface} ${viewport.width}: header must leave room for the game (actual ${header?.height}).`);
                    await page.screenshot({ animations: 'disabled', path: `${screenshotDirectory}/${engine.name()}-${surface}-${viewport.width}-${fontMode}-selection.png`, fullPage: true });
                    await assertSelectionFits(page);
                    await assertSelectionReminderFits(page, viewport.width === 375 && fontMode === 'fredoka'
                        ? `${screenshotDirectory}/${engine.name()}-${surface}-reminder.png` : undefined);
                    await page.locator('input[value="italian_sausage"]').check();
                    await page.locator('input[value="italian_sausage"]').focus();
                    await assertSelectionFits(page);
                    await page.screenshot({ animations: 'disabled', path: `${screenshotDirectory}/${engine.name()}-${surface}-${viewport.width}-${fontMode}-selection.png`, fullPage: true });
                    await page.locator('input[value="peanuts"]').check();
                    await page.locator('#mute').click();
                    await page.locator('#start').click();
                    await assertWheelFits(page);
                    await assertHeartGoalFits(page);
                    await page.locator('#wheel-continue').click();
                    await page.locator('#reveal[aria-hidden="false"]').waitFor();
                    const resultLayout = await page.locator('#reveal').evaluate((overlay) => {
                        const card = overlay.querySelector('.reveal-card');
                        const bounds = card.getBoundingClientRect();
                        const title = overlay.querySelector('#dish-title');
                        title.scrollIntoView({ block: 'nearest' });
                        const titleBounds = title.getBoundingClientRect();
                        const cuisine = overlay.querySelector('#dish-cuisine');
                        const cuisineBounds = cuisine.getBoundingClientRect();
                        const headingBounds = title.parentElement.getBoundingClientRect();
                        const topElement = document.elementFromPoint(titleBounds.left + titleBounds.width / 2, titleBounds.top + titleBounds.height / 2);
                        return {
                            titleVisible: overlay.contains(topElement),
                            headingSharesRow: Math.abs(titleBounds.top - cuisineBounds.top) <= 1,
                            cuisineAtRight: Math.abs(cuisineBounds.right - headingBounds.right) <= 1,
                            headingDoesNotOverlap: titleBounds.right <= cuisineBounds.left,
                            cuisineIsSmaller: parseFloat(getComputedStyle(cuisine).fontSize) < parseFloat(getComputedStyle(title).fontSize),
                            fits: bounds.left >= 8 && bounds.right <= innerWidth - 8 && bounds.top >= 8 && bounds.bottom <= innerHeight - 8,
                            scrollFits: card.scrollWidth <= card.clientWidth,
                            width: bounds.width
                        };
                    });
                    assert.equal(resultLayout.titleVisible, true, 'The result title must appear above the header.');
                    assert.equal(resultLayout.headingSharesRow, true, 'The dish title and cuisine must start on the same row.');
                    assert.equal(resultLayout.cuisineAtRight, true, 'The cuisine must align with the right edge of the card content.');
                    assert.equal(resultLayout.headingDoesNotOverlap, true, 'The dish title and cuisine must not overlap.');
                    assert.equal(resultLayout.cuisineIsSmaller, true, 'The cuisine text must stay smaller than the dish title.');
                    assert.equal(resultLayout.fits, true, 'The result dialog must fit inside the viewport.');
                    assert.equal(resultLayout.scrollFits, true, 'Result content must wrap within the dialog.');
                    await page.locator('#again').scrollIntoViewIfNeeded();
                    await page.screenshot({ path: `${screenshotDirectory}/${engine.name()}-${surface}-${viewport.width}-${fontMode}-result.png` });
                    await page.locator('#again').click();
                    assert.equal(await page.locator('#reveal').getAttribute('aria-hidden'), 'true');
                    await assertWheelFits(page);
                    await assertHeartGoalFits(page);
                    await page.screenshot({ path: `${screenshotDirectory}/${engine.name()}-${surface}-${viewport.width}-${fontMode}-wheel.png` });
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
                    console.info(`${engine.name()} ${surface} ${viewport.width}×${viewport.height} ${fontMode}: header, result layering, wrapping, and Spin Again passed.`);
                } finally {
                    await context.close();
                }
            }
        }
    } finally {
        await browser.close();
    }
}
