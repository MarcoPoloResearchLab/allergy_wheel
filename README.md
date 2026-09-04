# Allergy Wheel

An interactive allergy wheel game rendered in the browser. The project ships with automated browser tests that validate
utility helpers, state transitions, and canvas-based integration scenarios.
On the quick game screen, players select their allergens.
A reminder shows the goal: spin the allergy wheel to win 10 hearts.

## Browser compatibility

| Browser | Minimum version | Release date       | Market share after release |
|---------|-----------------|--------------------|----------------------------|
| Chrome  | 84              | July 14, 2020      | 69.23%                     |
| Edge    | 84              | July 16, 2020      | 5.03%                      |
| Firefox | 90              | July 13, 2021      | 2.26%                      |
| Safari  | 14              | September 16, 2020 | 14.98%                     |

## Local development

Install Docker with Docker Compose v2 or later, Make, Bash, curl, and shasum.
Start the Docker engine before these commands.
The host requires no Node or npm installation.
The first validation run downloads the test image and its locked dependencies.

| Command | Result |
| --- | --- |
| `make up` | Start the game at <http://127.0.0.1:8765>. |
| `make down` | Stop and remove the local game container and its network. |
| `make test` | Run the browser tests inside Docker. |
| `make test-local` | Verify startup, file responses, repeated startup, and shutdown. |
| `make check` | Validate JavaScript and JSON syntax, Compose configuration, and whitespace. |
| `make ci` | Run all checks and both test commands. |

Use `make up LOCAL_PORT=8766` to select a different port.
The service binds to the local host only and mounts game files as read-only files.
Edit the source, then reload the browser to see changes.
The default Compose project is `allergy-wheel-local`.
If you set `COMPOSE_PROJECT_NAME`, use the same value for startup and shutdown.
The local command test uses a separate temporary project and an assigned port.
Its cleanup preserves the default local game and other projects.

## Browser-based tests

Run `make test` for the browser harness.
The test image contains Node, locked npm dependencies, and a matching Playwright browser.
Keep the Playwright image version and package lock version in agreement when updating dependencies.

The `scripts/run-browser-tests.mjs` helper starts a static server and loads `tests/index.html` in headless Chromium.
The helper reports a failure if a suite contains a failed test.
The `Browser Tests` GitHub Actions workflow runs `make ci` for pushes to `master` and for pull requests.

The listener tests keep their fixtures in a separate container.
Fixture cleanup preserves the report container and its completed results.
The report integration suite runs last to verify this boundary.
The visible report and the machine-readable result contain the same test totals.

After `make up`, open <http://127.0.0.1:8765/tests/index.html> to inspect the report.
The existing suites do not cover every game flow. I001 tracks the remaining integration coverage.

For governed changes, run the installed Governor normalizer with `--repo` set to this checkout and `--check`.
Then run `make ci` once after all changes are completed.
The application CI command does not require the local Governor skill installation.

## Dynamic allergen summary

The crawler-friendly food allergy summary that appears on the first screen is now rendered in the browser with the live
catalogs. Whenever entries in `data/allergens.json`, `data/dishes.json`, or the ingredient mappings change, simply
reload the page and the summary updates automatically. A static `<noscript>` block remains in place for SEO crawlers
without JavaScript support.

## Avatar customization

Players can personalize the result card by choosing from six built-in avatars: Sunny Girl, Curious Girl, Adventurous
Boy, Creative Boy, T-Rex, and Triceratops. The currently selected avatar is displayed in the header toggle button and on
the allergy result card during the reveal sequence.

To change avatars, click the avatar button in the header to open the selector menu. Choosing any option updates the
header image immediately and closes the menu.
The saved selection keeps the same avatar on the reveal card until the player selects another option.

## License

This project is proprietary software. All rights reserved by Marco Polo Research Lab.
See the [LICENSE](./LICENSE) file for details.
