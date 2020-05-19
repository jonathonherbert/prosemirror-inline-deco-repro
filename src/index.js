import { Schema, DOMParser } from "prosemirror-model";
import { EditorState, Plugin, PluginKey, Selection } from "prosemirror-state";
import { EditorView, DecorationSet, Decoration } from "prosemirror-view";
import { exampleSetup } from "prosemirror-example-setup";

import "prosemirror-view/style/prosemirror.css";
import "prosemirror-example-setup/style/style.css";
import "./styles.css";

const schema = new Schema({
  marks: {
    example: {
      parseDOM: [
        {
          tag: "test-mark",
        },
      ],
      toDOM: (mark) => ["span", { class: "test-mark" }],
    },
  },
  nodes: {
    doc: {
      content: "block+",
    },
    paragraph: {
      group: "block",
      content: "inline*",
      parseDOM: [{ tag: "p" }],
      toDOM: () => ["p", 0],
    },
    text: {
      group: "inline",
    },
  },
});

const testDecoToDom = decoClass => (view, getPos) => {
  const el = document.createElement("span");
  el.classList.add(decoClass, "test-deco");
  return el;
};

const pluginKey = new PluginKey("side-test-plugin");

const noOfDecos = 3;
const decoStartPos = 6;
const MODIFY_OFFSET = "MODIFY_OFFSET";
const DECREMENT_OFFSET = "DECREMENT";
const INCREMENT_OFFSET = "INCREMENT";

const getSide = (cursorPos, offset, index) =>
  cursorPos === decoStartPos && offset > index ? -1 : 1;

const createPluginDecorations = (state, decoClass, index) => {
  const decos = new Array(noOfDecos).fill(undefined).map((_, index) => {
    const { offset } = pluginKey.getState(state);
    const orderOffset = (index + 1) / noOfDecos / 2;
    const {
      selection: { from, to },
    } = state;
    const isRange = from !== to;
    const side = isRange ? orderOffset : getSide(from, offset, index);
    return Decoration.widget(decoStartPos, testDecoToDom(decoClass), {
      key: index,
      side: side + orderOffset,
    });
  });

  // For debugging purposes, to make the decoration sides visible
  document.getElementById(
    getDebugId(index)
  ).innerHTML = `Widget 'side' properties, in render order: ${decos
    .map((_) => _.spec.side.toString().substring(0, 6))
    .join(", ")}`;

  return DecorationSet.create(state.doc, decos);
};

const createPlugin = (decoClass, index) =>
  new Plugin({
    key: pluginKey,
    props: {
      decorations: (state) => createPluginDecorations(state, decoClass, index),
    },
    state: {
      init: (_, state) => {
        return { offset: 0 };
      },
      apply: (tr, plState, oldState, newState) => {
        const { offset } = plState;
        const modifyOffset = tr.getMeta(MODIFY_OFFSET);
        if (!modifyOffset) {
          return plState;
        }
        return {
          offset: modifyOffset === INCREMENT_OFFSET ? offset + 1 : offset - 1,
        };
      },
    },
    appendTransaction: (trs, oldState, newState) => {
      const { offset } = pluginKey.getState(newState);
      const {
        selection: { $cursor: $oldCursor },
      } = oldState;
      const {
        selection: { $cursor },
      } = newState;
      if (!$cursor || !$oldCursor) {
        return;
      }
      const movement = $cursor.pos - $oldCursor.pos;
      if (
        // Haven't moved
        movement === 0 ||
        // Just moved into deco position
        $oldCursor.pos !== decoStartPos
      ) {
        return;
      }
      if (
        (movement > 0 && offset < noOfDecos) ||
        (movement < 0 && offset > 0)
      ) {
        const modifyOffset = movement > 0 ? INCREMENT_OFFSET : DECREMENT_OFFSET;
        const tr = newState.tr
          .setMeta(MODIFY_OFFSET, modifyOffset)
          .setSelection(Selection.near(oldState.selection.$cursor));
        return tr;
      }
      return;
    },
  });

const createStateFromContent = (content, decoClass, index) => {
  const plugin = createPlugin(decoClass, index);
  return EditorState.create({
    doc: DOMParser.fromSchema(schema).parse(content),
    plugins: [...exampleSetup({ schema, menuBar: false }), plugin],
  });
};

const getDebugId = (decoClass) => `debug-${decoClass}`;

const examples = [
  [
    "Example with decorations only, inline",
    "<p>An example document</p>",
    "test-deco-inline",
  ],
  [
    "Example with decorations only, inline-block",
    "<p>An example document</p>",
    "test-deco-inline-block",
  ],
  [
    "Example with decorations and mark, inline",
    "<p><test-mark>An ex</test-mark>ample document</p>",
    "test-deco-inline",
  ],
  [
    "Example with decorations and mark, inline-block",
    "<p><test-mark>An ex</test-mark>ample document</p>",
    "test-deco-inline-block",
  ],
];

const root = document.getElementById("root");

examples.forEach(([description, content, decoClass], index) => {
  const docRootEl = document.createElement("div");
  docRootEl.classList.add("doc-root");

  const descriptionEl = document.createElement("div");
  descriptionEl.innerText = description;
  descriptionEl.classList.add("description");

  const contentEl = document.createElement("div");
  contentEl.innerHTML = content;

  const debugEl = document.createElement("div");
  debugEl.id = getDebugId(index);
  debugEl.classList.add("debug")

  root.appendChild(descriptionEl);
  root.appendChild(docRootEl);
  root.appendChild(debugEl);

  const state = createStateFromContent(contentEl, decoClass, index);

  new EditorView(docRootEl, {
    state,
  });
});
