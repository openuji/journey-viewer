import type {
  ButtonProps,
  BadgeProps,
  HeadingProps,
  JourneyHeadProps,
  StateRowProps,
} from "../src/index.js";
import { createStateRowFixture } from "../src/components/StateRow/StateRow.fixtures.ts";

const button: ButtonProps = { children: "Select", selected: false };
// @ts-expect-error Component props are immutable snapshots.
button.selected = true;
const heading: HeadingProps = { level: 2, size: "sm" };
// @ts-expect-error Heading semantic level is explicit and readonly.
heading.level = 3;
const head: JourneyHeadProps = {
  title: "Account",
  touchpoint: { label: "Web" },
};
// @ts-expect-error Nested presentation values are readonly.
head.touchpoint!.label = "Mobile";
const row: StateRowProps = { label: "Start", expanded: false };
// @ts-expect-error Rendering does not own expansion state.
row.expanded = true;
const fixture = createStateRowFixture();
// @ts-expect-error Fixture generation returns immutable data.
fixture.label = "Changed";

const badge: BadgeProps = {
  children: "3",
  id: "count",
  "aria-describedby": "help",
};
// @ts-expect-error Forwarded native attributes remain readonly.
badge.id = "changed";
