# Allergy Wheel Privacy Contract

F004 owns the client implementation and verification commands. P002 preserves the full earlier decision history.
F003 owns the production checks and store declarations below. F001 owns native software acceptance.
The review date is October 1, 2026. This record does not certify legal consent, country approval, or store acceptance.

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
| Adult feedback | Optional contact details, message or sentiment, site ID, and parent source URL support feedback. | LoopAware policy keeps data while the account is active. It specifies associated data removal within 30 days after an account deletion request. | Live form entry proves connectivity. It does not prove submission, stored records, or deletion execution. |
| Support email | Contact details and message text support answers and deletion requests. | The operator manages retention. No fixed support retention period is verified. | The mailbox retention and deletion procedure remains a production requirement. |
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
5. Run `make mobile-prepare-store` after game or native source changes.
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
[Google Fonts data practices](https://fonts.googleblog.com/2022/11/your-privacy-and-google-fonts.html) describe network data received for font delivery.
These sources establish review requirements. They do not establish this application's completed store certification.

## Production Procedure Before Store Certification

1. Capture game, counts, fonts, and adult feedback requests in Android emulators and iOS simulators.
2. Record request bodies, cookies, referrers, storage, and session reset with actual provider scripts.
3. Compare those captures with the exported contract and both store candidates.
4. Inspect the deployed LoopAware collector profile and proxy configuration.
5. Verify that proxy logs omit persistent IP addresses, headers, and visitor identifiers.
6. Verify the deployed retention job and removal of daily counts outside the selected window.
7. Verify site removal and associated count removal with an operator-owned test site.
8. Verify feedback retention and associated deletion with synthetic adult data and an operator-owned test account.
9. Record the support mailbox retention period and deletion procedure.
10. Verify support deletion with synthetic correspondence and retain the result.
11. Verify the current Google property settings, consent signals, retention, and deletion procedure for the browser website.
12. Compare the live public policy with the candidate's exported policy after website publication.
13. Complete Apple App Privacy and Google Data safety from the verified native inventory.
14. Review the selected child age groups, countries, and selected providers against current official store rules.
15. Record each declaration, certification, and store response separately from implementation acceptance.

Use the available software environments for device acceptance. No hardware test is required.
Use synthetic adult data for provider removal checks. Do not remove the production site or customer records.
Until those checks pass, keep the store certification incomplete and retain the concrete missing result under F003.
The current missing results are deployed logs, retention execution, feedback deletion, support procedures, native captures, and store declarations.
