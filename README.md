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
