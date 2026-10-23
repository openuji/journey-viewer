import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import test from "node:test";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  JourneyExplorer, JourneyNavigation, JourneyScreens, JourneyLightbox,
  createViewerSnapshot, getNodeScreens, getScreens, openScreenshot, closeScreenshot, stepScreenshot,
  collapseAllJourneys, navigateViewer, searchViewer, hoverNode, setSearchQuery, setViewMode, countMappedScreens,
} from "../dist/index.js";

const freeze = (value) => {
  if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
const readJson = async (path) => freeze(JSON.parse(await readFile(new URL(path, import.meta.url), "utf8")));
const oidc = await readJson("../../../examples/solid-oidc/solid-oidc.ujg.jsonld");
const screenshots = await readJson("../../../examples/solid-oidc/screenshots.json");
const touchpoints = await readJson("../../../examples/solid-oidc/touchpoints.json");
const baseline = await readJson("../../../examples/solid-oidc/baseline.json");
const document = await readJson("fixtures/screens.ujg.jsonld");
const mapped = freeze({ "opaque:7": "./custom/alpha.png", "opaque:9": "./custom/beta.png", "opaque:11": "./custom/gamma.png", "opaque:15": "./custom/shared.png", "opaque:unresolved": "./custom/ignored.png" });
const fail = () => assert.fail("render must not invoke callbacks");

test("the independent map resolves all 37 explicit OIDC surfaces and copied assets match captured checksums", async () => {
  const before = JSON.stringify({ oidc, screenshots });
  const screens = getScreens(oidc, screenshots);
  assert.equal(Object.keys(screenshots).length, 37);
  assert.equal(screens.length, 37);
  assert.equal(screens[0].target.selection.nodeRef, baseline.initialStateRef);
  assert.equal(screens.at(-1).target.selection.nodeRef, "urn:ujg:solid-oidc:pod-support");
  assert.deepEqual(screens.map((screen) => screen.surface["@id"]), baseline.screens.map((screen) => screen.surfaceRef));
  for (const screen of screens) {
    assert.equal(screen.surface, oidc.nodes.find((node) => node["@id"] === screen.surface["@id"]));
    const bytes = await readFile(new URL(`../../../examples/solid-oidc/${screen.source}`, import.meta.url));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), baseline.screens.find((item) => item.surfaceRef === screen.surface["@id"]).sha256);
  }
  assert.equal(JSON.stringify({ oidc, screenshots }), before);
});

test("screen queries preserve every explicit surface and call-site context without guessing paths or taking inherited map keys", () => {
  assert.deepEqual(getNodeScreens(document, mapped, "urn:leaf").map((screen) => [screen.surface["@id"], screen.source]), [
    ["opaque:7", "./custom/alpha.png"], ["opaque:9", "./custom/beta.png"], ["toString", undefined],
  ]);
  const shared = getScreens(document, mapped).filter((screen) => screen.surface["@id"] === "opaque:15");
  assert.equal(shared.length, 3);
  assert.deepEqual(shared.map((screen) => screen.target.occurrence), [
    { startJourneyRef: "urn:p", steps: [{ stateIndex: 0, childIndex: 0 }] },
    { startJourneyRef: "urn:p", steps: [{ stateIndex: 0, childIndex: 1 }] },
    { startJourneyRef: "urn:q", steps: [{ stateIndex: 0, childIndex: 0 }] },
  ]);
  assert.equal(getScreens(document, mapped).some((screen) => screen.surface["@id"] === "opaque:unresolved"), false);
  assert.equal(getNodeScreens(document, freeze({ "opaque:7": " " }), "urn:leaf")[0].source, undefined);
});

test("opening a screenshot reveals its ancestry without expanding a selected composite's children", () => {
  const initial = freeze(createViewerSnapshot(document));
  const collapsed = freeze({ ...initial, interaction: collapseAllJourneys(initial.interaction) });
  const screen = getScreens(document, mapped).find((item) => item.surface["@id"] === "opaque:11");
  const before = JSON.stringify({ document, mapped, collapsed });
  const open = freeze(openScreenshot(document, mapped, collapsed, freeze(screen.target), "opaque:11"));
  assert.equal(open.interaction.selection.nodeRef, "urn:composite");
  assert.equal(open.interaction.expandedJourneys.includes("urn:child"), false);
  assert.deepEqual(open.lightbox, { surfaceRef: "opaque:11", target: screen.target });
  assert.equal(openScreenshot(document, mapped, open, screen.target, "opaque:11"), open);
  assert.equal(JSON.stringify({ document, mapped, collapsed }), before);
  for (const [target, ref, map] of [
    [screen.target, "opaque:7", mapped], [screen.target, "missing", mapped], [screen.target, "opaque:11", {}],
    [{ ...screen.target, occurrence: { startJourneyRef: "missing", steps: [] } }, "opaque:11", mapped],
  ]) assert.equal(openScreenshot(document, freeze(map), collapsed, freeze(target), ref), collapsed);
});

test("lightbox navigation wraps over 37 screens, updates selection, and closes without resetting navigation", () => {
  const initial = freeze(setSearchQuery(createViewerSnapshot(oidc), "kept query"));
  const screen = getScreens(oidc, screenshots)[0];
  const open = freeze(openScreenshot(oidc, screenshots, initial, screen.target, screen.surface["@id"]));
  assert.equal(open.navigation.query, "kept query");
  const last = freeze(stepScreenshot(oidc, screenshots, open, -1));
  assert.equal(last.interaction.selection.nodeRef, "urn:ujg:solid-oidc:pod-support");
  assert.deepEqual(stepScreenshot(oidc, screenshots, last, 1), open);
  let current = open;
  const visited = [];
  for (let count = 0; count < 37; count += 1) {
    visited.push(current.lightbox.surfaceRef);
    current = freeze(stepScreenshot(oidc, screenshots, current, 1));
  }
  assert.equal(new Set(visited).size, 37);
  assert.deepEqual(current, open);
  const closed = freeze(closeScreenshot(current));
  assert.equal(closed.lightbox, null);
  assert.equal(closed.interaction, current.interaction);
  assert.equal(closed.navigation, current.navigation);
  assert.equal(closeScreenshot(closed), closed);
  assert.equal(stepScreenshot(oidc, screenshots, closed, 1), closed);
});

test("live map replacement changes only derived URLs; removed mappings stay unavailable and stepping skips them", () => {
  const initial = freeze(createViewerSnapshot(document));
  const first = getScreens(document, mapped)[0];
  const open = freeze(openScreenshot(document, mapped, initial, first.target, first.surface["@id"]));
  const before = JSON.stringify(open);
  const changed = freeze({ ...mapped, [first.surface["@id"]]: "./new/source.png?revision=2" });
  assert.equal(getScreens(document, changed)[0].source, "./new/source.png?revision=2");
  const removed = freeze(Object.fromEntries(Object.entries(mapped).filter(([ref]) => ref !== first.surface["@id"])));
  assert.equal(getScreens(document, removed)[0].source, undefined);
  assert.equal(stepScreenshot(document, freeze({}), open, 1), open);
  assert.notEqual(stepScreenshot(document, removed, open, 1).lightbox.surfaceRef, first.surface["@id"]);
  assert.equal(JSON.stringify(open), before);
  assert.doesNotMatch(before, /\.png|source/);
  const html = renderToStaticMarkup(h(JourneyLightbox, { document, screenshots: removed, lightbox: open.lightbox, onClose: fail, onPrevious: fail, onNext: fail }));
  assert.match(html, /Screenshot unavailable/);
  assert.doesNotMatch(html, /<img/);
});

test("screen open/step preserves explicit repeated contexts and ordinary navigation closes the lightbox", () => {
  const entries = getScreens(document, mapped).filter((screen) => screen.surface["@id"] === "opaque:15");
  const initial = freeze(createViewerSnapshot(document));
  const open = freeze(openScreenshot(document, mapped, initial, entries[1].target, "opaque:15"));
  assert.deepEqual(open.lightbox.target.occurrence, entries[1].target.occurrence);
  assert.deepEqual(stepScreenshot(document, mapped, open, 1).lightbox.target.occurrence, entries[2].target.occurrence);
  assert.equal(navigateViewer(document, open, entries[1].target).lightbox, null);
  const hovered = freeze(hoverNode(document, initial, entries[0].target.selection, entries[0].target.occurrence));
  assert.notEqual(hoverNode(document, hovered, entries[1].target.selection, entries[1].target.occurrence), hovered);
  assert.equal(hoverNode(document, hovered, entries[0].target.selection, entries[0].target.occurrence), hovered);
});

test("reused screen positions distinguish every call site and count mapped views", () => {
  const entries = getScreens(document, mapped).filter((screen) => screen.surface["@id"] === "opaque:15");
  const initial = freeze(createViewerSnapshot(document));
  const render = (snapshot, map = mapped) => renderToStaticMarkup(h(JourneyLightbox, {
    document, screenshots: map, lightbox: snapshot.lightbox, onClose: fail, onPrevious: fail, onNext: fail,
  }));
  for (const [index, entry] of entries.entries()) {
    const open = freeze(openScreenshot(document, mapped, initial, entry.target, "opaque:15"));
    const before = JSON.stringify({ document, mapped, open });
    assert.match(render(open), new RegExp(`${index + 4} / 6 views · ${index + 1} of 3 call sites`));
    assert.equal(JSON.stringify({ document, mapped, open }), before);
  }
  const open = freeze(openScreenshot(document, mapped, initial, entries[1].target, "opaque:15"));
  const singleImage = freeze({ "opaque:15": mapped["opaque:15"] });
  assert.match(render(open, singleImage), /2 \/ 3 views · 2 of 3 call sites/);
  const removed = freeze({ "opaque:7": mapped["opaque:7"] });
  assert.match(render(open, removed), /Screenshot unavailable · 1 mapped screen/);
  assert.doesNotMatch(render(open, removed), /call sites/);
});

test("configured screenshots and presentation use readonly inputs without invoking callbacks or copying into UJG", () => {
  const initial = freeze(createViewerSnapshot(oidc));
  const before = JSON.stringify({ oidc, screenshots, touchpoints, initial });
  const explorer = renderToStaticMarkup(h(JourneyExplorer, { document: oidc, interaction: initial.interaction,
    navigation: initial.navigation, touchpoints, media: { screenshots, onOpen: fail }, onSelect: fail, onToggleChildren: fail }));
  assert.equal((explorer.match(/aria-label="Screen mockup: /g) ?? []).length, 37);
  assert.match(explorer, /var\(--jv-color-category-orange\)/);
  assert.match(explorer, /role="img" aria-label="App"/);
  assert.equal(countMappedScreens(oidc, screenshots), 37);
  const searching = freeze(setSearchQuery(initial, "SMS"));
  const navigation = renderToStaticMarkup(h(JourneyNavigation, { document: oidc, snapshot: searching, screenshots,
    onMode: fail, onExpandAll: fail, onCollapseAll: fail, onSearchPick: fail, onQuery: fail, onTouchpoint: fail, onReset: fail }));
  assert.match(navigation, /title="Screenshot available"/);
  assert.match(navigation, /47 states · 120 transitions · 37 screens/);
  const screen = getScreens(oidc, screenshots)[0];
  const preview = renderToStaticMarkup(h(JourneyScreens, { document: oidc, screenshots, target: screen.target, onOpen: fail }));
  assert.match(preview, /app-sign-in-required\.png/);
  assert.match(preview, /aria-label="Enlarge screenshot: Sign-in required"/);
  const unmapped = renderToStaticMarkup(h(JourneyScreens, { document: oidc, screenshots: freeze({}), target: screen.target, onOpen: fail }));
  assert.match(unmapped, /Screenshot unavailable/);
  assert.doesNotMatch(unmapped, /<button/);
  assert.equal(JSON.stringify({ oidc, screenshots, touchpoints, initial }), before);
});

test("opening a screen in columns follows its call path without opening a composite's children", () => {
  const columns = freeze(setViewMode(document, createViewerSnapshot(document), "columns"));
  const composite = getScreens(document, mapped).find((item) => item.surface["@id"] === "opaque:11");
  assert.equal(composite.target.selection.nodeRef, "urn:composite");
  const open = freeze(openScreenshot(document, mapped, columns, composite.target, "opaque:11"));
  assert.deepEqual(open.navigation.lanes, [composite.target.occurrence]);
  const selected = freeze(navigateViewer(document, columns, composite.target));
  assert.ok(selected.navigation.lanes.length > 1, "ordinary composite selection opens its child columns");
});
