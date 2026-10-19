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
  "IconButton",
  "Heading",
  "Text",
  "Badge",
  "Surface",
  "TouchpointDot",
  "JourneyHead",
  "JourneyCard",
  "StateRow",
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
