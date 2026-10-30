import assert from "node:assert/strict";
import test from "node:test";
import {
  collapseAllJourneys,
  columnsView,
  createViewerSnapshot,
  createViewerState,
  flowView,
  navigateViewer,
  pickSearchResult,
  reduceViewer,
  searchViewer,
  setSearchQuery,
  setViewMode,
  toggleChildJourneys,
  treeView,
} from "@journey-viewer/viewer";
import { id, oidcDocument } from "~/tests/flow-scopes.mjs";

const freeze = (value) => {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
const document = oidcDocument;
const views = freeze([treeView, columnsView, flowView()]);
const inputs = freeze({ document, screenshots: {}, views });
const reduce = (state, ...commands) =>
  commands.reduce(
    (current, command) =>
      reduceViewer(inputs, freeze(current), freeze(command)),
    state,
  );
const start = freeze(createViewerState(inputs));
/** The identity provider's login state at its call site in the app journey. */
const login = freeze(
  searchViewer(document, "Login", []).find(
    (result) => result.selection.nodeRef === id("idp-login"),
  ),
);

test("the initial state is the viewer snapshot in the first view, or the named view and interaction", () => {
  assert.deepEqual(start.disclosure.snapshot, createViewerSnapshot(document));
  assert.equal(start.view, "tree");
  assert.equal(start.disclosure.location, null);
  const prepared = createViewerState({
    ...inputs,
    initialView: "columns",
    initialInteraction: (doc, interaction) =>
      toggleChildJourneys(
        doc,
        collapseAllJourneys(interaction),
        id("app-auth-journey"),
        id("idp-auth-flow"),
      ),
  });
  assert.equal(prepared.view, "columns");
  assert.equal(prepared.disclosure.snapshot.navigation.mode, "columns");
  assert.deepEqual(prepared.disclosure.snapshot.interaction.expandedJourneys, [
    id("idp-auth-journey"),
  ]);
  assert.equal(
    createViewerState({ ...inputs, initialView: "unknown" }).view,
    "tree",
  );
});

test("navigation matches the snapshot transitions; only inspector navigation and picks reveal", () => {
  const clicked = reduce(start, { type: "navigate", target: login });
  assert.deepEqual(
    clicked.disclosure.snapshot,
    navigateViewer(document, start.disclosure.snapshot, login),
  );
  assert.equal(clicked.disclosure.location, login);
  assert.equal(clicked.reveal, null);
  const followed = reduce(start, {
    type: "navigate",
    target: login,
    reveal: true,
  });
  assert.equal(followed.reveal.target, login);
  assert.equal(followed.reveal.kind, "state");
  assert.equal(followed.reveal.seq, 1);
  const again = reduce(followed, {
    type: "navigate",
    target: login,
    reveal: true,
  });
  assert.equal(again.reveal, followed.reveal, "no change, no new reveal");

  const searched = reduce(start, { type: "query", query: "login" });
  assert.equal(searched.searchOpen, true);
  const picked = reduce(searched, { type: "pick", target: login });
  assert.deepEqual(
    picked.disclosure.snapshot,
    pickSearchResult(document, searched.disclosure.snapshot, login),
  );
  assert.equal(picked.disclosure.snapshot.navigation.query, "");
  assert.equal(picked.searchOpen, false);
  assert.equal(picked.reveal.target, login);
});

test("views share selection and expansion; entering a view applies its own transition", () => {
  const selected = reduce(start, { type: "navigate", target: login });
  const flow = reduce(selected, { type: "view", id: "flow" });
  assert.equal(flow.view, "flow");
  assert.equal(flow.disclosure, selected.disclosure, "Flow has no enter");
  const toggled = reduce(flow, { type: "collapseAll" });
  const columns = reduce(toggled, { type: "view", id: "columns" });
  assert.equal(columns.view, "columns");
  assert.deepEqual(
    columns.disclosure.snapshot,
    setViewMode(document, toggled.disclosure.snapshot, "columns"),
  );
  assert.equal(
    columns.disclosure.snapshot.interaction,
    toggled.disclosure.snapshot.interaction,
  );
  assert.equal(columns.disclosure.location, login);
  const tree = reduce(columns, { type: "view", id: "tree" });
  assert.equal(tree.disclosure.snapshot.navigation.mode, "tree");
  assert.equal(reduce(tree, { type: "view", id: "tree" }), tree);
  assert.equal(reduce(tree, { type: "view", id: "missing" }), tree);
});

test("search, filter, contracts, screens and the preview change only their part", () => {
  const typed = reduce(start, { type: "query", query: "login" });
  assert.deepEqual(
    typed.disclosure.snapshot,
    setSearchQuery(start.disclosure.snapshot, "login"),
  );
  assert.equal(reduce(typed, { type: "query", query: "login" }), typed);
  assert.equal(reduce(typed, { type: "searchFocus" }), typed);
  const dismissed = reduce(typed, { type: "searchDismiss" });
  assert.equal(dismissed.searchOpen, false);
  assert.equal(reduce(dismissed, { type: "searchDismiss" }), dismissed);
  assert.equal(reduce(dismissed, { type: "searchFocus" }).searchOpen, true);

  const filtered = reduce(start, { type: "touchpoint", id: id("idp") });
  assert.deepEqual(filtered.disclosure.snapshot.navigation.touchpointRefs, [
    id("idp"),
  ]);
  const contracts = reduce(start, {
    type: "toggleContracts",
    journeyId: id("app-auth-journey"),
  });
  assert.deepEqual(contracts.disclosure.snapshot.interaction.openContracts, [
    id("app-auth-journey"),
  ]);

  const anchor = { left: 1, top: 2, right: 3, bottom: 4 };
  const previewed = reduce(start, {
    type: "preview",
    target: login,
    surfaceId: id("surface"),
    anchor,
  });
  assert.deepEqual(previewed.preview, {
    target: login,
    surfaceId: id("surface"),
    anchor,
    visible: true,
  });
  const hidden = reduce(previewed, { type: "hidePreview" });
  assert.equal(hidden.preview.visible, false);
  assert.equal(reduce(hidden, { type: "hidePreview" }), hidden);
  assert.equal(reduce(start, { type: "closeScreen" }), start);
});

test("reset returns to the initial view, expansion and selection and scrolls to the top", () => {
  const changed = reduce(
    start,
    { type: "navigate", target: login, reveal: true },
    { type: "view", id: "columns" },
    { type: "query", query: "login" },
    { type: "collapseAll" },
  );
  const reset = reduce(changed, { type: "reset" });
  assert.deepEqual(reset.disclosure, start.disclosure);
  assert.equal(reset.view, "tree");
  assert.equal(reset.searchOpen, false);
  assert.equal(reset.preview, null);
  assert.deepEqual(reset.reveal, {
    seq: 2,
    kind: "top",
    occurrence: "",
    ref: "",
    target: null,
  });
});

test("unchanged results keep the state's identity", () => {
  const collapsed = reduce(start, { type: "collapseAll" });
  assert.equal(reduce(collapsed, { type: "collapseAll" }), collapsed);
  const all = reduce(start, { type: "expandAll" });
  assert.equal(reduce(all, { type: "expandAll" }), all);
  assert.equal(reduce(start, { type: "touchpoint", id: null }), start);
  assert.equal(reduce(start, { type: "searchDismiss" }), start);
});
