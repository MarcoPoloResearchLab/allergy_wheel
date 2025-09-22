# Allergy Wheel

An interactive allergy wheel game rendered in the browser. The project now includes automated tests powered by Jest to
validate utility helpers, state transitions, and canvas-based integration scenarios. When players land on the quick game
screen they are invited to pick any troublesome allergens and see a goal reminder to spin the allergy wheel to win 10
hearts.

## Browser compatibility

| Browser | Minimum version | Release date       | Market share after release |
|---------|-----------------|--------------------|----------------------------|
| Chrome  | 84              | July 14, 2020      | 69.23%                     |
| Edge    | 84              | July 16, 2020      | 5.03%                      |
| Firefox | 90              | July 13, 2021      | 2.26%                      |
| Safari  | 14              | September 16, 2020 | 14.98%                     |

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

The Jest harness is configured for a jsdom environment so the integration tests can verify canvas rendering and gameplay
flows. All test files live inside the `tests/` directory and are grouped into `unit` and `integration` subdirectories.

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