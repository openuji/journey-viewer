import type { Meta, StoryObj } from "@storybook/react-vite";
import { JourneyNavigation } from "./JourneyNavigation.js";
import { createViewerSnapshot, setSearchQuery, toggleTouchpoint } from "../../navigation.js";
import { navigationReviewDocument, oidcDocument, topologyDocument } from "../../../.storybook/documents.js";

const initial = createViewerSnapshot(oidcDocument);
const meta = {
  title: "Viewer/JourneyNavigation", component: JourneyNavigation, tags: ["autodocs"],
  args: { document: oidcDocument, snapshot: initial, onNavigate: () => {}, onSearchPick: () => {}, onQuery: () => {}, onTouchpoint: () => {}, onOverview: () => {}, onFocus: () => {} },
  parameters: { controls: { exclude: ["document", "snapshot"] } },
} satisfies Meta<typeof JourneyNavigation>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const SearchResults: Story = { args: { snapshot: setSearchQuery(initial, "SMS") } };
export const NoMatches: Story = { args: { snapshot: setSearchQuery(initial, "no such item") } };
export const SeveralTouchpoints: Story = {
  args: { document: topologyDocument, snapshot: toggleTouchpoint(topologyDocument,
    toggleTouchpoint(topologyDocument, createViewerSnapshot(topologyDocument), "urn:test:web"), "urn:test:phone") },
};
export const EqualLabelTouchpoints: Story = {
  args: { document: navigationReviewDocument, snapshot: createViewerSnapshot(navigationReviewDocument) },
};
export const LimitedResults: Story = {
  args: { document: navigationReviewDocument, snapshot: setSearchQuery(createViewerSnapshot(navigationReviewDocument), "urn:test:") },
};
