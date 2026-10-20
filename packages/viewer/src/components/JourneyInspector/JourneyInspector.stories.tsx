import type { Meta, StoryObj } from "@storybook/react-vite";
import { JourneyInspector } from "./JourneyInspector.js";
import { oidcDocument } from "../../../.storybook/documents.js";

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
