import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { JourneyExplorer } from "@/components/JourneyExplorer/JourneyExplorer";
import {
  createViewerInteraction,
  selectNode,
  toggleChildJourneys,
  toggleContracts,
} from "@/interaction";
import { oidcDocument, topologyDocument } from "~/.storybook/documents";
import {
  createViewerSnapshot,
  navigateViewer,
  searchViewer,
  selectTouchpoint,
  setViewMode,
} from "@/navigation";

const meta = {
  title: "Viewer/JourneyExplorer",
  component: JourneyExplorer,
  args: {
    document: oidcDocument,
    interaction: createViewerInteraction(oidcDocument),
    onSelect: () => {},
    onToggleChildren: () => {},
  },
  parameters: { controls: { exclude: ["document", "interaction"] } },
} satisfies Meta<typeof JourneyExplorer>;
export default meta;
type Story = StoryObj<typeof meta>;
function ControlledExample() {
  const [interaction, setInteraction] = useState(() =>
    createViewerInteraction(oidcDocument),
  );
  return (
    <JourneyExplorer
      document={oidcDocument}
      interaction={interaction}
      onSelect={(selection) =>
        setInteraction((current) =>
          selectNode(oidcDocument, current, selection),
        )
      }
      onToggleContracts={(journeyRef) =>
        setInteraction((current) =>
          toggleContracts(oidcDocument, current, journeyRef),
        )
      }
      onToggleChildren={(journeyRef, stateRef) =>
        setInteraction((current) =>
          toggleChildJourneys(oidcDocument, current, journeyRef, stateRef),
        )
      }
    />
  );
}
export const Controlled: Story = { render: () => <ControlledExample /> };
const target = searchViewer(topologyDocument, "urn:test:shared")[1]!;
const columns = setViewMode(
  topologyDocument,
  navigateViewer(
    topologyDocument,
    createViewerSnapshot(topologyDocument),
    target,
  ),
  "columns",
);
export const ColumnsAtSecondReference: Story = {
  args: {
    document: topologyDocument,
    interaction: columns.interaction,
    navigation: columns.navigation,
  },
};
const filtered = selectTouchpoint(
  oidcDocument,
  createViewerSnapshot(oidcDocument),
  "urn:ujg:solid-oidc:sms-channel",
);
export const TouchpointFilter: Story = {
  args: { interaction: filtered.interaction, navigation: filtered.navigation },
};
