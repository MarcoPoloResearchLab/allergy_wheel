# Allergy Wheel Privacy Contract

F004 owns the client implementation and verification commands. P002 preserves the full earlier decision history.
F003 owns the production checks and store declarations below. F001 owns native software acceptance.
The first review date was October 1, 2026. This record does not certify legal consent, country approval, or store acceptance.

## Current Qualification On October 27, 2026

F001 software acceptance is completed. F003 retains provider qualification and store delivery.
F001 CI passed Chromium and WebKit game, privacy, offline, audio lifecycle, and phone and tablet layout checks before B052.
Version 1.0.1 displayed the game in an iOS 27 simulator and an Android 17 emulator.
Native observations recorded storage and font and count resource history.
The later native UI checks passed parent controls, selection, mute, Stop, results, and Spin Again on both platforms.
At startup, Android game local and session storage key lists were empty.
Analytics localStorage access was denied, and its session storage keys were empty.
At startup, iOS game and analytics local and session storage key lists were empty.
Exact native startup methods, request headers, bodies, and referrers were not captured.
Source request tests and native observations supply the accepted software evidence with these limits.
No further inspector or hardware check is required.

The inspected LoopAware runtime selects 90-day aggregate retention. No expired aggregate rows were observed.
Source code removes expired counts at startup and every 24 hours.
The collector and proxy log observations for aggregate counts contained no IP address, request headers, or visitor identifiers.
The new LoopAware deployment and scoped synthetic site removal remain pending.
Feedback IP and User-Agent remain retained fields. The 30-day account deletion period remains a provider policy claim.
Website release v1.0.3 passed verification with the prior public privacy notice.
The B052 purpose and safeguard text remains unpublished. Its next website activation requires a new public verification.
Store declarations are saved. Apple privacy publication still requires user approval for its legal attestation.
These results do not establish signed artifacts, store review, or public availability.
Dated sections below preserve their earlier evidence. This section and the production procedure control current qualification.

## Current Audience And Services

The selected audience is ages six and older in all available countries.
The full game is free, without advertisements, purchases, or an account requirement.
The native game starts aggregate LoopAware counts and Google Fonts automatically.
Only native feedback requires the parent gate, adult agreement by checkbox, and a separate feedback action.
The browser website keeps automatic Google Analytics and the LoopAware widget.
Browser analytics defaults deny analytics and advertisement storage before measurement configuration.
Google signals and advertisement personalization are disabled. Denied storage can still permit measurement requests.

`PrivacyContract` in `js/constants.js` supplies the public page, native parent text, and disclosure artifacts.
The public policy URL is `https://allergy.mprlab.com/privacy.html` after publication of the current source.
The food-safety warning remains part of that text.

## Data Inventory

| Surface | Data and purpose | Retention and removal | Evidence limit |
| --- | --- | --- | --- |
| Native game | Allergen selection and results stay in session memory. | Restart or reload removes the selection. System controls can clear older application storage. | Real selection creates no persistent storage in Chromium and WebKit. Native runtime verification remains below. |
| Native counts | One empty POST supplies a startup count. Network transport processes an IP address. No cookies, referrer, selection, results, or visitor identifier are sent. | The provider contract keeps daily totals for at most 90 UTC calendar days. Site deletion removes associated counts. | LoopAware F016 source and B045 collector evidence give evidence for this contract. Deployed retention and proxy logs require verification. |
| Google Fonts | The stylesheet and font file requests send an IP address and browser headers to Google. | Google controls retention. No fixed period is verified by this application. | Both stylesheet and font file requests must appear in the live inventory. Offline play uses a system font. |
| Adult feedback | Optional contact details, message or sentiment, site ID, and parent source URL support feedback. LoopAware also stores the IP address and browser/device information from User-Agent with feedback. | LoopAware policy keeps data while the account is active. It specifies associated data removal within 30 days after an account deletion request. | Live form entry proves connectivity. It does not prove submission, stored records, or deletion execution. |
| Support contact | The address is contact information. The game sends no email and collects no support correspondence. | External email uses the sender's email service. | This contact address is outside the native collection inventory. |
| Browser website | Google Analytics, automatic feedback, and fonts use a separate browser contract. | Earlier console evidence recorded two-month event retention and fourteen-month user retention. Current settings require verification. | Native counts do not replace browser analytics. Denied storage is not proof of no collection. |

The earlier local-storage claim was incorrect. The selection persistence helpers had no callers.
F004 removes those unused helpers and tests the actual session behavior.
A storage sentinel in controlled tests checks the document-origin boundary. It is test data, not a game preference.
The parent document and count document cannot read game-origin storage.
The native shell disables third-party cookies and uses separate incognito WebViews for these documents.

Browser tests do not execute the native WebView settings.
Closing the parent area destroys its document. A new visit requires the gate and agreement again.
Closing that area does not delete previously submitted feedback.

## Reproducible Implementation Evidence

1. Run `make test-privacy` for controlled Chromium and WebKit privacy checks.
2. Run `make verify-privacy` for the live provider inventory without feedback submission.
3. Run `make verify-feedback` for live browser and packaged parent form verification.
4. Run `make privacy-disclosures` to prepare the current contract and policy text.
5. Run `make mobile-prepare-store` after native configuration or dependency changes.
6. Run final `make ci` after the last implementation change.

`artifacts/privacy-validation` contains the live request inventory.
Each request records its phase, URL, method, body, cookie presence, referrer, and response status.
The inventory includes external font files and feedback configuration requests.
The live command sends one empty startup count per browser engine. It does not submit feedback.
`artifacts/privacy-disclosures` contains the source contract and public text for store review.
`store-disclosure-review.json` supplies candidate categories and unresolved classification questions.
[Apple App Privacy details](https://developer.apple.com/app-store/app-privacy-details/) distinguish real-time request data from stored collection.
The [Google Data safety guidance](https://support.google.com/googleplay/android-developer/answer/10787469) requires review of actual use, ephemeral processing, and provider roles.
Do not infer location from a transport IP address or a person identifier from a site ID.
Optional feedback requires review of all applicable exceptions. The adult gate alone does not establish an exception.
These artifacts are preparation inputs. They are not completed store declarations.
A command failure keeps its corresponding evidence incomplete.

## Validation On October 1, 2026

Controlled privacy checks passed in Chromium and WebKit. The live inventory passed both engines with actual provider scripts.
The live feedback verifier passed the website and parent form without feedback submission.
Store exports passed the adult agreement regression. Native preparation passed all four CocoaPods cases.
The initial consent-default regression failed before implementation. The documented tag command format also failed before correction.
The source check passed 94 JavaScript and JSON files.
Final CI stopped at `make mobile-audit` with `GHSA-86w9-cpqp-85rv` in the existing Expo dependency tree.
B048 records the unavailable patched dependency. F004 remains blocked until final CI passes.
The remaining CI targets passed individually after that audit failure.
They cover Pages, store exports, feedback, privacy, native adapters, preparation, the Apple bundle phase, and local commands.
Those results do not establish a passing final CI run.
The failure does not establish a defect in the privacy controls. It prevents a claim of complete code acceptance.
The Governor check preserves six earlier managed-file differences. Changed document checks report no mechanical findings.
The language review covers changed prose only. The checks do not certify unchanged historical text.

## Current Provider And Policy Evidence

LoopAware F016 defines aggregate counts with site ID, UTC date, and count fields.
Its startup config selects 90-day retention. Its removal transaction includes site counts and related feedback records.
Its tests reject detailed payloads and exclude persistent visitor records.
Gateway B539 passed its real proxy failure-log test. That source test does not prove production proxy settings.

The current [LoopAware privacy policy](https://loopaware.mprlab.com/privacy/) separates restricted aggregate counts from feedback and account data.
Its restricted count policy permits this separate application contract.
Its feedback and account restrictions still apply to adults. The gate does not establish legal parental consent.

[Apple Kids guidance](https://developer.apple.com/kids/) and [Apple review guidelines](https://developer.apple.com/app-store/review/guidelines/) describe child audience restrictions and parental gates.
The Kids Category decision remains separate from the selected audience and rating.
[Google Play Families requirements](https://support.google.com/googleplay/android-developer/answer/9893335) apply when the declared audience includes children.
[Google Data safety guidance](https://support.google.com/googleplay/android-developer/answer/10787469) requires accurate declarations for off-device data and external code.
[Google consent guidance](https://developers.google.com/tag-platform/security/guides/consent) explains denied defaults before measurement configuration.
[Google Fonts privacy FAQ](https://fonts.google.com/faq#privacy) describes unauthenticated requests and IP use for font delivery and security.
Google states that Fonts requests do not set cookies or include Google account credentials.
Google states that it does not use Fonts data for end-user profiles or targeted advertisements.
The public policy attributes these statements to Google. The FAQ gives no fixed retention period.
These sources establish review requirements. They do not establish this application's completed store certification.

B052 makes the count purpose and restricted log safeguards explicit in the shared policy.
Startup totals measure use and help maintain the app. The count service does not create visitor profiles.
The collector and proxy log exclusions apply to aggregate counts. They do not describe retained feedback IP and User-Agent fields.
These statements preserve the current provider observations and their limits. They do not establish a legal exception or certification.

Feedback IP and User-Agent are retained fields, separate from count and font transport data.
Site removal checks do not verify account deletion timing. The 30-day account deletion period remains a provider policy claim.

## Production Procedure Before Store Certification

1. Use the recorded source, browser, and native evidence with its stated observation limits.
2. Compare the current disclosure exports and saved store answers with the native data inventory.
3. Complete the new LoopAware deployment before the remaining synthetic removal check.
4. Use only operator-owned isolated test sites and synthetic adult feedback and counts for that check.
5. Delete only those sites through `DeleteSite`. Compare scoped database records before and after removal.
6. Keep site removal evidence separate from the 30-day account deletion policy claim.
7. Keep the dated browser Google property evidence separate from the native inventory.
8. Compare the public policy and the final candidate's source contract.
9. Complete the store data, audience, country, and provider declarations from the verified inventory.
10. Obtain user approval for the legal attestation before Apple privacy publication.
11. Record declaration saves, privacy publication, certification, review, and public availability as separate results.

Use the available software environments for device acceptance. No hardware test is required.
Use synthetic adult data for provider removal checks. Do not remove the production site or customer records.
Until those checks pass, keep the store certification incomplete and retain the concrete missing result under F003.
The remaining results are the new LoopAware deployment, scoped synthetic site removal, and final store declarations and certification.
