import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Badge,
  Button,
  Heading,
  JourneyCard,
  StateRow,
  Surface,
  Text,
} from "../src/index.js";
import { createJourneyCardFixture } from "../src/components/JourneyCard/JourneyCard.fixtures.ts";
import { createStateRowFixture } from "../src/components/StateRow/StateRow.fixtures.ts";
import { tokenEntries } from "../scripts/tokens.mjs";
import light from "../tokens/themes/light.tokens.json";

const meta = {
  title: "Foundations/System",
  parameters: { layout: "fullscreen" },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function Example() {
  const [snapshot, setSnapshot] = useState<
    Readonly<{ expanded: boolean; selected: boolean }>
  >({ expanded: true, selected: false });
  return (
    <JourneyCard {...createJourneyCardFixture()}>
      <StateRow
        {...createStateRowFixture({
          expanded: snapshot.expanded,
          selected: snapshot.selected,
        })}
        onSelect={() =>
          setSnapshot((previous) => ({
            ...previous,
            selected: !previous.selected,
          }))
        }
        onToggle={() =>
          setSnapshot((previous) => ({
            ...previous,
            expanded: !previous.expanded,
          }))
        }
      >
        <Text variant="caption">Caller-supplied nested content</Text>
      </StateRow>
    </JourneyCard>
  );
}

export const Composition: Story = { render: () => <Example /> };
export const TokenUtilities: Story = {
  render: () => (
    <div className="story-stack">
      <Heading level={2} size="sm">
        Shared token consumers
      </Heading>
      <Button variant="solid">Continue</Button>
      <div
        data-testid="utility-probe"
        className="p-space-sm bg-accent text-on-accent font-sans text-caption"
      >
        Generated utility example
      </div>
    </div>
  ),
};
export const Themes: Story = {
  render: () => (
    <div className="grid grid-cols-1 gap-space-lg md:grid-cols-2 lg:grid-cols-3">
      {(["light", "dark", "alternate"] as const).map((theme) => (
        <section
          key={theme}
          data-jv-theme={theme}
          className="story-scope story-stack"
        >
          <Heading level={2} size="md">
            {theme}
          </Heading>
          <Example />
          <div className="story-inline">
            <Button variant="solid">Continue</Button>
            <Badge tone="entry">Entry</Badge>
            <Badge tone="exit">Exit</Badge>
          </div>
        </section>
      ))}
    </div>
  ),
};
export const NestedThemes: Story = {
  render: () => (
    <Surface className="story-panel story-stack">
      <Heading level={2}>Outer theme</Heading>
      <Example />
      <section data-jv-theme="dark" className="story-scope story-stack">
        <Heading level={3}>Dark boundary</Heading>
        <Example />
        <section data-jv-theme="light" className="story-scope">
          <Heading level={4}>Nested light boundary</Heading>
          <Example />
        </section>
      </section>
    </Surface>
  ),
};
export const Tokens: Story = {
  render: () => (
    <div className="story-stack">
      <Heading level={1}>Design tokens</Heading>
      <Text as="p">
        DTCG → scoped variables → Tailwind utilities and CSS modules → shared
        primitives.
      </Text>
      {tokenEntries(light).map((entry) => (
        <Surface key={entry.path.join(".")} className="story-panel">
          <Text as="code" variant="code">
            {entry.path.join(".")}
          </Text>
          {entry.path[0] === "color" && (
            <span
              aria-hidden="true"
              style={{
                display: "inline-block",
                marginInlineStart: "var(--jv-space-sm)",
                inlineSize: "var(--jv-size-control-md)",
                blockSize: "var(--jv-size-icon)",
                background: `var(--jv-${entry.path.join("-")})`,
              }}
            />
          )}
        </Surface>
      ))}
    </div>
  ),
};
export const BuiltConsumer: Story = {
  render: () => (
    <iframe
      title="Compiled components without Tailwind processing"
      src="/consumer/"
      style={{ border: 0, width: "100%", height: "90vh" }}
    />
  ),
};
