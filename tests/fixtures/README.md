# Provider Test Fixtures

`loopaware-widget.js` is an unchanged copy of LoopAware `web/widget.js`.
The source commit is `11c4b6fda3f4a24a3be54870edefa451ff478d9e` in the sibling LoopAware repository.
Its SHA-256 is `deca38a5208a89d4b095e45b1857ee29f8b84da32e7f7b146c68fcd17a9db7f4`.

The mobile integration tests load this script through a controlled HTTP response.
They control the configuration endpoint and exercise the actual widget initialization and form.
They do not submit feedback or prove live provider connectivity.
The Pages artifact excludes the test directory.

For a provider contract change, replace this fixture with the reviewed source and update its commit and digest.
Run `make test-mobile` to verify the parent integration after the update.

## Display Font

`fredoka-one.ttf` is the Fredoka One font from the game's Google Fonts stylesheet.
The layout tests load this fixture through a controlled stylesheet response.
The same tests also use the system font with external requests blocked.
The game continues to load its font from the CDN.

Font source: `https://fonts.gstatic.com/s/fredokaone/v15/k3kUo8kEI-tA1RRcTZGmTmHB.ttf`.
License source: `https://github.com/google/fonts/blob/be2838a23fd2918408e22b25c54135da76525ff6/ofl/fredokaone/OFL.txt`.
The unchanged license is in `fredoka-one-LICENSE.txt`.
