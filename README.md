# Allergy Wheel

An interactive allergy wheel game rendered in the browser. The project ships with automated browser tests that validate utility helpers, state transitions, and canvas-based integration scenarios. When players land on the quick game screen they are invited to pick any troublesome allergens and see a goal reminder to spin the allergy wheel to win 10 hearts.

## Browser compatibility

| Browser | Minimum version | Release date       | Market share after release |
|---------|-----------------|--------------------|----------------------------|
| Chrome  | 84              | July 14, 2020      | 69.23%                     |
| Edge    | 84              | July 16, 2020      | 5.03%                      |
| Firefox | 90              | July 13, 2021      | 2.26%                      |
| Safari  | 14              | September 16, 2020 | 14.98%                     |

## Browser-based tests

Open `tests/index.html` in any supported browser to execute the table-driven test suites. The harness exercises the public modules (state management, menu rendering, wheel controls, and DOM utilities) using the built-in `assert*` helpers so that gameplay behavior remains covered without any Node.js tooling.

## Dynamic allergen summary

The crawler-friendly food allergy summary that appears on the first screen is now rendered in the browser using the live catalogs. Whenever entries in `data/allergens.json`, `data/dishes.json`, or the ingredient mappings change, simply reload the page and the summary updates automatically. A static `<noscript>` block remains in place for SEO crawlers without JavaScript support.

## Avatar customization

Players can personalize the result card by choosing from six built-in avatars: Sunny Girl, Curious Girl, Adventurous
Boy, Creative Boy, T-Rex, and Triceratops. The currently selected avatar is displayed in the header toggle button and on
the allergy result card during the reveal sequence.

To change avatars, click the avatar button in the header to open the selector menu. Choosing any option updates the
header image immediately, closes the menu, and persists the selection so the reveal card shows the same avatar until a
different option is picked.

## License

This project is proprietary software. All rights reserved by Marco Polo Research Lab.
See the [LICENSE](./LICENSE) file for details.
