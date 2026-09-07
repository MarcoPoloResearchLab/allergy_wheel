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
Browser development and tests require no host Node or npm installation.
The first validation run downloads the test image and its locked dependencies.

| Command | Result |
| --- | --- |
| `make up` | Start the game at <http://127.0.0.1:8765>. |
| `make down` | Stop and remove the local game container and its network. |
| `make test` | Run the browser tests inside Docker. |
| `make test-local` | Verify startup, file responses, repeated startup, and shutdown. |
| `make check` | Validate JavaScript and JSON syntax, Compose configuration, and whitespace. |
| `make ci` | Run source, browser, mobile, dependency, Pages, and local server checks. |

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

The runner also opens the real game page with its actual components and catalogs.
It verifies selection, manual and automatic stop, results, restart, mute, and menu navigation.
The store flow verifies Android, iPhone, iPadOS, unknown OS, and partial store availability.
It also checks the mobile privacy page.
The manual harness retains a visible report whose totals agree with its machine-readable result.

After `make up`, open <http://127.0.0.1:8765/tests/index.html> to inspect the manual report.
The full game and installation flows run through `make test`.

For governed changes, run the installed Governor normalizer with `--repo` set to this checkout and `--check`.
Then run `make ci` once after all changes are completed.
The application CI command does not require the local Governor skill installation.

## Mobile development

The Expo mobile shell reuses the game through a packaged WebView.
All game resources are local from the first installed launch.
The game is free, with no advertisements, purchases, or account requirement.
The selected toolchain supports Android 7.0 and later, and iOS 16.4 and later.

| Command | Result |
| --- | --- |
| `make test-mobile` | Verify packaged offline rounds, audio lifecycle, and parent controls in Docker. |
| `make mobile-check` | Verify Expo dependency compatibility in Docker. |
| `make mobile-audit` | Audit mobile runtime dependencies in Docker. |
| `make mobile-package` | Write embedded game and parent documents to `mobile/generated`. |
| `make mobile-dependencies` | Install locked native build dependencies through Docker. |
| `make mobile-prepare` | Generate Android and iOS projects from Expo configuration. |
| `make mobile-android` | Build `artifacts/android/allergy-wheel-development.apk`. |
| `make mobile-ios` | Build the iOS simulator application under `artifacts/ios`. |
| `make install-android` | Install the development APK on the selected ADB device. |
| `make test-ios-simulator` | Install and launch the application in the booted iOS simulator. |
| `make test-pages` | Verify the static website artifact and excluded development files. |

Native builds require Node 22.19 or later on the build host.
Android also requires JDK 17, Android SDK 36, and NDK 27.1.12297006.
Set `ANDROID_HOME` to the installed SDK directory.
The default macOS SDK path is `$HOME/Library/Android/sdk`.
iOS requires macOS, Xcode, an installed iOS simulator, Ruby, and CocoaPods.
The local iOS build used Xcode 26.6 with the iOS 26.5 simulator SDK.
These native prerequisites are separate from Docker-only browser development.

1. Run `make mobile-dependencies`.
2. Run `make mobile-prepare`.
3. Run `make mobile-android` or `make mobile-ios`.
4. For multiple Android devices, set `ANDROID_SERIAL` before `make install-android`.
5. Complete the device acceptance checks in `.mprlab/MOBILE-READINESS.md`.

Each build writes an artifact receipt with its version, source commit, uncommitted-source indicator, and file digests.
Version `1.0.0` currently identifies a development build.
The Android APK uses a development signature.
The iOS output targets the simulator and cannot be installed on a physical iPhone.
These files are not store artifacts.
F001 retains signed AAB and IPA production and real-device acceptance.

Keep changes in `mobile/app.json`, the config plugin, and the JavaScript sources.
Regenerate native projects after a native configuration change.
Do not edit generated `mobile/android` or `mobile/ios` files.
The mobile build does not use a development server, Expo account, or EAS.

The parent area separates optional analytics, feedback, and online fonts from game play.
Its provider scripts use a separate document origin.
The mobile privacy page is `privacy.html`.
P002 retains provider configuration and store policy verification before submission.

## Website installation and publication

`data/mobile-stores.json` is the source for verified store destinations.
Both values remain `null` until their corresponding listings are verified.
The installation section stays hidden when no destination is available.
When both destinations exist, OS detection places the matching link first and preserves the other link.
The browser game and mobile privacy link remain available.

The Pages manifest selects `gh-pages` and the existing `allergy.mprlab.com` domain.
The live Pages source still uses `master`.
I002 records the prepared publication contract.
Use the publication procedure in `.mprlab/MOBILE-READINESS.md` only after an explicit deployment request.
The repository `release`, `publish`, and `deploy` targets delegate to the sibling MPR gateway.
The selected manifest currently declares the website only.

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
