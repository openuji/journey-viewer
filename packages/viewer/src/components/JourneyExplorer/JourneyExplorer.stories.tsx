import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { JourneyExplorer } from "@/components/JourneyExplorer/JourneyExplorer";
import {
  createViewerInteraction,
  selectNode,
  toggleChildJourneys,
  toggleContracts,
} from "@/interaction";
import { oidcGraph, topologyGraph } from "~/.storybook/documents";
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
    graph: oidcGraph,
    interaction: createViewerInteraction(oidcGraph),
    onSelect: () => {},
    onToggleChildren: () => {},
  },
  parameters: { controls: { exclude: ["graph", "interaction"] } },
} satisfies Meta<typeof JourneyExplorer>;
export default meta;
type Story = StoryObj<typeof meta>;
function ControlledExample() {
  const [interaction, setInteraction] = useState(() =>
    createViewerInteraction(oidcGraph),
  );
  return (
    <JourneyExplorer
      graph={oidcGraph}
      interaction={interaction}
      onSelect={(selection) =>
        setInteraction((current) => selectNode(oidcGraph, current, selection))
      }
      onToggleContracts={(journeyId) =>
        setInteraction((current) =>
          toggleContracts(oidcGraph, current, journeyId),
        )
      }
      onToggleChildren={(journeyId, stateId) =>
        setInteraction((current) =>
          toggleChildJourneys(oidcGraph, current, journeyId, stateId),
        )
      }
    />
  );
}
export const Controlled: Story = { render: () => <ControlledExample /> };
const target = searchViewer(topologyGraph, "urn:test:shared")[1]!;
const columns = setViewMode(
  topologyGraph,
  navigateViewer(topologyGraph, createViewerSnapshot(topologyGraph), target),
  "columns",
);
export const ColumnsAtSecondReference: Story = {
  args: {
    graph: topologyGraph,
    interaction: columns.interaction,
    navigation: columns.navigation,
  },
};
const filtered = selectTouchpoint(
  oidcGraph,
  createViewerSnapshot(oidcGraph),
  "urn:ujg:solid-oidc:sms-channel",
);
export const TouchpointFilter: Story = {
  args: { interaction: filtered.interaction, navigation: filtered.navigation },
};
