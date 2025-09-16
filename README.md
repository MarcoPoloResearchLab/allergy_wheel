# Allergy Wheel

An interactive allergy wheel game rendered in the browser. The project now includes automated tests powered by Jest to validate utility helpers, state transitions, and canvas-based integration scenarios.

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

Players can personalize the result card by choosing from four built-in avatars: Sunny Girl, Curious Girl, Adventurous Boy, and Creative Boy. The currently selected avatar is displayed in the header toggle button and on the allergy result card during the reveal sequence.

To change avatars, click the avatar button in the header to open the selector menu. Choosing any option updates the header image immediately, closes the menu, and persists the selection so the reveal card shows the same avatar until a different option is picked.
