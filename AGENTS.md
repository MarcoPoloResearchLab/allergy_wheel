# AGENTS.md

## Spinning Allergy Wheel

Write the game in JavaScript. Use CDN dependencies for the browser game.
Run test tooling inside Docker through the repository Make targets.
The host requires no npm or Node installation.

The game starts with the screen to select an allergy (e.g. peanuts, Italian sausage, and other food ingredients that
children often are allergic to)

After the selection a spinning wheel is present with the names of popular dishes from various cuisines. There is a stop
button to stop the wheel.

When the player starts the game, the allergen selection disappears and the wheel starts to spin.
A large red Stop button stops the wheel. Without this input, the wheel spins for 30 seconds and gradually slows.

When the wheel stops:

1. there are Spin and Restart buttons on the wheel.
2. the ingredients are revealed in a modal window. if there was an ingredient that a player was allergic to, then an
   ambulance sound is played and a puffed face is displayed. If there are no ingredients the player is allergic to, they
   Yum-yum sound is played.

The game is full screen with bright colors and bold graphics. There is a button that sends the browser full screen,
There is also a mute button to disable sounds.

There is a menu screen that allows selecting the dishes based on the allergic

## JavaScript Coding Standards (Browser ES Modules)

### 1. Naming & Identifiers

* No single-letter or non-descriptive names.
* camelCase → variables & functions.
* PascalCase → classes.
* SCREAMING_SNAKE_CASE → constants.
* Handlers named by behavior (`handleSpinButtonClick`, not `onClick`).

### 2. Dead Code & Duplication

* No unused variables, imports, or exports.
* Remove duplicated logic. Put shared behavior in helpers.
* One source of truth for repeated values or logic.

### 3. Strings & Enums

* All user-facing strings live in `constants.js`.
* Use `Object.freeze` for enums.
* Map keys must be constants or symbols, not ad-hoc strings.

### 4. Code Style

* ES modules (`type="module"`), strict mode.
* Use pure functions for transforms. Use classes or factories for stateful logic.
* Do not mutate imports or parameters.
* Put DOM operations in `ui/`. Put business logic in `core/`.

### 5. Dependencies & Organization

* Use CDN-hosted dependencies for the browser game. Keep the game free of npm and bundlers.
* Run the existing Node and Playwright test tools only inside the test container.
* Layout:

  ```
  /assets/{css,img,audio}
  /data/*.json
  /js/
    constants.js
    types.d.js
    utils/
    core/
    ui/
    app.js
  index.html
  ```

### 6. Testing

* Tests run in browser: `tests/index.html`.
* Table-driven cases, iterate array of inputs/outputs.
* Use black-box integration tests for public APIs and DOM behavior.
* Use focused unit tests for complex internal logic when useful.
* Provide `assertEqual`, `assertDeepEqual`, `assertThrows` in `tests/assert.js`.

### 7. Documentation

* JSDoc required for public functions & classes.
* `// @ts-check` enabled at file top.
* `types.d.js` defines typedefs (e.g. `Dish`, `SpinResult`).
* Each domain module documented in `doc.md` or `README.md`.

### 8. Refactors

* Plan changes before a code change. Put the plan in the PR description as a list.
* Split files >300–400 lines by concern.
* `app.js` is composition root — dependencies wired there.

### 9. Error Handling & Logging

* Throw `Error`, never raw strings.
* Use try/catch at user entry points. Show errors during development.
* `utils/logging.js` as adapter, no stray `console.log`.

### 10. Performance & UX

* Batch DOM writes with `requestAnimationFrame`.
* Cache selectors. Prevent forced reflows.
* Use asynchronous animations. Do not block execution with waits.
* Optional deterministic RNG injection for replay/testing.

### 11. Linting & Formatting

* ESLint run manually (Dockerized).
* Prettier only on explicit trigger, never autosave.
* Core enforced rules: no-unused-vars, no-implicit-globals, no-var, prefer-const, eqeqeq, no-magic-numbers (allowlist:
  0,1,-1,100,360).

### 12. Data > Logic

* Validate catalogs (JSON) at boot.
* Give validated data to the logic. Keep defensive checks at the input boundary.
* Fail fast on schema errors or missing assets.

### 13. Security & Boundaries

* No eval, no inline event handlers.
* CSP-friendly ES modules only.
* External calls go through `core/gateway.js`, mockable in tests.

## Mobile Preparation

Read `.mprlab/MOBILE-READINESS.md` before mobile preparation work.

Use `.mprlab/ISSUES.md` as the active issue tracker.
Record a required decision before dependent implementation.
Use the existing primary checkout for all work.

Keep `js/core/app.js` as the composition root.
Connect game components through this module.
Do not import one game component into another game component.
Shared constants, types, and general utilities can be imports.
Keep the wheel, audio, and UI behavior under their public APIs.

I004 provides Docker-based local startup and validation commands.
Use `make up` and `make down` for the local game.
Use `make test` for focused browser validation and `make ci` for final validation.
P001 records the remaining mobile packaging decisions.
I001 records the migration to real game integration coverage.

<!-- BEGIN MPRLAB-GOVERNANCE -->
## MPR Lab Governance

Root `AGENTS.md` is the agent entrypoint. Shared rules live under `.mprlab/`.

Read `.mprlab/POLICY.md` for every task.
Read the following files only when their condition applies.
Read each selected guide in full before its first applicable action.

- Before edits: `.mprlab/PLANNING.md`.
- For technical prose: `.mprlab/AGENTS.DOCS.md` and `.mprlab/TERMINOLOGY.md`.
- For issue work: the selected issue and its dependencies in `.mprlab/ISSUES.md`.
- For tracker edits: `.mprlab/issues-md-format.md`.
- For Git operations: `.mprlab/AGENTS.GIT.md`.
- For browser changes: `.mprlab/AGENTS.FRONTEND.md`.
- For container changes: `.mprlab/AGENTS.DOCKER.md`.

File permission modes are outside agent scope.
Never examine, validate, compare, require, change, or record a file permission mode.
Never use a file permission mode in acceptance, security, credential, execution, publication, deployment, or failure analysis.
The values `0600` and `7777` have no governance meaning.
This rule does not change service authorization or operation authority.

Always reference each issue by its ID, for example `B001` or `I027`.
Never use an `ISSUES.md` file path, line number, or `path:line` syntax as an issue reference.

Do not create `.mprlab/AGENTS.md`. Scoped guidance belongs in `.mprlab/AGENTS.*.md` files.
If guidance conflicts, obey `.mprlab/POLICY.md` first, then root `AGENTS.md`, then the applicable scoped guide.
<!-- END MPRLAB-GOVERNANCE -->
