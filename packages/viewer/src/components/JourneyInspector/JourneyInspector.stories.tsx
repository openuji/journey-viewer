import type { Meta, StoryObj } from "@storybook/react-vite";
import { JourneyInspector } from "@/components/JourneyInspector/JourneyInspector";
import { oidcGraph } from "~/.storybook/documents";
import { searchViewer } from "@/navigation";

const meta = {
  title: "Viewer/JourneyInspector",
  component: JourneyInspector,
  args: {
    graph: oidcGraph,
    selection: {
      kind: "state",
      journeyId: "urn:ujg:solid-oidc:app-auth-journey",
      nodeId: "urn:ujg:solid-oidc:idp-auth-flow",
    },
  },
  parameters: { controls: { exclude: ["graph", "selection"] } },
} satisfies Meta<typeof JourneyInspector>;
export default meta;
type Story = StoryObj<typeof meta>;
export const State: Story = {};
export const Entry: Story = {
  args: {
    selection: {
      kind: "entry",
      journeyId: "urn:ujg:solid-oidc:idp-auth-journey",
      nodeId: "urn:ujg:solid-oidc:idp-login-entry",
    },
  },
};
export const Exit: Story = {
  args: {
    selection: {
      kind: "exit",
      journeyId: "urn:ujg:solid-oidc:idp-auth-journey",
      nodeId: "urn:ujg:solid-oidc:idp-auth-failed",
    },
  },
};
export const Journey: Story = {
  args: {
    selection: {
      kind: "journey",
      journeyId: "urn:ujg:solid-oidc:app-auth-journey",
      nodeId: "urn:ujg:solid-oidc:app-auth-journey",
    },
  },
};
export const Empty: Story = { args: { selection: null } };
const login = searchViewer(
  oidcGraph,
  "urn:ujg:solid-oidc:idp-login-entry",
).find((item) => item.selection.kind === "entry")!;
export const EntryWithCallSite: Story = {
  args: {
    selection: login.selection,
    navigation: { occurrence: login.occurrence, onNavigate: () => {} },
  },
};
const failed = searchViewer(
  oidcGraph,
  "urn:ujg:solid-oidc:idp-auth-failed",
).find((item) => item.selection.kind === "exit")!;
export const ExitWithParentHandling: Story = {
  args: {
    selection: failed.selection,
    navigation: { occurrence: failed.occurrence, onNavigate: () => {} },
  },
};
