# Allergy Wheel Store Preparation

F003 owns public store delivery. F001 owns signed artifacts and real-device acceptance.
P002 owns the data contract. B005 owns the observed feedback configuration failure.
This record describes preparation on September 7, 2026. It does not record a store submission.

## Prepared Store Text

`mobile/store/listing.json` contains the English store text and reviewer instructions.
The text describes the actual game, offline play, optional parent services, and food-safety limits.
The selected support contact is `support@mprlab.com`.
The public privacy page also supplies the support contact.

| Command | Result |
| --- | --- |
| `make store-listings` | Export fourteen text files and a digest record to `artifacts/store-listings`. |
| `make test-store-listings` | Verify exports, text limits, public destinations, and rejection of invalid metadata. |
| `make verify-store-pages` | Verify the live privacy and support page through Chromium in Docker. |

The exporter checks application names and identifiers against `mobile/app.json`.
It checks public destinations against the selected Pages resource.
It applies the Apple name, subtitle, description, and keyword limits.
It applies the Google title, short description, and full description limits.
The exported record uses `publicationStatus: not-submitted`.

These files are preparation materials, not provider requests or publication receipts.
Review notes still identify the incomplete P002 verification.
Remove that incomplete-status text only after the verification passes.
The exporter does not assign an App Store ID, age rating, country approval, or privacy declaration.
It does not upload metadata or artifacts.

Official text references:

- [Apple app information](https://developer.apple.com/help/app-store-connect/reference/app-information/app-information/)
- [Apple platform version information](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information/)
- [Google app setup and store text](https://support.google.com/googleplay/android-developer/answer/9859152?hl=en)

## Gateway Baseline Before This Change

The inspected gateway commit is `b2764b233670183615ac9245cd4d1a6e29b73cb2`.
Its versionless manifest accepts `mobile_application` with `build_system: local` and application build script paths.
Android accepts `destination: google_play` with an `internal` or `production` track.
Apple accepts only `destination: testflight` with an `internal` track.
Apple also requires the verified numeric App Store application ID.

Gateway F007 owns explicit delivery goals. Gateway F008 owns public Apple delivery and store promotion.
The current Google production publisher can record submission before review or public activation.
Neither an Apple internal upload nor a Google submitted result proves the public goal of F003.
No internal destination substitutes for that goal.

The application manifest continues to declare the website only.
A public mobile declaration requires the accepted gateway delivery contract and verified store records.
No placeholder application ID or unsupported destination was added.
No application-owned store publisher was added.

The current shared builder accepts prepared native projects through `mobile-build-operation`.
The application adapter supplies identifiers, signing environment names, version, build number, and a preparation digest record.
The gateway owns native execution and artifact validation.
The current application preparation generates ignored native projects without the required preparation digest record.
F001 must connect those inputs to the shared builder before a store artifact can be sealed.
The release version must come from the gateway's Gix decision, not the development version in `app.json`.

## Account And Signing Inputs

The gateway reads publication credentials from `configs/.env.allergy-wheel` in this application repository.
`configs/allergy-wheel-publication.env.example` lists the four canonical assignment names.
The private file has an exact Git ignore rule and is excluded from the Docker context.
Use absolute paths for the referenced Apple key and Google service-account file.
Keep credential values out of source, command arguments, documentation, and chat.

The initial search found no publisher assignments in the application or gateway private inputs.
The later recovery found existing publisher inputs in the LoopAware repository.
The canonical application input now references those existing key files.
Apple returned HTTP 200 for app `6809568034` with bundle ID `com.mprlab.allergywheel`.
Apple also confirmed a saved review contact with phone, email, first name, and last name.

The Google service account authenticated but initially lacked access to Allergy Wheel.
The console now grants that account application-specific read, testing-release, and production-release permissions, with the required implied permissions.
The Google reviews API then returned HTTP 200 for `com.mprlab.allergywheel`.
These checks establish authentication and application read access. They do not establish a successful artifact upload.
The later console operation verified Apple ID `6809568034` for `com.mprlab.allergywheel`.
The later Google Play operation created application record `4974738121228216490` for the same package.

The host reports four valid code-signing identities.
That count does not establish the application's distribution team or provisioning profile.
The latest inventory found a Portal and an Android emulator. The emulator disconnected before installation.
No physical Apple device is connected.
No new signed artifact or physical-device acceptance result was produced during this preparation.

## Public Page And Provider Evidence

`make verify-store-pages` passed against `https://allergy.mprlab.com/privacy.html`.
Chromium verified HTTP 200, the exact current privacy text, and the support contact.
The page requested no external service and produced no script error.
This check does not establish a Pages lifecycle receipt or validate every game file on the live website.

The old LoopAware ID returned HTTP 404 with `unknown_site` from `https://loopaware-api.mprlab.com/public/widget-config`.
The signed-in dashboard contained no Allergy Wheel record.
The recovery created site `9931e62f-5a60-48e6-9e31-16de62f62e7d` with `support@mprlab.com` as its notification contact.
Its allowed origins are `https://allergy.mprlab.com` and `https://allergy-wheel-parents.invalid`.
Both origins now receive HTTP 200 for the new site configuration.
The website widget and both mobile LoopAware service URLs use the new ID in source.

`make verify-feedback` first failed with the old ID and HTTP 404.
After correction, the command opened the real form in Chromium and WebKit for both origins.
The check uses the website embed and generated parent document. It permits provider GET requests only.
The parent gate and service selection remained effective. No feedback was submitted.
These browser results do not establish native WebView acceptance or publication of the changed website source.
B003 retains failure and retry coverage. B005 retains native acceptance.

## Data Declaration Work

The selected store audience is ages six and older. The selected price is free.
The complete game has no advertisements, purchases, or account requirement.
The selected release scope is all available countries, with documented store restrictions when applicable.
These decisions do not determine store age ratings or establish country approval.

| Surface | Current source evidence | Required verification |
| --- | --- | --- |
| Game preferences | The selected allergen stays in game storage. | Verify native storage and outgoing requests on both platforms. |
| Google Analytics | A parent action loads the selected property with storage and advertisement consent denied. | Verify actual requests, property settings, retention, deletion, and disclosure categories. |
| LoopAware analytics | The source sends visit, device, locale, display, and network data. | Verify deployed settings, actual native requests, retention, and deletion. |
| LoopAware feedback | The corrected provider form opens in both browser engines. | Complete B005 native acceptance and verify the complete data contract. |
| External fonts | A parent action contacts Google Fonts. | Record actual request data and the applicable disclosure. |
| Support email | Correspondence can contain contact details and message text. | Verify the support retention and deletion procedure. |

Apple restricts third-party analytics for child-directed apps and distinguishes a parental gate from legal consent.
See [Apple review guidelines 1.3 and 5.1.4](https://developer.apple.com/app-store/review/guidelines/).
Google requires accurate child-audience and data declarations, including collection through APIs and SDKs.
See [Google Play Families requirements](https://support.google.com/googleplay/android-developer/answer/9893335?hl=en).

P002 cannot close from the current source inventory or controlled browser tests.
Keep the selected services while their compatibility is verified.
Do not submit a claim of no data collection, no tracking, or approved child-directed analytics without the corresponding evidence.

## Artwork And Screenshots

The repository wheel SVG supplies existing artwork. Native app icons and store artwork still require preparation and review.
Screenshots must show the final native candidate. Browser captures do not establish native acceptance.
Capture allergen selection, the wheel, and ingredient results for both phone and tablet layouts.
Keep each capture with its platform, device, application version, build identifier, and source commit.

Apple's accepted dimensions depend on the device class.
Use the current [Apple screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/).
Google requires a 512 by 512 pixel store icon and a 1024 by 500 pixel feature graphic.
See [Google preview asset requirements](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en).
No generated screenshot or artwork is recorded as final in this preparation.

## Completion Order

1. Verify the store account records and signing identities with the canonical private inputs.
2. Complete B005 native feedback acceptance with the restored configuration.
3. Complete P002 native request, storage, retention, and disclosure verification.
4. Complete F001 shared build integration, signed artifacts, artwork, and physical-device acceptance.
5. Verify gateway F007 and F008 before the public mobile declaration.
6. Complete both store records, declarations, reviewer contacts, and release-country selections.
7. Run the Governor check and final `make ci` on the selected release source.
8. After an explicit production request, run `make release && make publish && make deploy` from the application repository.
9. Verify processing, review, public availability, and installation as separate results.
10. Supply each verified public destination to F002.

## Preparation Validation

The initial Docker integration test failed because the store exporter was absent.
The completed exporter passed its focused integration checks and produced fourteen text files with verified digests.
Final `make ci` passed, including browser, mobile, store text, Pages, dependency, and local command checks.
The separate live privacy and support check passed.
The Governor, tracker identifier, and mechanical documentation checks passed.
The producing agent reviewed the changed prose only.

F003 remains blocked on native acceptance, privacy verification, signed artifacts, and the gateway public-delivery contract.
The source changes remain uncommitted. No production lifecycle operation was run during this preparation.

## Console Operation On September 7, 2026

The owner requested F003 execution through the signed-in internal browser.
Both consoles showed the Vadym Tyemirov account.
The Google Play developer account is `5851682736224790825`.
The Apple developer team is `Z9ZW6HDGML`.

Apple registered the explicit bundle ID `com.mprlab.allergywheel`.
App Store Connect created Allergy Wheel with Apple ID `6809568034` and SKU `com.mprlab.allergywheel`.
The record uses iOS, English (U.S.), and limited user access.
The initial version is `1.0`, with status `Prepare for Submission`.
This store version is not a sealed release version.

The saved app information contains the subtitle from `mobile/store/listing.json` and the Games category.
The saved privacy URL is `https://allergy.mprlab.com/privacy.html`.
Apple accepted a zero-price schedule for 175 countries or regions.
All 175 countries or regions show `Available on App Release`.
The country selection also includes future countries or regions.
Mac and Apple Vision Pro distribution are disabled under the selected phone and tablet scope.
The app information page shows a Vietnam Game License notice and an inherited non-trader status.
The regional declaration review is incomplete.
The version description, keywords, and reviewer notes persisted after a page reload.
The review contact shows Vadym Tyemirov.
The API verified that the phone, email, first name, and last name are saved.
The earlier request for the review phone number is resolved.

After the owner continued, both Google creation declarations were checked.
Google Play created application record `4974738121228216490` for `com.mprlab.allergywheel`.
The record uses Allergy Wheel, English (United States), Game, and Free.
The console saved the privacy URL, no sign-in requirement, no ads, no government affiliation, and no financial features.
The console also saved the declaration that the game has no health features.
The game offers entertainment and discussion. It does not track diet, manage conditions, or provide medical guidance.
The declaration review used the [Google health feature definitions](https://support.google.com/googleplay/android-developer/answer/14738291).
The saved store settings use the Casual category, `support@mprlab.com`, and `https://allergy.mprlab.com/`.
The English listing draft contains the prepared short and full descriptions. A later visit verified those values.
The dashboard shows seven of eleven setup tasks complete.
The listing still requires its icon, feature graphic, and native screenshots.
Content ratings, target audience, and Data safety remain incomplete.
The content-rating form contains the support email and Game category. IARC terms acceptance awaits owner confirmation.
Before a content rating exists, the target-audience form disables ages below thirteen and shows an ESRB rating warning.
No audience choice was saved. The selected product audience remains age six and older.
The initial catalog included alcohol references. The later recipe revision and recalculated Apple rating replace that initial state.

The initial exact-name credential search found no publisher assignments in the application or gateway private inputs.
The later recovery established the canonical input and API access, as recorded above.

The gateway remains at `b2764b233670183615ac9245cd4d1a6e29b73cb2`, with F007 and F008 open.
Its Apple publisher accepts only the internal track.
The application remains at `2fb5db8e4f244e214fcf3f2566ef05016df0ef6b`, with existing uncommitted preparation changes.
The selected manifest declares the website only.

The repeated `make verify-store-pages` check passed.
The initial LoopAware check returned HTTP 404. The recovery above corrected the provider record and source ID.
F001, P002, B005 native acceptance, and gateway public Apple delivery still prevent store submission.
No artifact upload, review request, or public release occurred.

The Governor check and mechanical documentation checks passed for this update.
The language review covered the changed prose only.

## Native Recovery Validation

The corrected Android development APK and iOS simulator application built successfully.
Both artifact receipts identify version `1.0.0` and uncommitted source based on `2fb5db8e4f244e214fcf3f2566ef05016df0ef6b`.
The iOS simulator installed and launched the application. Its parent gate was visible.
Simulator coordinate input failed with `noWindowsAvailable`, so the native feedback form check did not complete.

The Android emulator disconnected before the installation command.
No physical iPhone was available. The connected Portal was not used for this check.
Native interaction, signed store artifacts, and physical-device acceptance remain incomplete.

Final `make ci` passed with 69 source files, browser and mobile flows, dependency checks, store text, Pages, and local command checks.
The B003 failure and retry regressions passed.
The Governor check, mechanical documentation checks, and changed-prose review passed.
The recovery logs are under `artifacts/validation/b005-*`.
The source changes remain uncommitted. The corrected website source still requires publication.

## Signed Candidate Work

The owner restored the ages-six-and-older audience on September 7, 2026.
Mussels with Fries now uses lemon. Crispy Battered Cod replaces the earlier dish name and narrative reference.
The unused wine ingredient and emoji were removed.

The browser integration test first failed on alcohol references, then passed with the revised catalog.
Apple saved the recalculated 4+ rating for 172 countries or regions, with regional exceptions.
The displayed exceptions include ALL in Korea and 00+ in Vietnam. The earlier operating systems also show a global 4+ rating.

Google Play still disables ages below thirteen until the IARC questionnaire is completed.
Google IARC terms acceptance remains pending. The previously saved older age groups require revision.

Apple created active distribution profile `M89DTYG66U` for the existing bundle ID and installed certificate.
The profile expires on June 21, 2027. Its application identifier and distribution entitlements verified.
The private input contains the Apple signing references and a new application-specific Android upload key.
The key is stored under ignored `configs/signing` and remains outside the Docker context.

The native release plugin now uses separate Android release signing and gateway version inputs.
Apple metadata reads `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION`.
The application adapter derives one build number from the sealed release timestamp.
The gateway seals that number before native execution and keeps it for an exact retry.
`make mobile-prepare-store` records 69 prepared native inputs after generation and CocoaPods installation.
The prepared inputs are source files for review. Native build caches remain excluded.

The selected manifest now declares the two production store destinations for signed candidate preparation.
The Apple declaration depends on the gateway candidate-submission changes in this task.
This declaration does not establish F003 public availability.
Gateway F007 delivery goals and the remaining F008 review and promotion operations remain open.

The native-generation, preparation, and application adapter integration tests passed after their expected initial failures.
No signed store artifact, native privacy acceptance, store upload, or public release is recorded by this work.

## Analytics Property Review

The signed-in console verified property `505158881`, stream `12163622416`, and measurement ID `G-5CDP19RY2Z`.
The property uses the existing `https://allergy.mprlab.com` web stream.
Event data retention is two months. User data retention is fourteen months, with reset after new activity enabled.
Enhanced measurement is enabled. Email redaction is active, and URL parameter redaction is inactive.

The review disabled Google signals, user-provided data collection, automatic user-data collection, and granular location and device data collection.
Advertising personalization is now allowed in zero of 307 regions.
These property changes retain standard analytics and agree with the selected child audience and no-advertising design.
The [Google advertising policy](https://support.google.com/analytics/answer/2700409) describes the additional collection from advertising features.

The deletion page has no existing requests and provides a control to schedule a request.
No data deletion was performed. This observation does not prove a completed deletion procedure.
The consent page reports inactive analytics and advertising consent signals for the existing web stream.
The console also reports no detected property issue. That status does not establish native consent or child-privacy acceptance.
P002 retains native requests, storage, retention, deletion, and disclosure verification.

The recipe revision passed `make ci` and `make mobile-prepare-store`.
The local command test now obtains the published address from Docker container data.
This change corrects the Compose `invalid IP:0` result for temporary ports.

## Remaining Release Boundary

Gateway `make lint` passes against the corrected working files.
The final `make test-published-deployment` run passed its provider and lifecycle integration tests.
Gateway `make ci` captures committed HEAD and still reports the existing HTTP redirect status-literal errors from that commit.
The full test process also reached the 599-second deadline.
The application and gateway changes require source review and committed-source validation before the signed release command.
The gateway Governor check also reports existing differences in its managed policy and plan files.
No signed artifact or publication operation ran during the recipe revision.
The latest `xcrun devicectl list devices` check found no physical Apple device.

## Automatic Service Decision

The owner required fonts and analytics to start without a parental gate.
This decision replaces the earlier parent-only service design in this record.
The game loads Google Fonts automatically. A separate document starts Google Analytics and LoopAware analytics at application launch.
Only feedback requires the parent gate and feedback selection.
The separate analytics document cannot read game preferences. Analytics storage and advertising features remain disabled.
The parent screen has an expandable privacy section, and the modal uses its own safe-area provider.
The privacy source and reviewer instructions now describe these behaviors.
P002 retains provider and child-audience verification for the revised automatic collection.
The public privacy page and saved store notes require publication from the revised source.

The automatic-service tests passed, including offline play and unavailable analytics scripts.
The live LoopAware form opened in Chromium and WebKit. No feedback was submitted.
Both development artifacts built. The Android build first exposed an ambiguous Groovy version assignment, which was corrected in the source plugin.
The iOS simulator showed the game font and the corrected parent layout.
Simulator coordinate input returned `noWindowsAvailable`, so native form entry remains unverified.

Final `make ci` passed after the Android correction. The Governor and mechanical documentation checks passed.

## Store Preparation Continuation

The owner authorized the IARC agreement on September 7, 2026.
Google Play reports completed IARC ratings: Everyone in North America, PEGI 3 in Europe, and corresponding regional ratings.
The younger audience groups are now available. Ages six and older are selected in the incomplete audience form.
The next step requires a COPPA and GDPR compliance certification for the app and its services.
P002 retains the native request, storage, retention, and deletion evidence before that certification.
The [Google Play Families requirements](https://support.google.com/googleplay/android-developer/answer/9893335?hl=en) also apply to the selected mixed audience.

Both stores saved the corrected description for automatic fonts and analytics, with feedback behind the parent gate.
Apple saved the revised reviewer instructions. Google saved the wheel icon and feature graphic in its listing draft.
The native icon was blank. Native configuration now uses the existing game wheel from `mobile/assets/icon.png`.
`make store-artwork` renders the native icon and Google graphics from the existing SVG source.
Native preparation now copies the mobile assets into its container.
The preparation command and native generator test first failed when their input copies omitted the icon.
Both passed after their input copies included the assets. Preparation records 76 native inputs.
Both development builds and final application CI passed. No signed app archive was built or uploaded.
Git initially changed the Windows Gradle wrapper line endings when the file entered its index.
The file attribute now preserves its generated bytes. All 76 native and 57 game input digests match the staged source.

The owner confirmed that no physical Apple device is available.
Simulator controls rejected interaction after a state refresh. Native interaction and final screenshot capture remain incomplete.
Signed releases still require source review and committed-source validation of the application and gateway.
The public privacy page still requires the revised source. P002 and F001 remain open.

Application preparation is in [pull request #134](https://github.com/MarcoPoloResearchLab/allergy_wheel/pull/134).
Apple candidate submission support is in [gateway pull request #363](https://github.com/MarcoPoloResearchLab/mprlab-gateway/pull/363).
Full gateway CI passed against source commit `856c40a17803438e966aaecfa9da4debcff63173`.
Both pull requests are ready for review. Source review, signed releases, and store acceptance remain separate requirements.
The signed-in LoopAware dashboard showed no visits for the new Allergy Wheel site on September 7, 2026.
The Admin and Traffic sections contained no retention control.
The [LoopAware privacy policy](https://loopaware.mprlab.com/privacy/) specifies retention while the account is active and deletion within 30 days after a request.
It says LoopAware does not knowingly collect personal information from children under 13.
P002 must verify the automatic analytics payload and permitted child use before the Google audience certification.
This policy review does not verify actual retention or deletion behavior.
