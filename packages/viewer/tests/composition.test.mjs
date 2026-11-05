import assert from "node:assert/strict";
import test from "node:test";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ExpandCollapse,
  TreeLayout,
  Viewer,
  ViewerMain,
  WhenTreeLayout,
  WhenView,
  treeView,
} from "@journey-viewer/viewer";
import { oidcGraph } from "~/tests/flow-scopes.mjs";

test("the tree descriptor renders content without inserting controls or a canvas header", () => {
  const html = renderToStaticMarkup(
    h(Viewer, { graph: oidcGraph, views: [treeView] }, h(ViewerMain)),
  );
  assert.match(html, /data-journey-ref=/);
  assert.doesNotMatch(
    html,
    /data-canvas-header|aria-label="Tree layout"|Expand all/,
  );
});

test("layout conditions compose independently of view ids and control placement", () => {
  const view = { ...treeView, id: "custom-hierarchy" };
  for (const mode of ["tree", "columns"]) {
    const html = renderToStaticMarkup(
      h(
        Viewer,
        {
          graph: oidcGraph,
          views: [view],
          initialCommands: [{ type: "treeLayout", mode }],
        },
        h(
          WhenView,
          { id: view.id },
          h(TreeLayout),
          h(WhenTreeLayout, { mode: "tree" }, h("span", null, "Rows only")),
          h(
            WhenTreeLayout,
            { mode: "columns" },
            h("span", null, "Columns only"),
          ),
          // Deliberately unconditional: this control never hides itself in Columns.
          h(ExpandCollapse),
        ),
      ),
    );
    assert.match(html, /aria-label="Tree layout"/);
    assert.match(html, /Expand all/);
    assert.match(html, mode === "tree" ? /Rows only/ : /Columns only/);
    assert.doesNotMatch(html, mode === "tree" ? /Columns only/ : /Rows only/);
  }
});
