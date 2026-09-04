# Allergy Wheel Mobile Preparation

## Goal

The requested outcome is a mobile game that an end user can obtain from the Allergy Wheel website.
The repository preparation gives agents a source review, an issue sequence, and explicit open decisions.

## Source Record

The review date is September 4, 2026.
The source commit is `682aad44ca4e66a5f0f31e49e26b6a11336969bd`.

- Repository: <https://github.com/MarcoPoloResearchLab/allergy_wheel>.
- Primary checkout: `/Users/tyemirov/Development/allergy_wheel`.
- Default branch: `master`.
- Public website: <https://allergy.mprlab.com/>.
- GitHub Pages source: `master`, repository root.
- GitHub Pages status from the API: `built`.
- Public website response: HTTP 200.

The checkout was clean immediately after the clone.
The preparation adds local governance files and documentation.

## Current Architecture

| File or directory | Current responsibility |
| --- | --- |
| `index.html` | Page structure, external scripts, and the game entry point |
| `js/core/app.js` | Component creation and connections |
| `js/core/game.js` | Game flow and round control |
| `js/core/wheel.js` | Canvas wheel and spin control |
| `js/core/board.js` | Dish indexes and allergen lookup |
| `js/core/state.js` | Game state |
| `js/core/navigation.js` | Screen navigation |
| `js/ui/` | Screens, cards, avatars, and hearts |
| `js/utils/audio.js` | Sound loading and playback |
| `data/` | Dish, allergen, ingredient, country, and normalization catalogs |
| `assets/` | Styles, avatars, icons, sounds, and social artwork |
| `tests/index.html` | Existing browser harness entry point |

The game uses browser ES modules and local JSON catalogs.
The wheel and audio modules expose public APIs.
The source has no native mobile project, PWA manifest, or service worker.

`index.html` loads Google Analytics, LoopAware, and a Google Fonts stylesheet.
The application already has local avatar and audio files.
Offline play requires a complete resource inventory and a cache or package design.

## Readiness Findings

| Issue | Source evidence | Required outcome |
| --- | --- | --- |
| B001 | The workflow accepts pushes to `main`. The default branch is `master`. | Run browser CI for the actual default branch. |
| B002 | Listener tests replace the page body. The visible result container disappears. | Keep the browser test report visible. |
| I001 | The README and test runner require Node. Root instructions prohibit Node tooling. | Establish one test contract after P001. |
| I001 | The tests use isolated helpers and a state-manager stub. | Add coverage through the real game page and components. |
| I001 | The repository has no `Makefile`. | Supply the validation commands required by Governor. |
| I002 | Pages uses `master`. The selected deployment manifest is absent. | Prepare the Governor contract for `gh-pages` publication. |
| I003 | `js/utils/listeners.js` imports from `js/ui/ui.js`. | Connect components through the composition root. |
| P001 | No mobile package or store configuration exists. | Decide the first mobile delivery path and toolchain. |
| P002 | The current page loads external measurement services. | Define the child audience and data policy before mobile implementation. |

The existing browser harness reported 14 passed tests and zero failed tests in the Codex browser.
The result came from `__ALLERGY_WHEEL_TEST_RESULTS__` after the tests removed the visible page body.
This evidence covers the existing test cases only.
It does not establish full game, offline, or mobile device acceptance.

A manual check of the real game page completed one round with Peanuts selected and audio muted.
The Stop button revealed Unagi Don, displayed its ingredients, and increased the heart count from five to six.
The page then showed the Spin Again control.
Audio playback, automatic stop, offline play, and physical mobile devices remain outside this check.

## Confirmed Requirements

1. Prepare an installable mobile game.
2. Provide access to the game from the website.
3. Keep the JavaScript game and its component boundaries.
4. Preserve the primary checkout and its repository instructions.
5. Use MPR Lab Governor for agent guidance, issue records, and validation rules.

## Open Decisions

P001 must record these decisions:

- First supported platforms and device versions.
- PWA, store packages, or both for the first release.
- Website installation steps and the need for direct file downloads.
- Permission to use Node tooling for tests or mobile packaging under the existing CDN-only rule.
- Required offline behavior, including the first installed launch.

P002 must record these decisions:

- Child age group and release countries.
- Price, advertising, accounts, and measurement policy.
- Treatment of Google Analytics, LoopAware, and external fonts in each delivery surface.
- Parent information, support, and external-link behavior.

The earlier proposal included ages 6–8, free access, offline play, and no accounts, ads, or analytics.
Those values remain proposals until the owner selects them.
Capacitor remains a candidate until P001 resolves the toolchain rule.

## Execution Sequence

1. Correct B001 and B002 with focused validation.
2. Complete P001 and P002 with the owner decisions.
3. Complete I001 to establish real game tests and repeatable validation commands.
4. Complete I003 under those tests.
5. Prepare I002 for the selected production contract.
6. Implement F001 for the selected mobile delivery path.
7. Implement F002 with the verified installation destinations.

Use one issue and one temporary execution plan for each implementation task.
Add mobile Governor guidance when a native mobile project exists.
Keep deployment and store publication subject to an explicit owner request.

## Preparation Validation

Run the Governor check and `git diff --check` after the final documentation change.
Run the language checker on the changed technical documents.
Validate issue identifiers and dependencies across the active tracker and any archive.
Record application CI and device acceptance separately when those checks occur.

The Governor check and mechanical language check passed after the preparation changes.
The language review covers new repository-specific prose and the changed root instructions.
The remaining root prose and generated Governor templates retain their existing language.
