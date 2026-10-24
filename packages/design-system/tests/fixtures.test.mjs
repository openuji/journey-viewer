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
  "Icon",
  "JourneyNest",
  "ScreenThumbnail",
  "SegmentedControl",
  "ExplorerBar",
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
    await import("@/components/StateRow/StateRow.fixtures");
  const { checkStateRowFixture } =
    await import("@/components/StateRow/StateRow.checks");
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
  const { createSearchFieldFixture } =
    await import("@/components/SearchField/SearchField.fixtures");
  const { checkSearchFieldFixture } =
    await import("@/components/SearchField/SearchField.checks");
  const { createStateRowFixture } =
    await import("@/components/StateRow/StateRow.fixtures");
  const { checkStateRowFixture } =
    await import("@/components/StateRow/StateRow.checks");
  assert.deepEqual(
    checkSearchFieldFixture(freeze(createSearchFieldFixture({ value: "" }))),
    [],
  );
  assert.ok(
    checkSearchFieldFixture(freeze(createSearchFieldFixture({ value: null })))
      .length > 0,
  );
  assert.ok(
    checkSearchFieldFixture(
      freeze(createSearchFieldFixture({ placeholder: false })),
    ).length > 0,
  );
  for (const tone of ["active", "incoming", "outgoing", "both", "dim"])
    assert.deepEqual(
      checkStateRowFixture(freeze(createStateRowFixture({ tone }))),
      [],
    );
  assert.ok(
    checkStateRowFixture(freeze(createStateRowFixture({ tone: "other" })))
      .length > 0,
  );
  assert.deepEqual(
    checkStateRowFixture(
      freeze(
        createStateRowFixture({
          marks: { incoming: 1, outgoing: 0, title: "Routes" },
        }),
      ),
    ),
    [],
  );
  for (const marks of [
    { incoming: -1, outgoing: 0 },
    { incoming: 1 },
    { incoming: 0, outgoing: 0, title: "" },
  ]) {
    assert.ok(
      checkStateRowFixture(freeze(createStateRowFixture({ marks }))).length > 0,
    );
  }
  assert.ok(
    checkStateRowFixture(
      freeze(createStateRowFixture({ crossing: { label: "" } })),
    ).length > 0,
  );
});

test("contract fixture checks reject malformed items and conflicting defaults independently", async () => {
  const { createJourneyContractsFixture } =
    await import("@/components/JourneyContracts/JourneyContracts.fixtures");
  const { checkJourneyContractsFixture } =
    await import("@/components/JourneyContracts/JourneyContracts.checks");
  const invalid = freeze(
    createJourneyContractsFixture({
      entries: [
        { id: "e1", label: "First", default: true },
        { id: "e2", label: "Second", default: true },
      ],
    }),
  );
  assert.match(checkJourneyContractsFixture(invalid)[0].message, /At most one/);
  for (const item of [null, {}, { id: "e", label: "Begin", default: "yes" }]) {
    assert.ok(
      checkJourneyContractsFixture(freeze({ entries: [item], exits: [] }))
        .length > 0,
    );
  }
  assert.deepEqual(
    checkJourneyContractsFixture(freeze({ entries: [], exits: [] })),
    [],
  );
});

test("summary fixtures reject interaction and mode properties instead of ignoring them", async () => {
  const { createStateSummaryFixture } =
    await import("@/components/StateSummary/StateSummary.fixtures");
  const { checkStateSummaryFixture } =
    await import("@/components/StateSummary/StateSummary.checks");
  for (const key of [
    "static",
    "composite",
    "expanded",
    "selected",
    "filtered",
    "onSelect",
    "onToggle",
  ]) {
    const fixture = freeze({ ...createStateSummaryFixture(), [key]: true });
    assert.deepEqual(
      checkStateSummaryFixture(fixture).map((finding) => finding.path),
      [[key]],
    );
  }
});

test("inspection and contract-control fixtures independently reject malformed nested data and wrong selections", async () => {
  const { createJourneyContractControlsFixture } =
    await import("@/components/JourneyContractControls/JourneyContractControls.fixtures");
  const { checkJourneyContractControlsFixture } =
    await import("@/components/JourneyContractControls/JourneyContractControls.checks");
  for (const selection of [
    { kind: "entry", id: "missing" },
    { kind: "exit", id: "entry:start" },
    false,
    {},
  ]) {
    assert.ok(
      checkJourneyContractControlsFixture(
        freeze(createJourneyContractControlsFixture({ selection })),
      ).length > 0,
    );
  }
  const { createInspectorPanelFixture } =
    await import("@/components/InspectorPanel/InspectorPanel.fixtures");
  const { checkInspectorPanelFixture } =
    await import("@/components/InspectorPanel/InspectorPanel.checks");
  for (const sections of [
    null,
    [null],
    [{ title: "Section", groups: [null] }],
    [{ title: "Section", direction: "sideways" }],
    [
      {
        title: "Section",
        direction: "incoming",
        groups: [
          {
            id: "x",
            label: "X",
            exit: false,
            items: [{ id: "i", label: "I", tags: [null] }],
          },
        ],
      },
    ],
    [{ title: "Section", details: [{ id: "d", label: "D" }] }],
  ]) {
    assert.ok(
      checkInspectorPanelFixture(
        freeze(createInspectorPanelFixture({ sections })),
      ).length > 0,
    );
  }
});

test("screen image status requires a source and journey touchpoint lists are checked independently", async () => {
  const { createScreenImageFixture } =
    await import("@/components/ScreenImage/ScreenImage.fixtures");
  const { checkScreenImageFixture } =
    await import("@/components/ScreenImage/ScreenImage.checks");
  for (const status of ["loading", "ready"]) {
    const input = freeze(
      createScreenImageFixture({ source: undefined, status }),
    );
    assert.deepEqual(
      checkScreenImageFixture(input).map((finding) => finding.path),
      [["source"]],
    );
    assert.equal(input.source, undefined);
  }
  assert.deepEqual(
    checkScreenImageFixture(
      freeze(
        createScreenImageFixture({ source: undefined, status: "unavailable" }),
      ),
    ),
    [],
  );
  const { createJourneyHeadFixture } =
    await import("@/components/JourneyHead/JourneyHead.fixtures");
  const { checkJourneyHeadFixture } =
    await import("@/components/JourneyHead/JourneyHead.checks");
  assert.ok(
    checkJourneyHeadFixture(
      freeze(createJourneyHeadFixture({ matched: true, filtered: true })),
    ).length > 0,
  );
  const { createSegmentedControlFixture } =
    await import("@/components/SegmentedControl/SegmentedControl.fixtures");
  const { checkSegmentedControlFixture } =
    await import("@/components/SegmentedControl/SegmentedControl.checks");
  assert.ok(
    checkSegmentedControlFixture(
      freeze(createSegmentedControlFixture({ value: "missing" })),
    ).length > 0,
  );
  assert.deepEqual(
    checkJourneyHeadFixture(
      freeze(
        createJourneyHeadFixture({
          touchpoints: [{ id: "tp:1", label: "App" }],
        }),
      ),
    ),
    [],
  );
  for (const touchpoints of [
    false,
    [null],
    [{ id: "tp:1", label: "App", color: false }],
  ]) {
    assert.ok(
      checkJourneyHeadFixture(freeze(createJourneyHeadFixture({ touchpoints })))
        .length > 0,
    );
  }
});
