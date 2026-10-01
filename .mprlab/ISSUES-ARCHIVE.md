# ISSUES Archive

Closed non-recurring entries retain their complete records and identifiers.
Dated evidence describes the source and environment at that time.
Current requirements are in `MOBILE-READINESS.md` and `STORE-READINESS.md`.

## BugFixes

- [x] [B044] (P1) Restore the native iOS release adapter.
  Goal: Use the current Gateway contract for both mobile platforms.
  Evidence: Gateway 5.0.0 rejects the iOS shell adapter and cloud iOS operation.
  The new adapter integration test failed before the correction.
  Requirements:
  - Use a JavaScript adapter for each native platform.
  - Send schema 3 requests to `mobile-build-operation`.
  - Keep signing and store delivery in Gateway.
  Resolution: Both platforms now use the shared application adapter.
  The obsolete cloud declaration and hooks are removed.
  Validation: The adapter, private input, and process tests passed in Docker.
  The installed Gateway accepted both request schemas and the selected mobile resource.
  The contract check stopped before build intent creation and signing.
  Signed artifact and store acceptance remain separate requirements.

- [x] [B045] (P2) Select a dedicated aggregate LoopAware site.
  Goal: Accept automatic native counts under the restricted collector contract.
  Evidence: The feedback site returned HTTP 409 with `traffic_profile_conflict` for a count request.
  The new native service test rejects a shared feedback and count site.
  Requirements:
  - Use a dedicated site with the `aggregate` traffic profile.
  - Permit the native origin `https://allergy-wheel-parents.invalid`.
  - Verify HTTP 204 through the live collector before artifact preparation.
  Resolution: The count endpoint now uses site `eaf3654a-9f9b-4e86-9262-558201a6e276`.
  LoopAware stores daily totals for this site.
  The primary origin is `https://allergy-wheel-counts.invalid`.
  The additional traffic origin is `https://allergy-wheel-parents.invalid`.
  The feedback endpoint retains its existing site.
  Validation: The live collector returned HTTP 204 from the native origin on October 1, 2026.
  The saved site and traffic origin remained present after a dashboard reload.
  `make test-mobile` passed in Docker after the endpoint correction.
  The generated package and both preparation records now contain the corrected input.
  Final `make ci` passed in Docker.

- [x] [B043] (P0) Align the Expo SDK 57 dependency contract.
  Goal: Pass the mobile dependency check with the current SDK 57 packages.
  Requirements:
  - Update Expo and its package lock together.
  - Update the native files through the repository preparation target.
  Validation: The initial mobile check rejected two Expo package versions.
  The corrected `make ci` passed, including browser, mobile, native, and local startup tests.
  Resolution: Expo uses version 57.0.26. Expo SystemUI uses version 57.0.4.
  The dependency audit passed after the brace-expansion update.

- [x] [B010] (P1) Preserve the local game on repeated startup
  Goal:
  Repeated `make up` must preserve the running local container.

  Evidence:
  Final CI replaced the container during the second startup with Docker Compose v5.4.0.
  The existing public local command test rejected the changed container identifier.
  The failure log is `/tmp/allergy-native-review-final-ci.log`.

  Requirements:
  - Preserve the existing local container during startup.
  - Document the shutdown and startup sequence for local configuration changes.
  - Verify the existing local command integration test and final CI.

  Validation:
  The existing public local command test passed after the startup correction.
  It also passed in the selected source fixture, which excludes concurrent analytics changes.
  Corrected final CI passed with Docker Compose v5.4.0.
  The focused log is `/tmp/allergy-b010-fixed.log`.

- [x] [B009] (P1) Select native source dependencies explicitly
  Goal:
  Native dependency selection must remain unchanged when a prebuilt service is unavailable.

  Evidence:
  The generated properties do not select React Native or Expo source dependencies.
  React Native can change its selected dependency graph after a prebuilt service check fails.

  Requirements:
  - Exercise an unavailable prebuilt service through actual CocoaPods.
  - Select source dependencies through the application plugin.
  - Override inherited prebuilt flags with the declared source selection.
  - Regenerate native output and verify the deployment install preserves its lock.

  Validation:
  The unavailable-service case first failed during actual CocoaPods evaluation.
  Native preparation passed all four cases after the source plugin correction.
  The deployment install preserved the lockfile. Existing dependency versions and app metadata stayed unchanged.
  The selected Apple source separately passed all four CocoaPods cases.
  Corrected final CI passed. The initial failure log is `/tmp/allergy-b009-initial.log`.

- [x] [B008] (P1) Reject invalid native dependency configuration
  Goal:
  CocoaPods must reject absent or malformed native properties.

  Evidence:
  The generated Podfile replaces property read and parse errors with an empty object.

  Requirements:
  - Exercise valid, missing, and malformed properties through actual CocoaPods.
  - Remove error recovery from the source plugin output.

  Validation:
  Actual CocoaPods first accepted missing and malformed properties.
  All three property cases passed after the source plugin correction and native regeneration.
  The focused logs are `/tmp/allergy-b008-initial.log` and `/tmp/allergy-b008-fixed.log`.
  Corrected final CI passed.

- [x] [B007] (P1) Remove the absent native test target from the shared scheme
  Goal:
  The generated shared scheme must reference only targets in the Xcode project.

  Evidence:
  The scheme references AllergyWheelTests, but the generated project contains no such target.

  Requirements:
  - Verify scheme references through the real Expo generator.
  - Correct the source plugin and regenerate the retained project.

  Validation:
  The real Expo generator test first failed on the absent test target and passed after the plugin correction.
  Native preparation regenerated the retained scheme. Corrected final CI passed.
  The focused logs are `/tmp/allergy-b007-initial.log` and `/tmp/allergy-b007-fixed.log`.

- [x] [B006] (P1) Preserve the source version in native preparation
  Goal:
  Both generated platforms must use the version from the Expo application config.

  Evidence:
  The Android release plugin hardcodes development version 1.0.0.
  The existing generator test checks only the initial application version.

  Requirements:
  - Verify a different source version through the real Expo generator.
  - Use the source version in generated Android and Apple projects.
  - Prepare the selected release version 1.0.1 before the cloud build.

  Validation:
  The real Expo generator first failed because Android retained version 1.0.0 for source version 3.2.1.
  After the plugin correction, both Apple configurations and Android used the supplied source version.
  `make mobile-prepare-store` generated both platforms from application version 1.0.1.
  Final `make ci` passed, including native preparation, the production bundle, browser flows, and dependency audits.
  The final log is `/tmp/allergy-version-final-ci.log`.
  Concurrent analytics changes remain separate from this correction.

- [x] [B001] (P1) Run browser CI for the default branch
  Goal:
  Browser CI must run when the default branch receives a push.

  Requirements:
  - Use the current GitHub default branch, `master`.
  - Keep the pull request trigger.

  Evidence:
  `.github/workflows/browser-tests.yml` selects `main` for push events.
  GitHub reports `master` as the default branch.
  Expected: a push to `master` selects the browser workflow.
  Actual: the branch filter excludes that push.

  Deliverables:
  - Correct the workflow branch filter.
  - Record the trigger validation.

  Validation:
  - Verify that the workflow accepts the default branch and pull requests.
  - After an authorized push, record the matching GitHub Actions run.

  Resolution:
  On September 4, 2026, the local correction changed the push branch from `main` to `master`.
  The branch check failed before the correction and passed after it.
  The pull request trigger remains present.
  Remote execution remains unverified until an authorized push.

- [x] [B002] (P2) Keep the browser test report visible
  Goal:
  The manual browser harness must show its test results.

  Requirements:
  - Keep test fixtures separate from the report container.
  - Preserve the machine-readable test result.

  Evidence:
  `tests/specs/listeners.test.js` replaces `document.body.innerHTML` during test cases.
  On September 4, 2026, `tests/index.html` produced an empty page body.
  The result object reported 14 passed tests and zero failed tests.
  Expected: the page shows its report and totals.
  Actual: the test fixtures remove the report container.

  Deliverables:
  - Correct the fixture boundary in the browser harness.
  - Add a browser integration test for the visible report.

  Validation:
  - Confirm the new integration test fails before the correction.
  - Confirm the report and machine-readable totals agree after the correction.

  Resolution:
  On September 4, 2026, the listener tests received a dedicated fixture container.
  The new report regression failed before the correction with 14 passed tests and one failed test.
  After the correction, all 15 browser tests passed.
  The visible report and machine-readable result both contained 15 passed tests and zero failed tests.
  Fixture cleanup left no button controls in the document.
  The final `make ci` command failed because the repository has no `ci` target.
  I004 owns that command gap.

- [x] [B003] (P2) Report feedback readiness after widget initialization
  Goal:
  The parent area must report success only after LoopAware supplies usable feedback controls.

  Evidence:
  The script load promise resolves before the widget configuration request completes.
  A 403 or 404 configuration response prevents the widget from rendering.
  The parent area still reports success and disables the feedback button.

  Requirements:
  - Verify widget initialization before the parent area reports readiness.
  - Show a failure and allow another attempt when initialization fails.
  - Keep the readiness state pending while configuration remains incomplete.
  - Preserve the parent gate and optional service selection.

  Validation:
  - Reproduce 403 and 404 configuration responses after a successful script download.
  - Verify delayed success and retry through the packaged parent document with the real widget script.
  - Run the focused mobile test and final `make ci`.

  Implementation:
  The regression first failed because the parent area reported readiness while widget configuration remained pending.
  The feedback adapter now waits for the launcher, panel, and contact input.
  A script error or a 10-second initialization timeout reports failure and permits another attempt.
  Completion removes the observer and timer. Failure also removes the script and incomplete controls.
  The parent area shows a pending message when a service action starts.

  Focused Validation:
  `make test-mobile` passed with the actual LoopAware widget script and controlled configuration responses.
  The cases cover 403, 404, delayed readiness, and successful retry.
  The tests open the actual feedback form after a successful retry.
  No feedback submission or live provider request occurred.

  Resolution:
  Final `make ci` passed with 64 source files, the browser flows, and the packaged mobile flows.
  The Governor check and mechanical documentation checks passed.
  The working tree contains the B003 correction.

- [x] [B004] (P1) {I002} Use a canonical repository identifier for GitHub Pages
  Goal:
  The website resource must pass the gateway repository validation during release.

  Evidence:
  The owner reported that `make release` failed with `app_lifecycle.invalid_resource` for the website resource.
  The failing assertion uses `mprlab_repository_pattern`.
  The gateway pattern accepts only lowercase owner and repository identifiers.
  The manifest contains `MarcoPoloResearchLab/allergy_wheel`, which fails that pattern.
  The Pages artifact test does not read the selected manifest.

  Requirements:
  - Use `marcopoloresearchlab/allergy_wheel` as the canonical repository identifier.
  - Preserve the selected domain, publication branch, artifact source, and release marker path.
  - Validate the actual selected manifest through the Docker Pages target before release.
  - Keep private deployment inputs outside the test image and publication artifact.

  Validation:
  - Confirm that the Pages target fails on the current mixed-case repository identifier.
  - Confirm that the target passes after the manifest correction.
  - Run `make ci`, the Governor check, and the documentation checks.
  - Record source validation separately from an actual release or publication result.

  Implementation:
  The manifest now uses `marcopoloresearchlab/allergy_wheel`.
  The domain, publication branch, artifact source, and release marker path remain the same.
  The test image includes only the public manifest from the deployment directory.
  The Pages test reads that manifest through the locked YAML parser.
  It checks the canonical repository identifier, publication branch, URL, and published `CNAME`.
  It also verifies that the publication artifact excludes `.mprlab`.

  Focused Validation:
  The new `make test-pages` regression failed on `MarcoPoloResearchLab/allergy_wheel` before the manifest correction.
  The same target passed after the correction.

  Resolution:
  Final `make ci` passed with 64 source files, browser and mobile flows, Pages validation, and local command checks.
  The Expo dependency check passed. The mobile runtime audit found no vulnerabilities.
  The Governor check, mechanical documentation checks, and changed-prose review passed.
  These results validate the working tree. No release, publication, or deployment operation was run for B004.

## Improvements

- [x] [I005] (P1) Use the shared native iOS release flow
  Goal:
  Build Apple release artifacts through the current Gateway native operation.

  Requirements:
  - Apply the shared Apple guide from MPR Governor.
  - Declare the JavaScript adapter in the selected mobile resource.
  - Use schema 3 and `mobile-build-operation` for iOS and Android.
  - Keep Apple signing, certificates, provisioning, and export in Gateway.
  - Use the sealed IPA for the selected App Store destination.
  - Keep public store release under operator control.

  Implementation:
  The earlier Xcode Cloud migration passed its local tests but did not establish hosted build acceptance.
  Gateway 5.0.0 now reserves Xcode Cloud for macOS.
  B044 replaces the obsolete iOS cloud flow with the native adapter.
  The shared Apple guide and mobile rules describe the current contract.
  The application adapter retains the allocated version and UTC build number.
  Both platforms use the shared native operation.
  The application declares signing variable names and provisioning API references.
  Gateway owns the temporary Keychain and certificate import.
  The preparation record excludes machine-local inputs.

  Validation:
  The Docker adapter tests passed for both platforms and exact retries.
  The private input and process control tests passed.
  The installed Gateway accepted both request schemas and the mobile resource.
  This check stopped before build intent creation and signing.
  A signed IPA remains required for artifact acceptance.

  Resolution On October 1, 2026:
  The shared native adapter implementation and required code validation are completed.
  `make test-release-adapter` passed in Docker for both platforms, exact retries, private inputs, and process control.
  Signed IPA production, artifact acceptance, and store delivery remain separate operations in `STORE-READINESS.md`.
  This closure does not establish a signed IPA or public store availability.

- [x] [I001] (P1) Establish real game integration coverage
  Goal:
  Agents need repeatable validation through the real game page.

  Requirements:
  - Keep the selected toolchain consistent with root instructions and the README.
  - Add integration tests through `index.html` with real game components and catalogs.
  - Cover allergen selection, Stop, automatic stop, result reveal, restart, mute, and navigation.
  - Replace isolated tests and repository-component stubs with public behavior coverage.

  Evidence:
  The current tests include isolated helpers and a state-manager stub.
  I004 provides Docker-based validation commands without a host Node installation.

  Deliverables:
  - Extend the existing runner with real game integration tests.
  - Record browser coverage and its limitations.
  - Update the contributor instructions.

  Validation:
  - Verify the commands from a clean primary checkout with the documented prerequisites.
  - Confirm tests reach the real game page and repository-owned components.
  - Record the final `make ci` result.

  Resolution:
  On September 7, 2026, the Docker runner gained real game flows through `index.html`.
  The flows cover selection, Stop, automatic stop, results, restart, mute, and navigation.
  The listener suite with a state-manager stub was replaced by these flows.
  The manual browser report remains covered.
  Focused validation passed with 10 harness tests and the real game flow.
  Final `make ci` passed with 62 source files validated, the browser flows, and the offline mobile flows.

  The README describes the current test commands and their limits.

- [x] [I002] (P1) Prepare the GitHub Pages publication contract
  Goal:
  The production declaration must meet the current Governor contract.

  Requirements:
  - Inspect the current MPR lifecycle contract before a manifest change.
  - Declare the browser frontend in `.mprlab/deploy/resources.yml`.
  - Use the versionless `owner`, `release`, and `resources` contract.
  - Declare a `github_pages` resource for the verified repository and domain.
  - Use `gh-pages` as the publication branch.
  - Preserve the local browser startup path.
  - Prepare the artifact contents, release marker, and domain verification steps.
  - Obtain an explicit deployment request before changes to the live Pages configuration.

  Evidence:
  GitHub Pages serves `allergy.mprlab.com` from the repository root on `master`.
  The selected deployment manifest is absent.

  Deliverables:
  - Supply the selected manifest and publication procedure.
  - Record the transition from the current Pages source.

  Validation:
  - Run the Governor check after the manifest change.
  - Verify the static artifact contains all required game resources.
  - After authorized publication, verify the website and `/.mprlab-release.json`.

  Resolution:
  On September 7, 2026, the versionless Pages manifest and static artifact source were added.
  The selected resource uses `gh-pages`, the existing repository, and `allergy.mprlab.com`.
  The Make lifecycle wrapper delegates to the sibling MPR gateway.
  The Pages artifact test and Governor check passed.
  The publication procedure is in `.mprlab/MOBILE-READINESS.md`.
  The GitHub API still reported `master` as the live Pages source.
  No release, publication, deployment, or live configuration change occurred.

- [x] [I003] (P1) {I001} Enforce component connections at the composition root
  Goal:
  The game components must connect through `js/core/app.js`.

  Requirements:
  - Inventory imports between game components.
  - Move component connections to the composition root.
  - Keep general utilities, constants, and types as shared dependencies.
  - Preserve public wheel, audio, and UI APIs.
  - Preserve the current game behavior.

  Evidence:
  `js/utils/listeners.js` imports `updateWheelRestartControlVisibilityFromRevealState` from `js/ui/ui.js`.
  This connection bypasses the composition root.

  Deliverables:
  - Supply explicit component dependencies through the composition root.
  - Document the resulting module boundaries.

  Validation:
  - Add characterization coverage before the refactor if the affected behavior lacks coverage.
  - Run the affected game integration tests before and after the refactor.
  - Verify that component imports meet the root contract.

  Resolution:
  On September 7, 2026, the listener binder received its UI operation through `js/core/app.js`.
  The real game characterization passed before and after the refactor.
  The import inventory found no remaining direct imports between game components.
  Constants, types, and general utilities remain shared dependencies.

- [x] [I004] (P1) Add local startup and validation commands
  Goal:
  Contributors can start, stop, and validate the game through Make.

  Requirements:
  - Supply `make up`, `make down`, `make test`, and `make ci`.
  - Keep Node and npm test tools inside Docker.
  - Serve the game on the local host with current source files.
  - Keep local commands separate from production publication.
  - Run the same validation command in GitHub Actions.
  - Document prerequisites and the separate Governor check.

  Evidence:
  The initial `make ci` call failed because its target was absent.
  The new local command integration test failed because `up` and `down` were absent.

  Deliverables:
  - Supply the Makefile, local Compose configuration, and test image.
  - Add integration coverage for startup and shutdown.
  - Align the root instructions, README, and CI workflow.

  Validation:
  - Verify HTTP responses contain the current game source and catalogs.
  - Verify repeated startup preserves the running container.
  - Verify shutdown removes the test project and stops HTTP responses.
  - Verify repeated shutdown succeeds.
  - Run the Governor check and final `make ci`.

  Resolution:
  On September 4, 2026, the final local `make ci` command passed.
  It validated 37 JavaScript and JSON files and passed all 15 browser tests.
  The local command integration test passed startup, current source, repeated startup, shutdown, and repeated shutdown.
  The test removed its temporary container and network.
  The Governor check passed with the frontend and Docker guides.
  GitHub Actions now selects `make ci` for `master` pushes and pull requests.
  Remote execution remains unverified until an authorized push.

## Planning

- [x] [P001] (P1) Select the mobile delivery path and toolchain
  Goal:
  A recorded decision must resolve the first release scope and the mobile packaging toolchain.

  Requirements:
  - Read `.mprlab/MOBILE-READINESS.md` and the current source before the decision.
  - Compare PWA installation, native store packages, and direct downloads for the required platforms.
  - Resolve which mobile packaging tools the CDN-only game can use.
  - Record the supported platforms, device versions, and required offline behavior.
  - Record the selected path and the reasons for it.
  - Keep this issue limited to analysis and decisions.

  Open Decisions:
  No owner decision remains for device support.
  Support Android and iOS phones and tablets with the OS versions supported by the selected toolchain.

  Completed Analysis:
  The generated projects establish the minimum OS versions.
  The README records the resource adapter, native prerequisites, and offline font choice.

  Owner Decisions:
  On September 7, 2026, the owner selected Android and iOS, with distribution through their app stores.
  The website must provide verified store links when ready and use OS detection when possible.
  The owner requested the toolchain used by Hecate, LoopAware, and StillPuzzle.
  Each inspected project uses Expo and React Native.
  This selects Expo and React Native for the mobile shell. Capacitor is no longer the candidate path.

  Toolchain Boundary:
  Keep the browser game in JavaScript with its current ES modules and component APIs.
  Apply the CDN-only rule to the browser game dependencies.
  Use package dependencies for the separate Expo mobile shell and its build tools.
  Keep browser test tooling inside Docker through Make.
  Define native build prerequisites before mobile implementation.

  Offline Interpretation:
  The owner questioned any internet requirement for a game with static files.
  Package the game code, catalogs, images, and audio for the first launch without external network access.
  Keep external services independent of game startup and game rounds.
  Keep external fonts available online and define readable text for offline play.

  Evidence:
  The September 7 source review inspected Hecate and LoopAware `mobile/package.json` and StillPuzzle `package.json`.
  The inspected projects use Expo SDK 57 and React Native 0.86 with different patch versions.
  StillPuzzle also includes `react-native-webview`, but its game is not evidence of an existing Allergy Wheel mobile adapter.
  `.mprlab/MOBILE-READINESS.md` records source evidence and the remaining analysis.

  Deliverables:
  - Update the current requirements with the owner decisions.
  - Update F001 and F002 with executable acceptance criteria.

  Validation:
  - Confirm each implementation requirement has a source requirement or an owner decision.
  - Confirm the selected toolchain agrees with the root instructions.

  Resolution:
  On September 7, 2026, the generated Expo SDK 57 projects established Android API 24 and iOS 16.4 as minimums.
  The native toolchain, packaged WebView adapter, and system sans-serif font are documented in `.mprlab/MOBILE-READINESS.md`.
  All product decisions and technical choices required for this implementation are recorded.

