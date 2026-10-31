import type { Meta, StoryObj } from "@storybook/react-vite";
import { JourneyNavigation } from "@/components/JourneyNavigation/JourneyNavigation";
import {
  createViewerSnapshot,
  selectTouchpoint,
  setSearchQuery,
  setViewMode,
} from "@/navigation";
import {
  navigationReviewGraph,
  oidcGraph,
  topologyGraph,
} from "~/.storybook/documents";

const initial = createViewerSnapshot(oidcGraph);
const meta = {
  title: "Viewer/JourneyNavigation",
  component: JourneyNavigation,
  tags: ["autodocs"],
  args: {
    graph: oidcGraph,
    snapshot: initial,
    onMode: () => {},
    onExpandAll: () => {},
    onCollapseAll: () => {},
    onTouchpoint: () => {},
    onQuery: () => {},
    onSearchPick: () => {},
    onReset: () => {},
  },
  parameters: { controls: { exclude: ["graph", "snapshot"] } },
  decorators: [
    (Story) => (
      <div style={{ minBlockSize: "24rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof JourneyNavigation>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Columns: Story = {
  args: { snapshot: setViewMode(oidcGraph, initial, "columns") },
};
export const SearchResults: Story = {
  args: { snapshot: setSearchQuery(initial, "SMS") },
};
export const NoMatches: Story = {
  args: { snapshot: setSearchQuery(initial, "no such item") },
};
export const SelectedTouchpoint: Story = {
  args: {
    graph: topologyGraph,
    snapshot: selectTouchpoint(
      topologyGraph,
      createViewerSnapshot(topologyGraph),
      "urn:test:web",
    ),
  },
};
export const EqualLabelTouchpoints: Story = {
  args: {
    graph: navigationReviewGraph,
    snapshot: createViewerSnapshot(navigationReviewGraph),
  },
};
export const LimitedResults: Story = {
  args: {
    graph: navigationReviewGraph,
    snapshot: setSearchQuery(
      createViewerSnapshot(navigationReviewGraph),
      "urn:test:",
    ),
  },
};
