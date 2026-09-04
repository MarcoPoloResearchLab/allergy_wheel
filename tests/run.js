// @ts-check

import { runSuites } from "./harness.js";

import "./specs/listeners.test.js";
import "./specs/navigation.test.js";
import "./specs/startButtonState.test.js";
import "./specs/stateManager.test.js";
// Run this suite last to verify that fixture cleanup preserves prior reports.
import "./specs/report.test.js";

const resultsContainer = document.getElementById("test-results");
if (resultsContainer) {
    runSuites(resultsContainer);
}
