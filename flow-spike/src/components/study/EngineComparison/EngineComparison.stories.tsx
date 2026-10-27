import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  collapseAllJourneys,
  createViewerInteraction,
  toggleChildJourneys,
} from "@journey-viewer/viewer";
import { oidcDocument, oidcTouchpoints } from "@/data/documents";
import { EngineComparison } from "@/components/study/EngineComparison/EngineComparison";

const open = createViewerInteraction(oidcDocument);
const appWithIdp = toggleChildJourneys(
  oidcDocument,
  collapseAllJourneys(open),
  "urn:ujg:solid-oidc:app-auth-journey",
  "urn:ujg:solid-oidc:idp-auth-flow",
);

const meta = {
  title: "Study/EngineComparison",
  component: EngineComparison,
  args: {
    document: oidcDocument,
    touchpoints: oidcTouchpoints,
    interaction: appWithIdp,
  },
} satisfies Meta<typeof EngineComparison>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Point 3: own engine and ELK on identical input, App with IdP open. */
export const AppWithIdpOpen: Story = {};
/** Point 3: the full disclosure. */
export const EverythingOpen: Story = { args: { interaction: open } };
