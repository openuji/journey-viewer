import type { Meta, StoryObj } from "@storybook/react-vite";
import { Connector } from "@/components/primitives/Connector/Connector";
import type { ConnectorProps } from "@/components/primitives/Connector/Connector";

const meta = {
  title: "Primitives/Connector",
  component: Connector,
  args: { points: [], kind: "bundle", arrowStart: false, arrowEnd: true },
} satisfies Meta<typeof Connector>;
export default meta;
type Story = StoryObj<typeof meta>;

const cases: readonly (Partial<ConnectorProps> & { caption: string })[] = [
  { caption: "One transition" },
  { caption: "Six transitions, one line (spec ×6)", count: 6 },
  { caption: "Both directions", arrowStart: true },
  { caption: "Entry state (association)", kind: "association" },
  { caption: "Via default entry (spec)", viaDefault: true },
  { caption: "Leads into selection", tone: "incoming" },
  { caption: "Reached from selection", tone: "outgoing" },
];

/** Point 1: never two lines between one pair of blocks; multiplicity is a count, not more lines. */
export const Gallery: Story = {
  render: () => (
    <div
      className="flow-story-pad"
      style={
        {
          "--flow-connector":
            "color-mix(in srgb, var(--jv-color-subtle) 80%, var(--jv-color-surface))",
        } as React.CSSProperties
      }
    >
      {cases.map(({ caption, ...props }) => (
        <figure key={caption} style={{ margin: 0 }}>
          <figcaption className="flow-story-caption">{caption}</figcaption>
          <svg
            width="180"
            height="110"
            style={{
              overflow: "visible",
              background: "var(--jv-color-surface)",
              borderRadius: 7,
            }}
          >
            <Connector
              points={[
                { x: 40, y: 12 },
                { x: 40, y: 50 },
                { x: 140, y: 50 },
                { x: 140, y: 98 },
              ]}
              kind="bundle"
              arrowStart={false}
              arrowEnd
              {...props}
            />
          </svg>
        </figure>
      ))}
    </div>
  ),
};
