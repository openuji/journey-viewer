import test from "node:test";
import assert from "node:assert/strict";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Button,
  IconButton,
  Heading,
  Text,
  Badge,
  Surface,
  JourneyCard,
  JourneyHead,
  TouchpointDot,
  StateRow,
  StateSummary,
  JourneyContracts,
  JourneyContractControls,
  InspectorPanel,
} from "../dist/index.js";

test("contract controls compose native buttons with explicit disclosure, selection snapshots and callbacks", () => {
  const props = {
    entries: [{ id: "e", label: "Begin", default: true }], exits: [{ id: "x", label: "Complete" }],
    selection: { kind: "entry", id: "e" },
    onSelect: () => assert.fail("rendering does not invoke event callbacks"),
    onToggle: () => assert.fail("rendering does not invoke event callbacks"),
  };
  const html = renderToStaticMarkup(h(JourneyContractControls, { ...props, open: true }));
  assert.equal((html.match(/<button/g) ?? []).length, 3);
  assert.equal((html.match(/aria-pressed="true"/g) ?? []).length, 1);
  assert.match(html, /aria-expanded="true"/);
  assert.match(html, />1 entry · 1 exit</);
  assert.match(html, /Begin<span[^>]*>default<\/span>/);
  assert.match(html, /type="button"/);
  const closed = renderToStaticMarkup(h(JourneyContractControls, { ...props, open: false, exits: [] }));
  assert.equal((closed.match(/<button/g) ?? []).length, 1);
  assert.match(closed, /aria-expanded="false"/);
  assert.match(closed, />1 entry · no exits</);
  assert.doesNotMatch(closed, /Begin/);
});

test("inspector presentation uses shared semantics and safely renders readonly plain-text details", () => {
  const props = Object.freeze({
    title: "Inspect <state>", identity: "urn:s", crumb: "Root / Child", typeLabel: "State", level: 4,
    touchpoints: Object.freeze([Object.freeze({ id: "urn:web", label: "Web" })]),
    footnote: "Child · 1 entry · 0 exported exits",
    sections: Object.freeze([
      Object.freeze({ title: "Incoming", direction: "incoming", count: 0 }),
      Object.freeze({ title: "Outgoing", direction: "outgoing", count: 2, groups: Object.freeze([Object.freeze({
        id: "urn:next", label: "Next", exit: true,
        items: Object.freeze([
          Object.freeze({ id: "urn:t", label: "Continue", annotation: "enters at Login", tags: Object.freeze(["primary", "step-up"]) }),
          Object.freeze({ id: "urn:u", label: "Retry", tags: Object.freeze([]) }),
        ]),
      })]) }),
    ]),
  });
  const before = JSON.stringify(props);
  const html = renderToStaticMarkup(h(InspectorPanel, props));
  assert.match(html, /^<aside/);
  assert.match(html, /aria-label="Selection inspector"/);
  assert.match(html, /<h4/);
  assert.match(html, /<h5/);
  assert.match(html, /Inspect &lt;state&gt;/);
  assert.match(html, /Root \/ Child/);
  assert.match(html, /enters at Login/);
  assert.match(html, /primary · step-up/);
  assert.match(html, />exit</);
  assert.match(html, />None</);
  assert.match(html, /Child · 1 entry · 0 exported exits/);
  assert.doesNotMatch(html, /<button/);
  assert.equal(JSON.stringify(props), before);
  const interactive = renderToStaticMarkup(h(InspectorPanel, {
    ...props,
    sections: [{ title: "Outgoing", direction: "outgoing", groups: [{ ...props.sections[1].groups[0], onSelect: () => assert.fail("no render callbacks") }],
      details: [{ id: "urn:child", label: "Child", sub: "2 states", onSelect: () => assert.fail("no render callbacks") }] }],
  }));
  assert.equal((interactive.match(/<button/g) ?? []).length, 2);
});

test("state summaries render nested content and precise boundary explanations without interaction props", () => {
  const props = Object.freeze({ label: "Nested scope", entryCount: 1, directExitCount: 2 });
  const before = JSON.stringify(props);
  const html = renderToStaticMarkup(h(StateSummary, props, "Child journey"));
  assert.match(html, /Nested scope/);
  assert.match(html, /Child journey/);
  assert.match(html, />1 entry names this state<\/span>/);
  assert.match(html, />2 listed exits reached by a direct transition from this state<\/span>/);
  assert.doesNotMatch(html, /<button|aria-pressed|aria-expanded/);
  assert.equal(JSON.stringify(props), before);
  assert.doesNotMatch(renderToStaticMarkup(h(StateSummary, { label: "No boundaries" })), /←|→/);
});

test("journey contracts render readonly entries, exits and explicit defaults as noninteractive lists", () => {
  const props = Object.freeze({
    entries: Object.freeze([Object.freeze({ id: "entry:a", label: "Begin", default: true })]),
    exits: Object.freeze([Object.freeze({ id: "exit:a", label: "Complete" })]),
  });
  const before = JSON.stringify(props);
  const html = renderToStaticMarkup(h(JourneyContracts, props));
  assert.match(html, /^<dl/);
  assert.equal((html.match(/<dt>/g) ?? []).length, 2);
  assert.equal((html.match(/>Entries<|>Exits</g) ?? []).length, 2);
  assert.doesNotMatch(html, /aria-label=/);
  assert.match(html, /\(default\)/);
  assert.match(html, /Complete/);
  assert.doesNotMatch(html, /<button/);
  assert.equal(JSON.stringify(props), before);
  const empty = renderToStaticMarkup(h(JourneyContracts, { entries: [], exits: [] }));
  assert.match(empty, /No entries\./);
  assert.match(empty, /No exits\./);
});

test("button defaults safely inside forms and forwards native attributes", () => {
  const html = renderToStaticMarkup(
    h(
      Button,
      Object.freeze({ disabled: true, "aria-describedby": "hint" }),
      "Continue",
    ),
  );
  assert.match(html, /type="button"/);
  assert.match(html, /disabled=""/);
  assert.match(html, /aria-describedby="hint"/);
  assert.match(
    renderToStaticMarkup(h(Button, { type: "submit" }, "Submit")),
    /type="submit"/,
  );
});

test("icon-only buttons retain native button behavior and an accessible name", () => {
  const html = renderToStaticMarkup(
    h(IconButton, { label: "Expand child", icon: "+", "aria-expanded": false }),
  );
  assert.equal((html.match(/<button/g) ?? []).length, 1);
  assert.match(html, /aria-label="Expand child"/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /aria-hidden="true"/);
});

test("heading semantics are independent of visual size; text and surfaces retain native elements", () => {
  assert.match(
    renderToStaticMarkup(h(Heading, { level: 4, size: "lg" }, "Details")),
    /^<h4.*data-size="lg"/,
  );
  assert.match(
    renderToStaticMarkup(
      h(Text, { as: "code", variant: "code" }, "urn:example"),
    ),
    /^<code/,
  );
  assert.match(
    renderToStaticMarkup(h(Surface, { as: "aside" }, "Panel")),
    /^<aside/,
  );
  assert.doesNotMatch(
    renderToStaticMarkup(h(Badge, {}, "2 states")),
    /<button|role="button"/,
  );
});

test("state selection and disclosure are controlled independently and never nest buttons", () => {
  const props = Object.freeze({
    label: "Choose a method",
    composite: true,
    expanded: false,
    selected: true,
    onToggle: () => assert.fail("rendering does not invoke event callbacks"),
  });
  const before = JSON.stringify(props);
  const closed = renderToStaticMarkup(h(StateRow, props, "Nested content"));
  assert.match(closed, /aria-pressed="true"/);
  assert.match(closed, /aria-expanded="false"/);
  assert.doesNotMatch(closed, /Nested content/);
  assert.equal((closed.match(/<button/g) ?? []).length, 2);
  assert.doesNotMatch(closed, /<button[^>]*>(?:(?!<\/button>)[\s\S])*<button/);
  assert.match(
    renderToStaticMarkup(
      h(StateRow, { ...props, expanded: true }, "Nested content"),
    ),
    /Nested content/,
  );
  assert.equal(JSON.stringify(props), before);
});

test("a journey composition accepts caller content without graph data or viewer context", () => {
  const html = renderToStaticMarkup(
    h(
      JourneyCard,
      { title: "Account access", count: "4 states", level: 3 },
      h(StateRow, { label: "Start" }),
    ),
  );
  assert.match(html, /^<article/);
  assert.match(html, /<h3/);
  assert.match(html, /4 states/);
  assert.match(html, /Start/);
});

test("persistent row notices remain nested independently of disclosure", () => {
  const html = renderToStaticMarkup(h(StateRow, {
    label: "Empty composition", notice: "No child journeys.",
  }, "Collapsed child content"));
  assert.match(html, /<div class="[^"]*nested[^"]*">No child journeys\.<\/div><\/div>$/);
  assert.equal((html.match(/<button/g) ?? []).length, 1);
  assert.doesNotMatch(html, /aria-expanded|Collapsed child content/);
});

test("badge explanations are exposed as text and native span attributes reach the element", () => {
  const html = renderToStaticMarkup(
    h(
      Badge,
      {
        label: "3 entries",
        id: "entries",
        "aria-describedby": "entry-help",
        "data-testid": "entry-badge",
        title: "Custom tooltip",
      },
      "←3",
    ),
  );
  assert.match(html, /<span[^>]*id="entries"/);
  assert.match(html, /aria-describedby="entry-help"/);
  assert.match(html, /data-testid="entry-badge"/);
  assert.match(html, /title="Custom tooltip"/);
  assert.match(html, /<span aria-hidden="true">←3<\/span>/);
  assert.match(html, />3 entries<\/span>/);
  assert.doesNotMatch(
    renderToStaticMarkup(h(Badge, {}, "3 states")),
    /aria-hidden="true"/,
  );
});

test("a captioned touchpoint dot is decorative while a standalone dot remains named", () => {
  const head = renderToStaticMarkup(
    h(JourneyHead, { title: "Account", touchpoint: { label: "Web" } }),
  );
  assert.match(head, /aria-hidden="true"/);
  assert.doesNotMatch(head, /role="img"|aria-label="Web"|title="Web"/);
  assert.equal((head.match(/Web/g) ?? []).length, 1);
  const dot = renderToStaticMarkup(h(TouchpointDot, { label: "Web" }));
  assert.match(dot, /role="img"/);
  assert.match(dot, /aria-label="Web"/);
});

test("primitive class composition has no empty class segments and heading native attributes pass through", () => {
  for (const element of [
    h(Button, {}, "Continue"),
    h(IconButton, { label: "Add", icon: "+" }),
    h(
      Heading,
      { level: 2, id: "heading", "aria-describedby": "description" },
      "Title",
    ),
    h(Text, {}, "Label"),
    h(Badge, {}, "Count"),
    h(Surface, {}, "Content"),
    h(JourneyCard, { title: "Account" }),
    h(TouchpointDot, { label: "Web" }),
  ]) {
    for (const [, value] of renderToStaticMarkup(element).matchAll(
      /class="([^"]*)"/g,
    )) {
      assert.equal(value, value.trim());
      assert.doesNotMatch(value, /\s{2}/);
    }
  }
  const heading = renderToStaticMarkup(
    h(
      Heading,
      { level: 2, id: "heading", "aria-describedby": "description" },
      "Title",
    ),
  );
  assert.match(heading, /id="heading"/);
  assert.match(heading, /aria-describedby="description"/);
});

test("row tones and marks describe the active state's local transitions without boundary badges", () => {
  const html = renderToStaticMarkup(h(StateRow, {
    label: "Login", tone: "both", marks: { incoming: 1, outgoing: 2, title: "Routes" },
    crossing: { label: "Identity provider", color: "red" }, description: "Nested journey",
  }));
  assert.match(html, /data-tone="both"/);
  assert.match(html, /title="Routes"/);
  assert.match(html, /←1/);
  assert.match(html, /→2/);
  assert.match(html, /1 transition into the active state, 2 transitions from the active state/);
  assert.match(html, /aria-label="Crosses into Identity provider"/);
  assert.match(html, /Nested journey/);
  assert.doesNotMatch(renderToStaticMarkup(h(StateRow, { label: "Plain", marks: { incoming: 0, outgoing: 0 } })), /←|→/);
});

test("a composite without a toggle callback renders a decorative caret instead of a disclosure button", () => {
  const html = renderToStaticMarkup(h(StateRow, { label: "Lane child", composite: true, expanded: true }));
  assert.equal((html.match(/<button/g) ?? []).length, 1);
  assert.doesNotMatch(html, /aria-expanded/);
  assert.match(html, /data-open="true"/);
  assert.match(html, /aria-pressed="false"/);
});
