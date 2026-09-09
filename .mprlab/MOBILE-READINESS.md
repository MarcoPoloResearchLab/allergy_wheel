# Allergy Wheel Mobile Preparation

## Current Result

The September 7, 2026 implementation supplies an Expo mobile shell for the existing JavaScript game.
The local Android development APK and iOS simulator application contain the game resources.
Store publication did not occur.
F001 retains native device and store artifact acceptance.
F002 retains verification of public store destinations.

## Confirmed Decisions

P001 and P002 record the owner decisions.

| Subject | Contract |
| --- | --- |
| Platforms | Android and iOS phones and tablets |
| Minimum OS | Android 7.0, API 24, and iOS 16.4, from the generated Expo SDK 57 projects |
| Distribution | Google Play and the Apple App Store |
| Website | Verified store links when available, with OS detection |
| Toolchain | Expo SDK 57, React Native 0.86, and React Native WebView |
| Audience | Ages six and older, restored after the recipe revision |
| Countries | All countries, subject to store availability and applicable requirements |
| Price | No charges, advertisements, or in-app purchases |
| Account | Complete game access without an account |
| Services | Google Analytics, LoopAware analytics and feedback, and external fonts |
| Support | `support@mprlab.com` |
| Offline play | Complete game resources available from the first installed launch |

The source review inspected Hecate and LoopAware `mobile/package.json` and StillPuzzle `package.json`.
Each project uses Expo SDK 57 and React Native 0.86.
The selected dependency lock uses Expo 57.0.20 and React Native 0.86.3.
The selected adapter uses React Native WebView 13.16.1.
PWA installation and website APK downloads are outside the selected delivery path.

## Architecture

| Source | Responsibility |
| --- | --- |
| `js/core/app.js` | Connect the game, wheel, state, audio, UI, and native lifecycle adapter |
| `js/core/game.js` | Control rounds through supplied component APIs |
| `js/core/wheel.js` | Render and stop the wheel |
| `js/utils/audio.js` | Load local sounds and control the shared audio context |
| `js/core/stores.js` | Validate store destinations and order available links |
| `js/ui/storeLinks.js` | Render installation links and the mobile privacy link |
| `js/core/parentsApp.js` | Connect the parent UI and external gateway |
| `js/core/gateway.js` | Own external service URLs and Google Analytics settings |
| `mobile/App.js` | Display the game, automatic analytics, and a separate feedback WebView |
| `mobile/plugins/withOfflineBuild.cjs` | Generate native bundle configuration |
| `scripts/build-mobile-game.mjs` | Package the browser sources and local resources |

The game components retain their public APIs.
The listener binder receives its UI operation from the composition root.
It does not import another game component.

The browser uses the existing JavaScript ES modules and CDN dependencies.
The mobile build uses esbuild to create a separate JavaScript bundle.
It embeds catalogs, images, styles, and audio in the generated HTML.
It does not change browser resource paths.
The resource record contains SHA-256 values for the game document and packaged files.

The game WebView loads the packaged document without a development server.
The native shell handles safe areas and device orientation.
It removes the browser Full Screen button because the native game already fills the available screen.
Native background events suspend audio through its public API.
Return events resume the audio context.

Prepared native projects and embedded game inputs are recorded in Git for the signed release.
Dependency directories, build caches, and output artifacts remain outside Git.
Expo CLI generates native projects during `make mobile-prepare`.
The native build scripts use Gradle, CocoaPods, Xcode, and the React Native bundler.
They do not use Expo or EAS for artifact production.

## Data Contract

The mobile game loads online fonts automatically.
A separate analytics document starts Google Analytics and LoopAware analytics at application launch.
The parent document loads feedback only after the parent gate and feedback selection.
The parent gate uses a multiplication question.
This gate is a product control. It does not establish legal parental consent or store acceptance.

The native parent document uses the separate origin `https://allergy-wheel-parents.invalid/`.
This origin identifies an embedded document. It is not a hosted website or a network dependency.
Parent scripts cannot read storage from the game origin.
Android parent DOM storage and third-party cookies are disabled.
iOS uses an incognito WebView with a separate data store.
Closing the parent area destroys its document.
A new feedback visit requires the gate again.
The native analytics document uses the same separate origin and disables persistent DOM storage and third-party cookies.
Its incognito WebView cannot read game-origin storage. Analytics failure does not interrupt game startup.

| Surface | Data and behavior |
| --- | --- |
| Local game | The selected allergen token and label stay in device storage. Catalog and audio requests use packaged data URLs. |
| Google Analytics | Application launch loads the existing property automatically. Consent defaults deny analytics storage and all advertisement storage. Google signals and advertisement personalization are disabled. |
| LoopAware analytics | Application launch loads `pixel.js` in the separate analytics document. Its source sends a visit identifier, page, device, locale, timezone, and display data. The server receives IP data and can receive edge location data. |
| LoopAware feedback | A separate parent action loads `widget.js`. Submission contains contact details, a message or sentiment, site ID, and source URL. |
| External fonts | The game loads Google Fonts automatically when online. The game uses the system sans-serif font offline. |
| Support | User correspondence to `support@mprlab.com` can contain contact details and message text. |
| Website | The existing Google Analytics, LoopAware widget, and external fonts remain on the browser game. The mobile privacy page starts no external service. |

The LoopAware pixel source uses a local visitor ID when browser storage is available.
It creates a visit ID when storage is unavailable.
The native parent adapter disables persistent DOM storage on Android.
The source review does not prove the deployed retention configuration or all requests from Google scripts.

The public mobile privacy page source is `privacy.html`.
Its intended URL is `https://allergy.mprlab.com/privacy.html` after authorized website publication.
The same privacy text appears in an expandable section inside the mobile parent area.
It describes local preferences, automatic services, guarded feedback, support, and the food-safety limit of the game.
P002 retains provider retention, deletion, store declarations, and runtime data verification before store submission.

## Official Policy Review

The official policy review date is September 7, 2026.
This review identifies requirements. It does not establish global compliance or store acceptance.

Apple restricts third-party analytics in Kids Category apps.
Its limited exception excludes information that can identify children or their devices.
External links require a parental gate in that category.
Apple requires an accessible privacy policy in the app and store metadata.
See [Apple guidelines 1.3 and 5.1.1](https://developer.apple.com/app-store/review/guidelines/).

Google Play Families requirements apply when the selected audience includes children.
These requirements cover data disclosures, identifiers, and APIs or SDKs used with children.
See [Google Play Families policies](https://support.google.com/googleplay/android-developer/answer/9893335?hl=en).
The selected ages 6+ do not establish a store rating or category.

Google describes Analytics collection in its [data practices](https://support.google.com/analytics/answer/6004245?hl=en).
Google Fonts requests contain IP addresses and request headers.
See [Google Fonts data practices](https://fonts.googleblog.com/2022/11/your-privacy-and-google-fonts.html).

## Website Publication

I002 supplies a versionless manifest with a `github_pages` resource.
`Dockerfile.pages` exports only the website and its local resources.
The manifest selects `gh-pages`, the existing repository, and `allergy.mprlab.com`.
The September 7 GitHub API check still reported `master` as the live Pages source.
No live Pages setting changed during implementation.

After an explicit publication request:

1. Run the Governor check.
2. Run `make ci` on the final source.
3. Use the authorized source commit for `make release` through the sibling MPR gateway.
4. Run `make publish` to publish the sealed artifact.
5. Run `make deploy` to apply the selected Pages resource.
6. Verify the public website, domain, and `/.mprlab-release.json` against the publication receipt.

The lifecycle owns the release marker.
The local Pages test does not create a release marker or prove public publication.
The current manifest declares only the website.
Signed mobile store artifacts require the mobile lifecycle contract before a store release.

## Local Validation

`make ci` runs source checks, real browser flows, offline mobile flows, dependency checks, the Pages artifact test, and local server tests.
Browser tools and package checks run inside Docker.
The mobile tests exercise real game components at phone and tablet sizes.
They cover first launch, manual and automatic stop, results, audio lifecycle, parent controls, and external service failure.
The browser flow also covers restart, mute, and navigation.
The parent integration test uses controlled provider scripts.
It proves the local service boundary and storage isolation between document origins.
It does not prove live provider connectivity or native WebView behavior.

The new mobile test first failed because the package builder was absent.
The installation test first failed because store links were absent.
The privacy link test first failed because its link was absent.
The native Full Screen test first failed because the browser control remained visible.
The audio lifecycle test first failed because the audio context remained active.
Each focused test passed after the corresponding change.
The real game characterization passed before and after the component refactor.

The Android development APK built and opened on a physical Android 9 tablet.
The device accessibility command returned `null root node`, so automated interaction acceptance did not complete.
The tablet later returned to another application. Further interaction stopped.
The iOS simulator application built, installed, and displayed the game.
Neither observation proves first-launch offline behavior on a real supported iPhone or complete physical-device acceptance.

## Final Validation On September 7, 2026

The final validation used commit `8152c5d57c4b1bd77f60bdfb4d2cd90a633dd961`.
The checkout was clean during CI and both native builds.
Version 1.0.0 identifies both development artifacts.
The new receipts replace the earlier receipts from uncommitted source.

| Validation | Result | Evidence boundary |
| --- | --- | --- |
| `make ci` | Passed | 62 JavaScript and JSON files, 10 harness cases, and real browser flows |
| Offline mobile flows | Passed | Chromium at phone and tablet sizes, including audio lifecycle during a spin |
| Parent service boundaries | Passed | Controlled provider scripts, separate document origins, and new consent for each visit |
| Store and privacy flows | Passed | Android, iPhone, iPadOS, unknown OS, partial availability, and absent destinations |
| Expo dependency compatibility | Passed | The locked mobile dependencies agree with the selected Expo version |
| Runtime dependency audit | Passed | Zero reported vulnerabilities |
| Pages artifact and local server | Passed | Current source files, startup, repeated startup, shutdown, and repeated shutdown |
| `make mobile-android` | Passed | Development APK, package `com.mprlab.allergywheel`, minimum API 24, target API 36 |
| `make mobile-ios` | Passed | Simulator application, bundle `com.mprlab.allergywheel`, minimum iOS 16.4 |
| `make test-ios-simulator` | Passed | Installation, launch, and visible game in the iOS 26.5 simulator |
| Artifact receipts | Passed | Android APK digest and all 69 recorded iOS file digests match the artifacts |

The local logs and result record are in `artifacts/validation`.
The iOS startup image is `artifacts/validation/ios-startup.png`.
These generated files remain outside Git.

The Android APK SHA-256 is `142ddbb69a856939edd636d54e1fabe6d00d4d1258ae602bdf8b00fa89781e5c`.
The iOS JavaScript bundle SHA-256 is `92e3309c82bb7c92732de3f8d62a47453645b7f47b83ddaade7731eb381fd204`.
The latter identifies `main.jsbundle`, not the complete iOS application.
The iOS receipt records each application file separately.

This validation did not repeat physical-device interaction tests or live provider requests.
The earlier physical Android launch result remains limited to that earlier artifact.
Hosted CI, signed store artifacts, store installation, and public publication remain unverified.
The Governor and mechanical documentation checks passed for the final validation record.
The language review covers the changed prose only.

## Remaining Acceptance

F001 remains open for these concrete results:

- Signed Android AAB and iOS IPA artifacts from the shared mobile lifecycle.
- Complete real-device rounds, audio, mute, rotation, background return, and first-launch offline checks on both platforms.
- Native parent service request and storage verification.
- Final app icons, store screenshots, privacy declarations, and the completed P002 provider review.

F002 remains open until verified store destinations are available.
Both entries in `data/mobile-stores.json` remain `null`.
The website hides the installation section in that state.
A verified destination enables only its own link.
OS detection changes the order and preserves the other available link.

No product decision remains for the owner.
Store publication and website deployment require an explicit request.

## Automatic Service Revision

The owner required automatic fonts and analytics on September 7, 2026.
This requirement replaces the earlier parent-only service design.
The parent gate now controls feedback only.
The game loads its online font without a service button. Offline play uses the system font.
A separate analytics WebView starts without a parent action and cannot read game-origin preferences.
The parent modal has its own safe-area provider. Detailed privacy text starts collapsed.

The revised browser integration first failed because game startup did not load the font stylesheet.
The tests cover automatic service requests, game-storage isolation, denied advertising storage, unavailable services, and the feedback gate.
These results require native verification before store acceptance.

## Apple Cloud Preparation

I005 connects the retained native project to the shared Xcode Cloud operation.
The generated project declares automatic signing.
The clone hook verifies game and native source before it installs the locked mobile dependencies.
The hook selects Node.js 24, and the workflow requires Xcode 26.6.
The native phase uses the selected Node executable and the React Native bundler.
The cloud build consumes the retained offline game resources.
Release-version alignment, account setup, and a hosted build remain open.

Final `make ci` passed after the cloud preparation changes.
It includes the retained-source check and actual production JavaScript phase in Docker.
Mobile runtime, build, and test-tooling audits reported zero vulnerabilities.
The logs are `/tmp/allergy-cloud-native-ci-complete.log` and `/tmp/allergy-cloud-dependency-audit.log`.
These checks do not prove a hosted Apple build or physical-device acceptance.
