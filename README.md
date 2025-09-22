# Allergy Wheel

An interactive allergy wheel game rendered in the browser. The project now includes automated tests powered by Jest to validate utility helpers, state transitions, and canvas-based integration scenarios. When players land on the quick game screen they are invited to pick any troublesome allergens and see a goal reminder to spin the allergy wheel to win 10 hearts.

## Browser compatibility

| Browser | Minimum version | Release date | Market share after release |
| --- | --- | --- | --- |
| Chrome | 84 | July 14, 2020[^chrome-84-release] | 26.95% (Aug 2020 cumulative global usage)[^caniuse-202008] |
| Edge | 84 | July 16, 2020[^edge-84-release] | 2.25% (Aug 2020 cumulative global usage)[^caniuse-202008] |
| Firefox | 90 | July 13, 2021[^firefox-90-release] | 2.51% (Aug 2021 cumulative global usage)[^caniuse-202108] |
| Safari | 14 | September 16, 2020[^safari-14-release] | 1.50% (Oct 2020 cumulative global usage)[^caniuse-202010] |

[^chrome-84-release]: Stable Channel Update for Desktop (Chrome 84), Chrome Releases Blog, July 14 2020. <https://chromereleases.googleblog.com/2020/07/stable-channel-update-for-desktop.html>
[^edge-84-release]: Microsoft Edge Stable Channel release notes, version 84, Microsoft Learn. <https://learn.microsoft.com/en-us/deployedge/microsoft-edge-relnote-stable-channel>
[^firefox-90-release]: Firefox 90.0 release notes, Mozilla, July 13 2021. <https://www.mozilla.org/en-US/firefox/90.0/releasenotes/>
[^safari-14-release]: About Safari 14 updates, Apple Support, September 16 2020. <https://support.apple.com/en-us/HT211956>
[^caniuse-202008]: Sum of StatCounter global usage for Chrome 84 and later (26.95%) and Edge 84 and later (2.25%) using the August 2020 `alt-ww.json` dataset. <https://github.com/Fyrd/caniuse/blob/48d1b73113f878a55aaccce25f8c52252720ef55/region-usage-json/alt-ww.json>
[^caniuse-202010]: Sum of StatCounter global usage for Safari 14 and later (1.50%) using the October 2020 `alt-ww.json` dataset. <https://github.com/Fyrd/caniuse/blob/f65f7d5a78ae6e00d1dcbb25f4108a779b0f886d/region-usage-json/alt-ww.json>
[^caniuse-202108]: Sum of StatCounter global usage for Firefox 90 and later (2.51%) using the August 2021 `alt-ww.json` dataset. <https://github.com/Fyrd/caniuse/blob/7be48174f480d080126d25edbd67573494959e6a/region-usage-json/alt-ww.json>

## Prerequisites

- Node.js 18 or newer
- npm (bundled with Node.js)

## Install dependencies

```bash
npm install
```

## Run the test suite

```bash
npm test
```

The Jest harness is configured for a jsdom environment so the integration tests can verify canvas rendering and gameplay flows. All test files live inside the `tests/` directory and are grouped into `unit` and `integration` subdirectories.

## Avatar customization

Players can personalize the result card by choosing from six built-in avatars: Sunny Girl, Curious Girl, Adventurous Boy, Creative Boy, T-Rex, and Triceratops. The currently selected avatar is displayed in the header toggle button and on the allergy result card during the reveal sequence.

To change avatars, click the avatar button in the header to open the selector menu. Choosing any option updates the header image immediately, closes the menu, and persists the selection so the reveal card shows the same avatar until a different option is picked.
