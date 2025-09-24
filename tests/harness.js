// @ts-check

import { assert } from "./assert.js";

/** @typedef {{ name: string, fn: () => void }} RegisteredTest */
/** @typedef {{ name: string, tests: RegisteredTest[] }} RegisteredSuite */
/** @typedef {"passed" | "failed"} CompletedTestStatus */
/** @typedef {{ name: string, status: CompletedTestStatus, errorMessage?: string }} CompletedTest */
/** @typedef {{ name: string, tests: CompletedTest[] }} CompletedSuite */
/** @typedef {{ summary: { passed: number, failed: number }, suites: CompletedSuite[] }} AggregatedTestResults */

const GLOBAL_RESULT_STORAGE_KEY = "__ALLERGY_WHEEL_TEST_RESULTS__";

const registeredSuites = [];

/**
 * Registers a suite of tests.
 *
 * @param {string} suiteName - Human readable suite name.
 * @param {(test: (name: string, fn: () => void) => void) => void} suiteDefinition - Callback that registers individual tests.
 * @returns {void}
 */
export function defineSuite(suiteName, suiteDefinition) {
    assert(typeof suiteName === "string" && suiteName.length > 0, "Suite name must be provided");
    const suiteRecord = { name: suiteName, tests: [] };
    registeredSuites.push(suiteRecord);
    const testRegistrar = (testName, testFn) => {
        assert(typeof testName === "string" && testName.length > 0, "Test name must be provided");
        assert(typeof testFn === "function", "Test function must be provided");
        suiteRecord.tests.push({ name: testName, fn: testFn });
    };
    suiteDefinition(testRegistrar);
}

/**
 * Executes all registered suites and renders the results.
 *
 * @param {HTMLElement} resultsContainer - Element where the summary and detailed results will be appended.
 * @returns {void}
 */
export function runSuites(resultsContainer) {
    const summary = { passed: 0, failed: 0 };
    /** @type {CompletedSuite[]} */
    const aggregatedSuites = [];
    const globalScope = /** @type {Record<string, unknown>} */ (globalThis);
    globalScope[GLOBAL_RESULT_STORAGE_KEY] = undefined;
    const summaryHeading = document.createElement("h1");
    summaryHeading.textContent = "Test Results";
    resultsContainer.appendChild(summaryHeading);

    for (const suite of registeredSuites) {
        const suiteSection = document.createElement("section");
        const suiteHeading = document.createElement("h2");
        suiteHeading.textContent = suite.name;
        suiteSection.appendChild(suiteHeading);

        const listElement = document.createElement("ul");
        suiteSection.appendChild(listElement);
        const suiteAggregate = { name: suite.name, tests: [] };
        aggregatedSuites.push(suiteAggregate);

        for (const testCase of suite.tests) {
            const listItem = document.createElement("li");
            listItem.textContent = testCase.name;
            try {
                testCase.fn();
                listItem.className = "pass";
                summary.passed += 1;
                suiteAggregate.tests.push({ name: testCase.name, status: "passed" });
            } catch (error) {
                listItem.className = "fail";
                const message = error instanceof Error ? error.message : String(error);
                listItem.appendChild(document.createTextNode(` — ${message}`));
                summary.failed += 1;
                suiteAggregate.tests.push({
                    name: testCase.name,
                    status: "failed",
                    errorMessage: message
                });
            }
            listElement.appendChild(listItem);
        }

        resultsContainer.appendChild(suiteSection);
    }

    const footer = document.createElement("p");
    footer.textContent = `Passed: ${summary.passed} • Failed: ${summary.failed}`;
    resultsContainer.appendChild(footer);

    /** @type {AggregatedTestResults} */
    const aggregatedResults = {
        summary: { passed: summary.passed, failed: summary.failed },
        suites: aggregatedSuites
    };
    globalScope[GLOBAL_RESULT_STORAGE_KEY] = aggregatedResults;
}
