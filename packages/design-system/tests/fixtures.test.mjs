import test from "node:test";
import assert from "node:assert/strict";

const freeze = (value) => {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};

for (const name of [
  "Button",
  "ScreenImage",
  "ScreenPreview",
  "ScreenLightbox",
  "SearchField",
  "IconButton",
  "Heading",
  "Text",
  "Badge",
  "Surface",
  "TouchpointDot",
  "JourneyHead",
  "JourneyCard",
  "StateRow",
  "JourneyContractControls",
  "InspectorPanel",
  "StateSummary",
  "JourneyContracts",
]) {
  const { [`create${name}Fixture`]: generate } = await import(
    `../src/components/${name}/${name}.fixtures.ts`
  );
  const { [`check${name}Fixture`]: check } = await import(
    `../src/components/${name}/${name}.checks.ts`
  );
  test(`${name}: deterministic generation and separate checking preserve frozen input`, () => {
    const fixture = freeze(generate());
    const before = JSON.stringify(fixture);
    assert.deepEqual(generate(fixture), generate(fixture));
    assert.deepEqual(check(fixture), []);
    assert.equal(JSON.stringify(fixture), before);
    for (const malformed of [null, [], false, "text", {}])
      assert.ok(check(freeze(malformed)).length > 0);
    const [key] = Object.keys(fixture);
    const broken = freeze(generate(freeze({ [key]: null })));
    assert.equal(
      broken[key],
      null,
      "generation does not repair or check overrides",
    );
    assert.ok(
      check(broken).length > 0,
      "checking is an explicitly separate operation",
    );
    assert.equal(JSON.stringify(fixture), before);
  });
}

test("state-row fixture checking rejects expansion without a composite without repairing generated data", async () => {
  const { createStateRowFixture } =
    await import("../src/components/StateRow/StateRow.fixtures.ts");
  const { checkStateRowFixture } =
    await import("../src/components/StateRow/StateRow.checks.ts");
  const invalid = freeze(
    createStateRowFixture({ expanded: true, composite: false }),
  );
  const before = JSON.stringify(invalid);
  assert.equal(invalid.expanded, true);
  assert.deepEqual(checkStateRowFixture(invalid), [
    { path: ["expanded"], message: "Expanded rows must be composite." },
  ]);
  assert.deepEqual(
    checkStateRowFixture(
      freeze(createStateRowFixture({ expanded: true, composite: true })),
    ),
    [],
  );
  assert.equal(JSON.stringify(invalid), before);
});

test("search and row-relation fixtures distinguish valid empty text from malformed presentation", async () => {
  const { createSearchFieldFixture } = await import("../src/components/SearchField/SearchField.fixtures.ts");
  const { checkSearchFieldFixture } = await import("../src/components/SearchField/SearchField.checks.ts");
  const { createStateRowFixture } = await import("../src/components/StateRow/StateRow.fixtures.ts");
  const { checkStateRowFixture } = await import("../src/components/StateRow/StateRow.checks.ts");
  assert.deepEqual(checkSearchFieldFixture(freeze(createSearchFieldFixture({ value: "" }))), []);
  assert.ok(checkSearchFieldFixture(freeze(createSearchFieldFixture({ value: null }))).length > 0);
  assert.ok(checkSearchFieldFixture(freeze(createSearchFieldFixture({ placeholder: false }))).length > 0);
  for (const relation of ["incoming", "outgoing", "both"]) assert.deepEqual(checkStateRowFixture(freeze(createStateRowFixture({ relation }))), []);
  assert.ok(checkStateRowFixture(freeze(createStateRowFixture({ relation: "other" }))).length > 0);
});

test("contract fixture checks reject malformed items and conflicting defaults independently", async () => {
  const { createJourneyContractsFixture } = await import("../src/components/JourneyContracts/JourneyContracts.fixtures.ts");
  const { checkJourneyContractsFixture } = await import("../src/components/JourneyContracts/JourneyContracts.checks.ts");
  const invalid = freeze(createJourneyContractsFixture({
    entries: [{ id: "e1", label: "First", default: true }, { id: "e2", label: "Second", default: true }],
  }));
  assert.match(checkJourneyContractsFixture(invalid)[0].message, /At most one/);
  for (const item of [null, {}, { id: "e", label: "Begin", default: "yes" }]) {
    assert.ok(checkJourneyContractsFixture(freeze({ entries: [item], exits: [] })).length > 0);
  }
  assert.deepEqual(checkJourneyContractsFixture(freeze({ entries: [], exits: [] })), []);
});

test("summary fixtures reject interaction and mode properties instead of ignoring them", async () => {
  const { createStateSummaryFixture } = await import("../src/components/StateSummary/StateSummary.fixtures.ts");
  const { checkStateSummaryFixture } = await import("../src/components/StateSummary/StateSummary.checks.ts");
  for (const key of ["static", "composite", "expanded", "selected", "filtered", "onSelect", "onToggle"]) {
    const fixture = freeze({ ...createStateSummaryFixture(), [key]: true });
    assert.deepEqual(checkStateSummaryFixture(fixture).map((finding) => finding.path), [[key]]);
  }
});

test("inspection and contract-control fixtures independently reject malformed nested data and wrong selections", async () => {
  const { createJourneyContractControlsFixture } = await import("../src/components/JourneyContractControls/JourneyContractControls.fixtures.ts");
  const { checkJourneyContractControlsFixture } = await import("../src/components/JourneyContractControls/JourneyContractControls.checks.ts");
  for (const selection of [{ kind: "entry", id: "missing" }, { kind: "exit", id: "entry:start" }, false, {}]) {
    assert.ok(checkJourneyContractControlsFixture(freeze(createJourneyContractControlsFixture({ selection }))).length > 0);
  }
  const { createInspectorPanelFixture } = await import("../src/components/InspectorPanel/InspectorPanel.fixtures.ts");
  const { checkInspectorPanelFixture } = await import("../src/components/InspectorPanel/InspectorPanel.checks.ts");
  for (const sections of [null, [null], [{ title: "Section", items: [null] }], [{ title: "Section", items: [{ id: "x", label: "X", details: [null] }] }]]) {
    assert.ok(checkInspectorPanelFixture(freeze(createInspectorPanelFixture({ sections }))).length > 0);
  }
});

test("screen image status requires a source and journey touchpoint lists are checked independently", async () => {
  const { createScreenImageFixture } = await import("../src/components/ScreenImage/ScreenImage.fixtures.ts");
  const { checkScreenImageFixture } = await import("../src/components/ScreenImage/ScreenImage.checks.ts");
  for (const status of ["loading", "ready"]) {
    const input = freeze(createScreenImageFixture({ source: undefined, status }));
    assert.deepEqual(checkScreenImageFixture(input).map((finding) => finding.path), [["source"]]);
    assert.equal(input.source, undefined);
  }
  assert.deepEqual(checkScreenImageFixture(freeze(createScreenImageFixture({ source: undefined, status: "unavailable" }))), []);
  const { createJourneyHeadFixture } = await import("../src/components/JourneyHead/JourneyHead.fixtures.ts");
  const { checkJourneyHeadFixture } = await import("../src/components/JourneyHead/JourneyHead.checks.ts");
  assert.deepEqual(checkJourneyHeadFixture(freeze(createJourneyHeadFixture({ touchpoints: [{ id: "tp:1", label: "App" }] }))), []);
  for (const touchpoints of [false, [null], [{ id: "tp:1", label: "App", color: false }]]) {
    assert.ok(checkJourneyHeadFixture(freeze(createJourneyHeadFixture({ touchpoints }))).length > 0);
  }
});
