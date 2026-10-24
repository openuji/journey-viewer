import type { Meta, StoryObj } from "@storybook/react-vite";
import { JourneyNavigation } from "@/components/JourneyNavigation/JourneyNavigation";
import {
  createViewerSnapshot,
  selectTouchpoint,
  setSearchQuery,
  setViewMode,
} from "@/navigation";
import {
  navigationReviewDocument,
  oidcDocument,
  topologyDocument,
} from "~/.storybook/documents";

const initial = createViewerSnapshot(oidcDocument);
const meta = {
  title: "Viewer/JourneyNavigation",
  component: JourneyNavigation,
  tags: ["autodocs"],
  args: {
    document: oidcDocument,
    snapshot: initial,
    onMode: () => {},
    onExpandAll: () => {},
    onCollapseAll: () => {},
    onTouchpoint: () => {},
    onQuery: () => {},
    onSearchPick: () => {},
    onReset: () => {},
  },
  parameters: { controls: { exclude: ["document", "snapshot"] } },
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
  args: { snapshot: setViewMode(oidcDocument, initial, "columns") },
};
export const SearchResults: Story = {
  args: { snapshot: setSearchQuery(initial, "SMS") },
};
export const NoMatches: Story = {
  args: { snapshot: setSearchQuery(initial, "no such item") },
};
export const SelectedTouchpoint: Story = {
  args: {
    document: topologyDocument,
    snapshot: selectTouchpoint(
      topologyDocument,
      createViewerSnapshot(topologyDocument),
      "urn:test:web",
    ),
  },
};
export const EqualLabelTouchpoints: Story = {
  args: {
    document: navigationReviewDocument,
    snapshot: createViewerSnapshot(navigationReviewDocument),
  },
};
export const LimitedResults: Story = {
  args: {
    document: navigationReviewDocument,
    snapshot: setSearchQuery(
      createViewerSnapshot(navigationReviewDocument),
      "urn:test:",
    ),
  },
};
