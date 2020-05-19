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
          tag: "example"
        }
      ],
      toDOM: mark => ["span", { class: "example-mark" }]
    }
  },
  nodes: {
    doc: {
      content: "block+"
    },

    paragraph: {
      group: "block",
      content: "inline*",
      parseDOM: [{ tag: "p" }],
      toDOM: () => ["p", 0]
    },

    image: {
      group: "block",
      draggable: true,
      parseDOM: [{ tag: "img" }],
      toDOM: () => ["img", { class: "Image" }]
    },

    text: {
      group: "inline"
    }
  }
});

const content = document.createElement("div");
content.innerHTML = `<p><example>An ex</example>ample document</p>`;

const toDom = (view, getPos) => {
  const el = document.createElement("span");
  el.classList.add("test-deco");
  return el;
};

const pluginKey = new PluginKey("side-test-plugin");

const noOfDecos = 3;
const decoStartPos = 6;
const MODIFY_OFFSET = "MODIFY_OFFSET";
const DECREMENT_OFFSET = "DECREMENT";
const INCREMENT_OFFSET = "INCREMENT";

const getSide = (cursorPos, offset, index) =>
  console.log({ cursorPos, offset, index }) ||
  (cursorPos === decoStartPos && offset > index)
    ? -1
    : 1;

const createPluginDecorations = state => {
  const decos = new Array(noOfDecos).fill(undefined).map((_, index) => {
    const { offset } = pluginKey.getState(state);
    const orderOffset = (index + 1) / noOfDecos / 2;
    const {
      selection: { from, to }
    } = state;
    const isRange = from !== to;
    const side = isRange ? orderOffset : getSide(from, offset, index);
    return Decoration.widget(decoStartPos, toDom, {
      key: index,
      side: side + orderOffset
    });
  });

  document.getElementById("debug").innerHTML = decos
    .map(_ => _.spec.side.toString().substring(0, 6))
    .join(", ");

  return DecorationSet.create(state.doc, decos);
};

const plugin = new Plugin({
  key: pluginKey,
  props: {
    decorations: state => createPluginDecorations(state)
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
        offset: modifyOffset === INCREMENT_OFFSET ? offset + 1 : offset - 1
      };
    }
  },
  appendTransaction: (trs, oldState, newState) => {
    const { offset } = pluginKey.getState(newState);
    const {
      selection: { $cursor: $oldCursor }
    } = oldState;
    const {
      selection: { $cursor }
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
    if ((movement > 0 && offset < noOfDecos) || (movement < 0 && offset > 0)) {
      const modifyOffset = movement > 0 ? INCREMENT_OFFSET : DECREMENT_OFFSET;
      console.log(modifyOffset);
      const tr = newState.tr
        .setMeta(MODIFY_OFFSET, modifyOffset)
        .setSelection(Selection.near(oldState.selection.$cursor));
      console.log("set selection", oldState.selection.$cursor);
      return tr;
    }
    return;
  }
});

const state = EditorState.create({
  doc: DOMParser.fromSchema(schema).parse(content),
  plugins: [...exampleSetup({ schema }), plugin]
});

const root = document.querySelector("#root");

const view = new EditorView(root, {
  state
});

global.view = view;
