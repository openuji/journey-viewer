import assert from "node:assert/strict";
import test from "node:test";
import { lint } from "@journey-viewer/lint";

test("uses exactly the injected rules, including an empty list", () => {
  const value = Object.freeze({ count: -1 });
  const finding = Object.freeze({
    ruleId: "custom/positive",
    path: Object.freeze(["count"]),
    message: "Expected a positive count.",
  });
  const positive = (input) => (input.count > 0 ? [] : [finding]);
  assert.deepEqual(lint(value, []), []);
  assert.deepEqual(lint(value, [positive]), [finding]);
  assert.deepEqual(lint(value, [() => []]), []);
  assert.strictEqual(lint(value, [positive])[0], finding);
});

test("passes the original value to each rule and preserves supplied rule/finding order", () => {
  const value = Object.freeze({ nested: Object.freeze({ count: 1 }) });
  const first = Object.freeze({
    ruleId: "first",
    path: Object.freeze([]),
    message: "First finding",
  });
  const second = Object.freeze({
    ruleId: "first",
    path: Object.freeze(["nested"]),
    message: "Second finding",
  });
  const third = Object.freeze({
    ruleId: "second",
    path: Object.freeze(["nested", "count"]),
    message: "Third finding",
  });
  const rules = Object.freeze([
    (input) => {
      assert.strictEqual(input, value);
      return Object.freeze([first, second]);
    },
    (input) => {
      assert.strictEqual(input, value);
      return Object.freeze([third]);
    },
  ]);
  assert.deepEqual(lint(value, rules), [first, second, third]);
  assert.deepEqual(lint(value, rules), [first, second, third]);
  assert.deepEqual(value, { nested: { count: 1 } });
});

test("accepts non-UJG values and does not parse strings or choose reporting policy", () => {
  const rule = (value) =>
    value.length > 3
      ? [{ ruleId: "length", path: [], message: "Too long" }]
      : [];
  assert.deepEqual(lint("not JSON", [rule]), [
    { ruleId: "length", path: [], message: "Too long" },
  ]);
  assert.deepEqual(lint("ok", [rule]), []);
  assert.deepEqual(
    lint(1, [
      (value) =>
        value === 1
          ? []
          : [{ ruleId: "number", path: [], message: "Different" }],
    ]),
    [],
  );
});

test("propagates rule implementation errors instead of turning them into data findings", () => {
  const error = new Error("Rule implementation failed");
  assert.throws(
    () =>
      lint(null, [
        () => {
          throw error;
        },
      ]),
    (caught) => caught === error,
  );
});
