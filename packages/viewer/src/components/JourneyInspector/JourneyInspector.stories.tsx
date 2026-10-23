import type { Meta, StoryObj } from "@storybook/react-vite";
import { JourneyInspector } from "./JourneyInspector.js";
import { oidcDocument } from "../../../.storybook/documents.js";
import { searchViewer } from "../../navigation.js";

const meta = {
  title: "Viewer/JourneyInspector",
  component: JourneyInspector,
  args: { document: oidcDocument, selection: { kind: "state", journeyRef: "urn:ujg:solid-oidc:app-auth-journey", nodeRef: "urn:ujg:solid-oidc:idp-auth-flow" } },
  parameters: { controls: { exclude: ["document", "selection"] } },
} satisfies Meta<typeof JourneyInspector>;
export default meta;
type Story = StoryObj<typeof meta>;
export const State: Story = {};
export const Entry: Story = { args: { selection: { kind: "entry", journeyRef: "urn:ujg:solid-oidc:idp-auth-journey", nodeRef: "urn:ujg:solid-oidc:idp-login-entry" } } };
export const Exit: Story = { args: { selection: { kind: "exit", journeyRef: "urn:ujg:solid-oidc:idp-auth-journey", nodeRef: "urn:ujg:solid-oidc:idp-auth-failed" } } };
export const Journey: Story = { args: { selection: { kind: "journey", journeyRef: "urn:ujg:solid-oidc:app-auth-journey", nodeRef: "urn:ujg:solid-oidc:app-auth-journey" } } };
export const Empty: Story = { args: { selection: null } };
const login = searchViewer(oidcDocument, "urn:ujg:solid-oidc:idp-login-entry").find((item) => item.selection.kind === "entry")!;
export const EntryWithCallSite: Story = {
  args: { selection: login.selection, navigation: { occurrence: login.occurrence, onNavigate: () => {} } },
};
const failed = searchViewer(oidcDocument, "urn:ujg:solid-oidc:idp-auth-failed").find((item) => item.selection.kind === "exit")!;
export const ExitWithParentHandling: Story = {
  args: { selection: failed.selection, navigation: { occurrence: failed.occurrence, onNavigate: () => {} } },
};
