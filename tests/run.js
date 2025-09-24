// @ts-check

import { runSuites } from "./harness.js";

import "./specs/listeners.test.js";
import "./specs/navigation.test.js";
import "./specs/startButtonState.test.js";
import "./specs/stateManager.test.js";

const resultsContainer = document.getElementById("test-results");
if (resultsContainer) {
    runSuites(resultsContainer);
}
