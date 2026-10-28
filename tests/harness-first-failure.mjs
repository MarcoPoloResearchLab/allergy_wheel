// @ts-check
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { runGameFlow } from './game-flow.mjs';
import { runPageFlow, runWithOwnedCleanup } from '../scripts/page-flow.mjs';
import { execFileSync } from 'node:child_process';

for (const path of ['scripts/page-flow.mjs', 'tests/game-flow.mjs', 'tests/mobile-flow.mjs',
    'scripts/verify-feedback.mjs', 'scripts/verify-store-pages.mjs', 'scripts/run-browser-tests.mjs']) {
    execFileSync(process.execPath, ['--check', path], { stdio: 'inherit' });
}

const RESULT_KEY = '__ALLERGY_WHEEL_TEST_RESULTS__';
const FIRST_ERROR = 'controlled first failure';
const RUNTIME_ERROR = 'controlled uncaught page failure';
let laterRequests = 0;
const scenarios = [
    { name: 'first case stops later cases and suites', suites: [[false, true], [true]], calls: ['0:0'], passed: 0, failed: 1 },
    { name: 'prior success and first error remain visible', suites: [[true, false, true], [true]], calls: ['0:0', '0:1'], passed: 1, failed: 1 },
    { name: 'all successful cases complete', suites: [[true, true], [true]], calls: ['0:0', '0:1', '1:0'], passed: 3, failed: 0 },
];
const modules = new Map([
    ['/tests/harness.js', await readFile('tests/harness.js')],
    ['/tests/assert.js', await readFile('tests/assert.js')],
]);
const server = createServer((request, response) => {
    const url = new URL(request.url || '/', 'http://fixture.invalid');
    if (url.pathname === '/after-runtime-error') {
        laterRequests += 1; response.writeHead(200); response.end(); return;
    }
    if (url.pathname === '/waiter-rejection') {
        response.writeHead(200, { 'Content-Type': 'text/html' });
        response.end('<!doctype html><body><script>fetch("/reject-required-waiter");</script></body>');
        return;
    }
    if (url.pathname === '/reject-required-waiter') {
        response.writeHead(200); response.end(); return;
    }
    if (url.pathname === '/caught-error') {
        response.writeHead(200, { 'Content-Type': 'text/html' });
        response.end('<!doctype html><body><script>try { throw new Error("intentional caught fixture error"); } catch {} document.body.dataset.ready="true";</script></body>');
        return;
    }
    if (url.pathname === '/runtime-failure') {
        response.writeHead(200, { 'Content-Type': 'text/html' });
        response.end(`<!doctype html><body data-screen="allergy">
            <div id="loading" hidden></div><div id="load-error" hidden></div>
            <section id="screen-allergy"><input type="checkbox" value="peanuts"></section>
            <button id="start" aria-disabled="true">Start</button><button id="mute" aria-pressed="false">Mute</button>
            <script>throw new Error(${JSON.stringify(RUNTIME_ERROR)});</script>
            <script>
                document.querySelector('input').addEventListener('change', () => document.querySelector('#start').setAttribute('aria-disabled', 'false'));
                document.querySelector('#mute').addEventListener('click', event => event.currentTarget.setAttribute('aria-pressed', 'true'));
                document.querySelector('#start').addEventListener('click', () => {
                    fetch('/after-runtime-error'); document.body.dataset.screen = 'later-action-ran';
                });
            </script></body>`);
        return;
    }
    const module = modules.get(url.pathname);
    if (module) {
        response.writeHead(200, { 'Content-Type': 'text/javascript' });
        response.end(module);
        return;
    }
    const scenario = scenarios[Number(url.searchParams.get('scenario'))];
    if (url.pathname !== '/' || !scenario) {
        response.writeHead(404); response.end(); return;
    }
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.end(`<!doctype html><html><body><main id="results"></main><script type="module">
        import { defineSuite, runSuites } from '/tests/harness.js';
        window.executedCases = [];
        const suites = ${JSON.stringify(scenario.suites)};
        suites.forEach((cases, suiteIndex) => defineSuite('Suite ' + suiteIndex, test => {
            cases.forEach((success, caseIndex) => test('Case ' + caseIndex, () => {
                window.executedCases.push(suiteIndex + ':' + caseIndex);
                if (!success) throw new Error(${JSON.stringify(FIRST_ERROR)});
            }));
        }));
        runSuites(document.querySelector('#results'));
    </script></body></html>`);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
assert.ok(address && typeof address !== 'string');
/** @type {import('playwright').Browser | undefined} */
let browser;
/** @type {unknown[]} */
const errors = [];
let completed = 0;
try {
    browser = await chromium.launch();
    const contextsBefore = browser.contexts().length;
    let runtimeFailure;
    try { await runGameFlow(browser, `http://127.0.0.1:${address.port}/runtime-failure`); }
    catch (error) { runtimeFailure = error; }
    assert.equal(runtimeFailure?.message, RUNTIME_ERROR, 'Uncaught runtime failure must stop the real game flow first.');
    assert.equal(laterRequests, 0, 'No later action may send a request after the runtime failure.');
    assert.equal(browser.contexts().length, contextsBefore, 'The failed game flow must close its context.');
    const waiterContext = await browser.newContext();
    const waiterPage = await waiterContext.newPage();
    let waiterFailure;
    try {
        await runPageFlow(waiterPage, async track => {
            const pendingResponse = track(waiterPage.waitForResponse(`http://127.0.0.1:${address.port}/never-requested`));
            await waiterPage.goto(`http://127.0.0.1:${address.port}/runtime-failure`);
            await pendingResponse;
            throw new Error('Later waiter action ran.');
        });
    } catch (error) { waiterFailure = error; }
    assert.equal(waiterFailure?.message, RUNTIME_ERROR, 'The original error must precede canceled waiter errors.');
    assert.equal(waiterPage.isClosed(), true);
    assert.equal(waiterPage.listenerCount('pageerror'), 0);
    assert.equal(laterRequests, 0);
    const rejectedContext = await browser.newContext();
    const rejectedPage = await rejectedContext.newPage();
    const REQUIRED_ERROR = 'controlled required waiter rejection';
    let requiredFailure;
    try {
        await runPageFlow(rejectedPage, async track => {
            track(rejectedPage.waitForResponse(response => {
                if (new URL(response.url()).pathname !== '/reject-required-waiter') return false;
                throw new Error(REQUIRED_ERROR);
            }));
            const received = track(rejectedPage.waitForResponse(response => new URL(response.url()).pathname === '/reject-required-waiter'));
            await rejectedPage.goto(`http://127.0.0.1:${address.port}/waiter-rejection`);
            await received;
            await rejectedPage.evaluate(() => fetch('/after-runtime-error'));
        });
    } catch (error) { requiredFailure = error; }
    assert.match(requiredFailure?.message, /controlled required waiter rejection/);
    assert.equal(laterRequests, 0, 'A rejected required waiter must stop later requests.');
    assert.equal(rejectedPage.isClosed(), true);
    const caughtContext = await browser.newContext();
    const caughtPage = await caughtContext.newPage();
    let caughtControlCompleted = false;
    await runPageFlow(caughtPage, async () => {
        await caughtPage.goto(`http://127.0.0.1:${address.port}/caught-error`);
        assert.equal(await caughtPage.locator('body').getAttribute('data-ready'), 'true');
        caughtControlCompleted = true;
    });
    assert.equal(caughtControlCompleted, true, 'Intentional caught errors must permit successful flow.');
    assert.equal(caughtPage.isClosed(), true);
    assert.equal(caughtPage.listenerCount('pageerror'), 0);
    for (const [index, scenario] of scenarios.entries()) {
        const page = await browser.newPage();
        await page.goto(`http://127.0.0.1:${address.port}/?scenario=${index}`);
        await page.waitForFunction(key => Boolean(window[key]), RESULT_KEY);
        const observed = await page.evaluate(key => ({
            calls: window.executedCases,
            result: window[key],
            text: document.querySelector('#results').textContent,
            failedItems: [...document.querySelectorAll('.fail')].map(item => item.textContent),
            caseItems: document.querySelectorAll('li').length,
        }), RESULT_KEY);
        assert.deepEqual(observed.calls, scenario.calls, scenario.name);
        assert.deepEqual(observed.result.summary, { passed: scenario.passed, failed: scenario.failed }, scenario.name);
        assert.equal(observed.caseItems, scenario.calls.length, scenario.name);
        assert.match(observed.text, new RegExp(`Passed: ${scenario.passed} • Failed: ${scenario.failed}`));
        if (scenario.failed) {
            assert.equal(observed.result.suites.length, 1);
            assert.equal(observed.result.suites[0].tests.at(-1).errorMessage, FIRST_ERROR);
            assert.deepEqual(observed.failedItems, [`Case ${scenario.passed} — ${FIRST_ERROR}`]);
        } else {
            assert.equal(observed.result.suites.length, 2);
            assert.deepEqual(observed.failedItems, []);
        }
        completed += 1;
    }
    let cleanupFailure;
    let serverCleanupRan = false;
    try {
        await runWithOwnedCleanup(
            () => runGameFlow(browser, `http://127.0.0.1:${address.port}/runtime-failure`),
            [async () => { await browser.close(); throw new Error('controlled outer cleanup failure'); },
                async () => {
                    server.closeAllConnections();
                    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve(undefined)));
                    serverCleanupRan = true;
                }],
        );
    } catch (error) { cleanupFailure = error; }
    assert.ok(cleanupFailure instanceof AggregateError);
    assert.equal(cleanupFailure.errors[0].message, RUNTIME_ERROR);
    assert.equal(cleanupFailure.errors[1].message, 'controlled outer cleanup failure');
    assert.equal(serverCleanupRan, true, 'Server cleanup must run after a failed browser cleanup.');
    assert.equal(browser.isConnected(), false);
    assert.equal(server.listening, false);

} catch (error) {
    errors.push(error);
} finally {
    try { if (browser) await browser.close(); } catch (error) { errors.push(error); }
    if (server.listening) {
        server.closeAllConnections();
        try { await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve(undefined))); }
        catch (error) { errors.push(error); }
    }
    if (browser?.isConnected() || server.listening) errors.push(new Error('Owned browser/server cleanup failed.'));
    console.info(JSON.stringify({ completed, browserDisconnected: !browser?.isConnected(), serverClosed: !server.listening }));
}
if (errors.length === 1) throw errors[0];
if (errors.length > 1) throw new AggregateError(errors, 'Browser probe and cleanup failures; first error is preserved.');
console.info('Browser harness first-failure qualification passed.');
