// @ts-check

import { runSuites } from "./harness.js";

import "./specs/stateManager.test.js";
import "./specs/startButtonState.test.js";
import "./specs/summary.test.js";
import "./specs/navigation.test.js";

const resultsContainer = document.getElementById("test-results");
if (resultsContainer) {
    runSuites(resultsContainer);
}
