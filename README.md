# prosemirror-inline-deco-repro
Reproduction of an issue with interaction between marks and widget decorations in the Prosemirror text editor.

Demo [here](https://jonathonherbert.github.io/prosemirror-inline-deco-repro/).

## Setup and run

Clone and install dependencies with `npm i`. Start the app with `npm run start`.

## Reproduce

Move the caret through the widget decorations with your arrow keys from left to right, and back again. The intent is to step through each widget decoration as keys are pressed until the caret has passed them all, after which it behaves as normal.

I haven't written code to handle starting from rhs to lhs to keep the code to a minimum! As a result, clicking into arbitrary positions is beyond the scope of this demo, and may produce odd results.

Different styling for the spans in question produce different behaviour:

In Chrome:

1. `inline` styling with no adjacent marks places the caret at the very end of the editable content whilst stepping through
2. `inline-block` styling with no adjacent marks behaves as expected, with a slight flicker
3. `inline` styling with adjacent marks behaves as with `1.`
4. `inline-block` styling with adjacent marks behaves as expected when moving right, but when moving left adds an additional caret position.

In Firefox:

- `inline` styling with no adjacent marks results in an invisible caret whilst the caret travels through the widgets
- `inline-block` styling with no adjacent marks behaves as with `1.`
- `inline` styling with adjacent marks behaves as with `inline`, but the caret cannot move from the rhs to the lhs of the document
- `inline-block` styling with adjacent marks behaves as with `3.`
