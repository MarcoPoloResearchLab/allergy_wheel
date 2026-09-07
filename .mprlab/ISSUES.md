# ISSUES

Entries record newly discovered requests or changes.

Read `AGENTS.md`, `.mprlab/POLICY.md`, `.mprlab/issues-md-format.md`, and relevant stack guides before implementing changes.

Format: `- [ ] [B042] (P1) {I007} Title`

## BugFixes

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

## Improvements

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

## Maintenance

- [ ] [M400R] (P2) Backlog hygiene and archive
  Goal:
  Keep the issue tracker reliable, readable, and focused on active work while preserving resolved history in the appropriate archive.

  Requirements:
  - Cadence: run weekly during active development and before each release cut.
  - Validate section names, identifier prefixes, recurrence suffixes, priority markers, dependencies, and duplicate IDs against the current `issues-md-format.md`.
  - Reconcile stale statuses, duplicate issues, broken references, obsolete instructions, and entries filed in the incorrect section.
  - Before archival, update source documents with durable results from each resolved non-recurring issue.
  - Preserve the complete issue entry and its ID in the repository archive.
  - Keep active, blocked, planning, and recurring entries visible in `ISSUES.md`.

  Deliverables:
  - Normalized `ISSUES.md` structure and statuses.
  - Updated archive with complete entries removed from the active tracker.
  - A short `Last run:` note summarizing the cleanup and any follow-up issues filed.

  Validation:
  - Read `ISSUES.md` after edits and confirm that each issue is in the correct section.
  - Confirm that each issue has a unique section-aware ID.
  - Confirm recurring entries remain open and keep the `R` suffix.
  - Confirm no active, blocked, recurring, or planning work was archived.

- [ ] [M401R] (P2) Polish open issues
  Goal:
  Keep unresolved work executable by making each open issue concrete, ordered, and testable.

  Requirements:
  - Cadence: run weekly during active development and before handing a repo to automated execution.
  - Review every unresolved non-recurring issue for missing context, dependencies, repro steps, acceptance criteria, and validation expectations.
  - Make priorities concrete and make sure that each open issue has actionable deliverables.
  - Merge duplicate open issues or add explicit dependency links when separate entries must remain.
  - Do not close or implement issues as part of this polish pass unless that work is separately requested.

  Deliverables:
  - Open issues with enough detail for a person or agent to execute without rediscovery.
  - New or updated dependency markers where ordering matters.
  - A short `Last run:` note listing the number of issues polished and any blockers found.

  Validation:
  - Sample the open entries after the pass and confirm each has clear next actions and validation expectations.
  - Confirm that no recurring runbook has a closed status.
  - Confirm duplicates were merged or explicitly cross-referenced.

- [ ] [M402R] (P2) Architecture and policy review
  Goal:
  Catch architecture, policy, and workflow drift before it becomes hidden maintenance debt.

  Requirements:
  - Cadence: run monthly, before large refactors, and after major framework or runtime changes.
  - Review the codebase, docs, and workflow against `AGENTS.md`, `POLICY.md`, stack guides, and the current architecture notes.
  - Look for drift from forward-only contracts, edge-validation boundaries, smart-constructor usage, testing policy, and module ownership.
  - Classify each finding by its requested outcome. Record concrete scope, priority, and validation.
  - Close the pass with a no-action note only when the review finds no actionable drift.

  Deliverables:
  - Correctly classified issues for each actionable architecture or policy drift finding.
  - Updated notes on areas reviewed and areas intentionally left unchanged.
  - A short `Last run:` note with the review scope and outcome.

  Validation:
  - Confirm every finding is represented as an issue with owner-readable context and validation criteria.
  - Confirm no implementation changes were mixed into the review runbook unless separately requested.
  - Confirm all recurring runbooks remain open.

- [ ] [M403R] (P1) Dependency and security audit
  Goal:
  Keep third-party dependencies, runtime versions, and security-sensitive configuration within the current supported contract.

  Requirements:
  - Cadence: run weekly for active apps and before each release cut.
  - Inspect package managers, lockfiles, language toolchains, container bases, and generated clients for known vulnerabilities or stale direct dependencies.
  - Review auth, secret, CORS, CSP, SQL, network, and service-authorization configuration for drift from the current contract.
  - Prefer current supported dependencies.
  - Do not add compatibility shims for obsolete dependency behavior.
  - File each actionable vulnerability, unsupported runtime, or security-contract gap under its outcome-based issue section.

  Deliverables:
  - Documented audit commands or data sources used for the pass.
  - Updated issues for each actionable dependency or security finding.
  - A short `Last run:` note with clean result or follow-up issue IDs.

  Validation:
  - Rerun the repository-native audit, lint, or dependency checks used for the pass.
  - Confirm every finding is either filed, fixed under a separate issue, or explicitly marked not applicable with evidence.
  - Confirm no secrets or private payloads were written into the tracker.

- [ ] [M404R] (P1) CI, release, and artifact health
  Goal:
  Keep the repository's validation, release, publication, and generated artifact surfaces trustworthy.

  Requirements:
  - Cadence: run before every release, publish, or deploy, and weekly for critical services.
  - Verify repository-native CI, lint, format, coverage, release, publish, Docker image, Pages, and artifact workflows still match the documented contract.
  - Do a check of generated artifacts, release tags, published images, and Pages outputs for source-to-public drift.
  - File concrete follow-up issues for failing gates, stale artifacts, missing release prerequisites, or undocumented workflow changes.
  - Do a production deployment only when the operator explicitly requests it.

  Deliverables:
  - Recorded gate status and artifact surfaces inspected.
  - Follow-up issues for each reproducible CI, release, publish, or artifact drift problem.
  - A short `Last run:` note with commands run and any skipped surfaces.

  Validation:
  - Use repository-native `make` targets or documented release helpers for checks.
  - Confirm release and deployment ownership boundaries remain separate.
  - Confirm public or published artifacts match the intended source revision when that surface is inspected.

- [ ] [M405R] (P1) Code contract and static hygiene
  Goal:
  Keep source contracts explicit, current, and statically guarded against policy drift.

  Requirements:
  - Cadence: run monthly and before large refactors.
  - Scan for dead code, unused exports, duplicated literals, silent fallbacks, legacy aliases, compatibility reads, and zero-but-invalid domain states.
  - Do a check of static analysis, coverage, schema, and contract guards that prevent drift.
  - File each concrete violation under its outcome-based issue section.
  - Keep only the current canonical contract.
  - Preserve obsolete behavior only when a current product requirement explicitly specifies it.

  Deliverables:
  - Issue entries for each actionable static hygiene or contract violation.
  - Notes on static tools, searches, and contract guards used during the pass.
  - A short `Last run:` note with clean result or follow-up issue IDs.

  Validation:
  - Rerun the relevant static checks, contract tests, or repository searches used to identify drift.
  - Confirm every finding has a narrow follow-up issue and does not duplicate existing backlog work.
  - Confirm no implementation changes were mixed into the audit unless separately requested.

- [ ] [M406R] (P1) Production drift and health
  Goal:
  Detect drift between runtime state and the intended repository contract.

  Requirements:
  - Cadence: run weekly for deployed services and after each publish or deploy.
  - Compare current source, runtime configuration, published images, public routes, scheduled jobs, and health checks for drift.
  - Inspect real operator-facing surfaces rather than assuming merged source is deployed.
  - File follow-up issues for stale images, stale Pages output, missing routes, failed monitors, invalid production config, or undocumented runtime differences.
  - Stop before production deploy or destructive operator actions unless the operator explicitly requests them.

  Deliverables:
  - Recorded source revision, public artifact, route, image, or health surfaces inspected.
  - Follow-up issues for each source-to-runtime drift finding.
  - A short `Last run:` note with evidence links or commands used.

  Validation:
  - Verify inspected production or public surfaces directly where access is available.
  - Confirm any deploy-required finding is filed with the exact publish/deploy boundary and owner.
  - Confirm no production state was changed by the audit unless explicitly requested.

- [ ] [M407R] (P2) Documentation and runbook hygiene
  Goal:
  Keep durable documentation and runbooks aligned with the current behavior users and operators actually rely on.

  Requirements:
  - Cadence: run before release cuts and after merge bursts that change user-facing or operator-facing behavior.
  - Review README, ARCHITECTURE, PRD, CHANGELOG, docs, runbooks, setup guides, and local workflow notes for stale behavior or missing new contracts.
  - Review changed English technical prose against `.mprlab/AGENTS.DOCS.md` and the official ASD-STE100 standard.
  - Add approved repository terms to `.mprlab/TERMINOLOGY.md`.
  - Update docs when closed issues changed durable behavior, public APIs, operator workflows, release semantics, or deployment expectations.
  - Remove or rewrite stale instructions instead of preserving obsolete alternatives.
  - File separate issues for documentation gaps that require product or implementation decisions.

  Deliverables:
  - Updated documentation or filed follow-up issues for each gap.
  - A short `Last run:` note listing docs inspected and changes made.
  - Cross-references from archived issue history to durable docs when useful.

  Validation:
  - Run the skill `prepare-ste-reference` script and use its verified official PDF.
  - Run the skill `check-ste` script on each English technical document that changed.
  - Review the changed text against Part 1 writing rules and the Part 2 dictionary.
  - Confirm that the producing agent completed the review without end-user work.
  - Do a check of links, command names, paths, and public contract descriptions changed by the pass.
  - Confirm docs describe the current canonical path only.
  - Confirm issue archive and active tracker references remain consistent.

## Features

- [!] [F001] (P1) {P001,P002,I001,I003} Prepare the first mobile game package
  Goal:
  An end user can install Allergy Wheel on the selected mobile platforms.

  Blocked: Store acceptance requires P002 verification, signed store artifacts, and complete real-device results.

  Requirements:
  - Use the selected decisions from P001 and P002.
  - Prepare Android and iOS packages for Google Play and the Apple App Store.
  - Provide the complete game without charges, advertisements, or in-app purchases.
  - Support Android and iOS phones and tablets.
  - Use the selected Expo and React Native toolchain to determine the minimum OS versions.
  - Use Expo and React Native for the mobile shell.
  - Reuse the JavaScript game and its component APIs.
  - Supply all resources required by the selected offline contract.
  - Keep game startup and complete game rounds independent of external services.
  - Keep Google Analytics, LoopAware, and external fonts under the completed P002 data contract.
  - Use `support@mprlab.com` as the support contact.
  - Preserve allergen selection, wheel control, result reveal, and repeat play.
  - Adapt controls and layout to the selected phones and tablets.
  - Add applicable mobile Governor guidance after native project files exist.

  Deliverables:
  - Supply an installable artifact for each selected platform.
  - Record the artifact version and source commit.
  - Supply installation instructions and device acceptance results.

  Validation:
  - Install each artifact on a real supported device.
  - Verify game rounds, audio, mute, rotation, and background return.
  - Verify the selected offline behavior.
  - Verify the first launch and complete game rounds with external network access disabled after installation.
  - Verify readable text when external fonts are unavailable.
  - Verify that external service failures do not prevent game operation.
  - Verify data collection and local storage against the P002 inventory on each platform.
  - Verify complete game access without payment and the absence of advertisements and in-app purchases.
  - Record store submission and public availability only after separate authorized publication.

  Implementation:
  On September 7, 2026, the Expo shell, local resource adapter, native builds, and parent controls were added.
  Version 1.0.0 development artifacts built for Android and the iOS simulator.
  Artifact receipts record the source commit, uncommitted-source indicator, and byte digests.
  The builds used uncommitted source based on `24e5d488f0e1b10d4edc71fce822d4f98f0c6990`.

  The Android APK opened on a physical Android 9 tablet.
  The device accessibility command returned `null root node`, so the interaction test did not complete.
  The iOS simulator application installed and displayed the game.

  Docker tests passed offline phone and tablet rounds, audio lifecycle, parent controls, and provider failure cases.
  The parent document uses a separate origin from game storage.
  Its controlled provider test passed consent, storage isolation, and session reset checks.
  The corrected audio test also passed during an active spin in the background.

  These results do not prove live provider behavior or full native device acceptance.

  Remaining Acceptance:
  - Supply signed AAB and IPA artifacts through the shared mobile lifecycle.
  - Complete real-device rounds, audio, mute, rotation, background return, and first-launch offline checks on both platforms.
  - Verify native parent requests and storage against P002.
  - Complete app artwork, store screenshots, and privacy declarations.

- [!] [F002] (P1) {F001,I002} Add mobile installation to the website
  Goal:
  Website visitors can obtain the mobile game from the game website.

  Blocked: No verified store destination is recorded for either platform.

  Requirements:
  - Use the delivery path selected in P001.
  - Add store links only after the corresponding store listings are available and verified.
  - When OS detection succeeds, show the corresponding store link first.
  - When OS detection fails, show both available store links with platform labels.
  - Keep the other available store link accessible after OS detection.
  - Keep the browser game available.
  - Link only to verified artifacts or live store listings.
  - Show platform-specific installation steps when the selected path requires them.
  - Use the parent and support content selected in P002.

  Deliverables:
  - Supply the download page or installation section.
  - Record the verified destinations for each supported platform.

  Validation:
  - Verify each installation path from the website on a supported device.
  - Confirm the installed game completes a game round.
  - Verify Android, iOS, iPadOS, desktop, and unknown OS cases.
  - Verify that an unavailable store listing has no installation link.
  - Verify the browser game remains available.

  Implementation:
  On September 7, 2026, the website gained a validated store catalog and mobile privacy page.
  Both catalog values remain `null` because neither destination is verified.
  The installation section stays hidden in that state.
  Available links preserve both platforms and use detected OS information for their order.
  Tests passed Android, iPhone, iPadOS desktop mode, unknown OS, partial availability, and absent destination cases.
  The browser game and privacy page remained available in the tests.

  Real store installation remains blocked until verified listings exist.

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

- [ ] [P002] (P1) Define the child audience and data policy
  Goal:
  The mobile design must use an explicit audience and data contract.

  Requirements:
  - Inventory network requests from the game and its external scripts.
  - Inspect Google Analytics, LoopAware, Google Fonts, and browser storage.
  - Record the child age group and release countries.
  - Record decisions for price, advertising, accounts, and measurement.
  - Define parent information, support links, and any required parental gate.
  - Verify the applicable store rules against current official sources.
  - Keep this issue limited to analysis and decisions.

  Open Decisions:
  No product choice remains for the owner. The remaining work is technical analysis and validation.

  Owner Decisions:
  On September 7, 2026, the owner selected ages 6 and older and all countries.
  The complete game has no charges, advertisements, or in-app purchases.
  The game must be fully usable without an account.
  Keep Google Analytics, LoopAware analytics and feedback, and external fonts in the mobile version.
  Use `support@mprlab.com` as the support contact.
  The owner initially limited stored data to analytics, then explicitly included LoopAware analytics and feedback.
  The selected data scope includes feedback contact details and submitted content.
  These decisions replace the earlier ages 6–8 and no-analytics proposal.

  Evidence:
  The source review found Google Analytics, LoopAware, and Google Fonts requests in `index.html`.
  The game saves the selected allergen token and label in `localStorage`.
  LoopAware `web/widget.js` sends contact details, a message or sentiment, and the source URL after feedback submission.
  This source evidence does not establish the deployed widget configuration or all provider data collection.
  `.mprlab/MOBILE-READINESS.md` contains the initial inventory and official policy sources checked on September 7.

  Remaining Analysis:
  Define parent access, support data retention, analytics settings, and required consent from the selected audience and services.
  Prepare the privacy policy URL and store audience declarations.
  Resolve technical details without another owner decision unless the design requires a change to a selected product requirement.
  Verify the full request and storage inventory, including external scripts, on the selected mobile runtime.
  Include LoopAware analytics, feedback data, and support correspondence in the data contract.
  Verify retained services against Apple child audience rules and Google Play Families requirements.
  Define accurate privacy disclosures for analytics, external resources, local preferences, and any permitted support data.
  Keep this issue open until the data contract and its required decisions are completed.

  Deliverables:
  - Supply a data inventory and the selected policy for each delivery surface.
  - Update F001 and F002 with the confirmed requirements.

  Validation:
  - Confirm the inventory includes requests from external scripts and local storage.
  - Confirm that the design and proposed store declarations describe the same behavior.
  Implementation Contract:
  On September 7, 2026, optional services moved into a separate parent document in the mobile design.
  The game starts no external service and retains its preferences locally.
  Each service requires the parent gate and a separate action for that visit.
  Google Analytics defaults deny analytics storage and advertisement storage.
  Google signals and advertisement personalization are disabled.

  LoopAware analytics source includes visit, device, locale, timezone, display, and network data.
  LoopAware feedback includes contact details and submitted content.
  The privacy page source is `privacy.html` and the same text appears in the app.
  Its public URL remains unverified until website publication.
  The source inventory and official policy references are in `.mprlab/MOBILE-READINESS.md`.

  Remaining Verification:
  Verify deployed retention, deletion procedures, Google property settings, and store declarations before store submission.
  Capture requests and storage on both native platforms with the actual provider scripts.
  The parent gate and controlled browser tests do not establish legal consent or store acceptance.
