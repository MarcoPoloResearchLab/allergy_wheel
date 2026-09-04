// @ts-check

import { defineSuite } from "../harness.js";
import { assert, assertEqual } from "../assert.js";

defineSuite("Browser test report", (test) => {
    test("keeps completed suite results visible after fixture cleanup", () => {
        const resultsContainer = document.getElementById("test-results");
        if (!(resultsContainer instanceof HTMLElement)) {
            throw new Error("The browser test report must remain in the document after fixture cleanup.");
        }

        assert(resultsContainer.getClientRects().length > 0, "The report must have a visible layout.");
        assertEqual(
            resultsContainer.querySelector("h1")?.textContent,
            "Test Results",
            "The report heading must remain visible."
        );
        assert(
            resultsContainer.querySelectorAll("section h2").length > 0,
            "Completed suites must remain in the report."
        );
        assert(
            resultsContainer.querySelectorAll("li.pass, li.fail").length > 0,
            "Completed test results must remain in the report."
        );
    });
});
