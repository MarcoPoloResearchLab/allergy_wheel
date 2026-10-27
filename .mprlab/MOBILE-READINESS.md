# Allergy Wheel Mobile Preparation

## Current Result

The September 7, 2026 implementation supplies an Expo mobile shell for the existing JavaScript game.
The local Android development APK and iOS simulator application contain the game resources.
The current operation status is in `STORE-READINESS.md`. Earlier validation sections describe their recorded source.
F001 records completed software acceptance. F003 retains signed store artifacts and public store delivery.
F002 retains verification of public store destinations.

## Software Acceptance On October 27, 2026

F001 software acceptance is completed for the current version 1.0.1 development source.
The Android 17 emulator and iOS 27 simulator displayed the game and passed the current native UI flows.
Those flows covered parent controls, selection, mute, Stop, results, and Spin Again.
Chromium and WebKit checks covered offline phone and tablet rounds, layout, audio lifecycle, and external service failure.
The current cumulative CI passed, including the privacy and native preparation contracts.
`artifacts/layout` contains the current native phone and browser layout captures.
The README supplies the development build and installation commands.

Native observations recorded storage, fonts, and count resources. Exact startup request methods, headers, bodies, and referrers were not captured.
Source request tests and native observations supply accepted software evidence with these stated limits.
`PRIVACY-QUALIFICATION.md` records those limits and the remaining provider operation.
Signed artifacts and public store availability remain separate F003 results.

## Confirmed Decisions

P001 and F004 retain the owner decisions. P002 preserves the earlier decision history.

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
| Services | Automatic LoopAware counts, parent feedback, and external fonts |
| Support | `support@mprlab.com` |
| Offline play | Complete game resources available from the first installed launch |

The source review inspected Hecate and LoopAware `mobile/package.json` and StillPuzzle `package.json`.
Each project uses Expo SDK 57 and React Native 0.86.
The selected dependency lock uses Expo 57.0.31 and React Native 0.86.3.
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
| `js/core/gateway.js` | Own external service URLs and the native count request |
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
The resource record lists the packaged resource paths.
Each native build packages the current captured game source.

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
A separate analytics document sends one empty LoopAware count request at application launch.
The native application has no Google Analytics integration.
Native counts use a dedicated LoopAware site with an aggregate profile.
The parent document loads feedback only after the parent gate, explicit adult agreement, and feedback selection.
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
| Local game | The selected allergen and results stay in session memory. No game preference uses persistent storage. Catalog and audio requests use packaged data URLs. |
| Native analytics client | Sends one empty JSON object by POST. Omits cookies and referrer. Does not retry a failed or uncertain response. |
| LoopAware analytics | The collector stores only site ID, UTC date, and request count. Transport processes network information transiently. Proxy logging requires separate verification before production activation. |
| LoopAware feedback | A separate parent action loads `widget.js`. Submission contains contact details, a message or sentiment, site ID, and source URL. LoopAware stores IP and User-Agent with feedback. |
| External fonts | The game loads Google Fonts automatically when online. The game uses the system sans-serif font offline. |
| Support | The address is informational. The game does not send email or collect support correspondence. |
| Website | The existing Google Analytics, LoopAware widget, and external fonts remain on the browser game. The mobile privacy page starts no external service. |

The native analytics client uses no visitor identifier, device record, or persistent storage.
LoopAware retains daily counts for the configured calendar-day window in its source contract.
The canonical configuration specifies 90 days.
The native request tests do not prove deployed proxy behavior or store acceptance.

The public mobile privacy page source is `privacy.html`.
Its intended URL is `https://allergy.mprlab.com/privacy.html` after authorized website publication.
The same privacy text appears in an expandable section inside the mobile parent area.
It describes local preferences, automatic services, guarded feedback, support, and the food-safety limit of the game.
F004 supplies the privacy contract and client evidence. F003 retains production retention, deletion, declarations, and native runtime verification.

## Privacy Implementation On October 1, 2026

F004 implements the current contract from P002. B048 is resolved. Final CI passed on October 26, 2026. `PRIVACY-QUALIFICATION.md` supplies the data inventory and remaining production procedure.
The game retains selection and results only in session memory. The earlier persistent-storage claim was incorrect.
The parent feedback action now requires explicit adult agreement after the arithmetic gate.
The browser initializes denied storage before its Google Analytics measurement commands.
`make test-privacy` checks both browser engines, complete font requests, actual selection, isolated counts, feedback entry, and session reset.
`make verify-privacy` records live provider requests without feedback submission.
`make privacy-disclosures` prepares the shared policy and source contract for store review.
F003 retains production retention, removal, native runtime, and store declaration checks.

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
3. Use the selected source for `make release` through the installed Gateway runtime.
4. Run `make publish` to publish the sealed artifact.
5. Run `make deploy` to apply the selected Pages resource.
6. Verify the public website, domain, and `/.mprlab-release.json` against the publication receipt.

The lifecycle owns the release marker.
The local Pages test does not create a release marker or prove public publication.
The current manifest selects only the website.
The archived mobile mapping remains external until the F003 provider and metadata prerequisites pass.

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
Neither observation proves first-launch offline behavior. Automated browsers, simulators, and emulators are sufficient for device acceptance.

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

This validation did not repeat live provider requests.
The earlier Android launch result remains limited to that earlier artifact.
Hosted CI, signed store artifacts, store installation, and public publication remain unverified.
The Governor and mechanical documentation checks passed for the final validation record.
The language review covers the changed prose only.

## Remaining Acceptance

F001 software acceptance is completed with the recorded native observation limits.
F003 retains the new LoopAware deployment, scoped synthetic site removal, and final store certification.

Signed AAB and IPA artifacts, final screenshots, and store declarations remain operations in `STORE-READINESS.md`.
B046 corrected native store metadata. B047 corrected the feedback verification command.
B005 passed live feedback verification in Chromium and WebKit on October 1, 2026, without feedback submission.

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

## Native iOS Preparation

B044 replaces the obsolete iOS cloud adapter with the shared native build contract.
The application adapter sends both platform requests through Gateway's `mobile-build-operation`.
The selected manifest uses local builds and `.mjs` adapters. The request schema is 3.
Gateway owns temporary signing state, provisioning, native execution, and artifact verification.
The private environment file supplies the team signing identity and App Store Connect API inputs.
The iOS artifact uses the `app-store-connect` export method and the declared App Store intent.
The adapter allocates store build numbers from the sealed release timestamp.
The native phase uses the selected Node executable and the React Native bundler.
The native build consumes the retained offline game resources.
The source config and prepared native projects use version 1.0.1.
B006 verifies the source version through the real Expo generator for both platforms.
B007 removes absent native test targets from the generated shared scheme.
B008 removes Podfile property error recovery. B009 explicitly selects React Native and Expo source dependencies.
The selected source dependencies override inherited prebuilt flags.
Native preparation tests valid, missing, and malformed properties, plus an unavailable prebuilt service, through actual CocoaPods.
After a native or game source change, run `make mobile-prepare-store` before release.
Use simulators, emulators, and automated browsers for device validation.
Signed artifact, store submission, review, and public availability require separate evidence.

## iOS Scene Lifecycle

B050 selects the Expo scene lifecycle for Xcode 27 and iOS 27.
The source plugin sets `ios.enableSceneSupport` to `true`.
It keeps `ios.buildReactNativeFromSource` at `true` and `usePrecompiledModules` at `false`.
Run `make mobile-prepare-store` after a native config or dependency change.
The real Expo generator test verifies `EXExpoAppSceneDelegate` and `ExpoReactNativeFactoryProvider`.
Simulator startup evidence remains separate from signed store artifacts.
The unsigned version 1.0.1 simulator build displayed the game on iOS 27.0 with the iOS 27.1 SDK.

## Android Compiler Policy

Android preparation runs `mobile/scripts/prepare-android-build-policy.mjs` after Expo.
The generated `gradlew` supplies `-Pkotlin.compiler.execution.strategy=in-process`.
The JVM metaspace limit is `1g`.
Preparation keeps the heap, parallel execution, workers, ABI selection, and signing inputs unchanged.
`make test-native-release` verifies real launcher arguments and repeated preparation.
