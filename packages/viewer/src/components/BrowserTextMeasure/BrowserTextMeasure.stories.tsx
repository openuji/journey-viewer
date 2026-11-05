import type { Meta, StoryObj } from "@storybook/react-vite";
import { Text } from "@journey-viewer/design-system";
import { BrowserTextMeasure } from "@/components/BrowserTextMeasure/BrowserTextMeasure";
import { estimate } from "@/flow/text";
import type { TextRole } from "@/flow/text";

const samples: readonly (readonly [TextRole, string])[] = [
  ["body", "Recorder ready; saved recordings available"],
  ["title", "Authenticate with identity provider"],
  ["caption", "Start at account selection"],
];

/**
 * Text measured with the fonts the page renders: under each sample, a rule as long as the measured
 * width should end where the text ends. The layout's estimate is listed for comparison.
 */
const meta = {
  title: "Viewer/BrowserTextMeasure",
  parameters: { layout: "padded" },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const MeasuredWithThePageFonts: Story = {
  render: () => (
    <BrowserTextMeasure>
      {(measure) =>
        measure && (
          <dl style={{ display: "grid", gap: "var(--jv-space-lg)", margin: 0 }}>
            {samples.map(([role, text]) => (
              <div
                key={role}
                style={{ display: "grid", gap: "var(--jv-space-xs)" }}
              >
                <dt>
                  <Text
                    variant={
                      role === "body"
                        ? "body"
                        : role === "title"
                          ? "label"
                          : "caption"
                    }
                    {...(role === "title"
                      ? { weight: "semibold" as const }
                      : {})}
                  >
                    {text}
                  </Text>
                </dt>
                <dd
                  style={{
                    display: "grid",
                    gap: "var(--jv-space-2xs)",
                    margin: 0,
                  }}
                >
                  <span
                    style={{
                      inlineSize: measure(text, role),
                      borderBlockStart:
                        "var(--jv-border-focus) solid var(--jv-color-accent)",
                    }}
                  />
                  <Text variant="caption" tone="subtle">
                    {role}: measured {measure(text, role)}px, estimated{" "}
                    {estimate(text, role)}px
                  </Text>
                </dd>
              </div>
            ))}
          </dl>
        )
      }
    </BrowserTextMeasure>
  ),
};
