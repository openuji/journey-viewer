import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { JourneyExplorer } from "./JourneyExplorer.js";
import { createViewerInteraction, selectNode, toggleChildJourneys } from "../../interaction.js";
import { oidcDocument, topologyDocument } from "../../../.storybook/documents.js";
import { createViewerSnapshot, focusJourney, navigateViewer, searchViewer } from "../../navigation.js";

const meta = {
  title: "Viewer/JourneyExplorer",
  component: JourneyExplorer,
  args: {
    document: oidcDocument, interaction: createViewerInteraction(oidcDocument),
    onSelect: () => {}, onToggleChildren: () => {},
  },
  parameters: { controls: { exclude: ["document", "interaction"] } },
} satisfies Meta<typeof JourneyExplorer>;
export default meta;
type Story = StoryObj<typeof meta>;
function ControlledExample() {
  const [interaction, setInteraction] = useState(() => createViewerInteraction(oidcDocument));
  return <JourneyExplorer document={oidcDocument} interaction={interaction}
    onSelect={(selection) => setInteraction((current) => selectNode(oidcDocument, current, selection))}
    onToggleChildren={(journeyRef, stateRef) => setInteraction((current) => toggleChildJourneys(oidcDocument, current, journeyRef, stateRef))} />;
}
export const Controlled: Story = { render: () => <ControlledExample /> };
const target = searchViewer(topologyDocument, "urn:test:shared")[1]!;
const focused = focusJourney(topologyDocument, navigateViewer(topologyDocument, createViewerSnapshot(topologyDocument), target), target.occurrence);
export const FocusedOccurrence: Story = {
  args: { document: topologyDocument, interaction: focused.interaction, navigation: focused.navigation, onFocusJourney: () => {} },
};
