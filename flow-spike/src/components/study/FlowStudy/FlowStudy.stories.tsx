import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import {
  collapseAllJourneys,
  toggleChildJourneys,
} from "@journey-viewer/viewer";
import type { ViewerSnapshot } from "@journey-viewer/viewer";
import type { UjgDocument } from "@journey-viewer/ujg-jsonld";
import {
  emptyCompositesFixture,
  hierarchyFixture,
  minimalFixture,
  oidcDocument,
  oidcScreenshots,
  oidcTouchpoints,
  screensFixture,
} from "@/data/documents";
import { specDetail, stakeholderDetail } from "@/model/presentation";
import { FlowStudy } from "@/components/study/FlowStudy/FlowStudy";

const collapsed = (
  _: UjgDocument,
  snapshot: ViewerSnapshot,
): ViewerSnapshot => ({
  ...snapshot,
  interaction: collapseAllJourneys(snapshot.interaction),
});
const appWithIdp = (
  document: UjgDocument,
  snapshot: ViewerSnapshot,
): ViewerSnapshot => ({
  ...snapshot,
  interaction: toggleChildJourneys(
    document,
    collapseAllJourneys(snapshot.interaction),
    "urn:ujg:solid-oidc:app-auth-journey",
    "urn:ujg:solid-oidc:idp-auth-flow",
  ),
});

const meta = {
  title: "Study/FlowStudy",
  component: FlowStudy,
  args: {
    document: oidcDocument,
    screenshots: oidcScreenshots,
    touchpoints: oidcTouchpoints,
    detail: stakeholderDetail,
    placement: "median",
  },
} satisfies Meta<typeof FlowStudy>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Stakeholder detail, every composite closed: the App journey at a glance. */
export const Collapsed: Story = { args: { prepare: collapsed } };
/** One composite open: the IdP frame grows from its card; returns and exits route through ports. */
export const AppWithIdpOpen: Story = { args: { prepare: appWithIdp } };
const MFA =
  "urn:ujg:solid-oidc:app-auth-journey 1.0|6:urn:ujg:solid-oidc:idp-mfa-challenge";
const SMS =
  "urn:ujg:solid-oidc:app-auth-journey 1.0 6.0|3:urn:ujg:solid-oidc:mfa-sms-message";
const PUSH =
  "urn:ujg:solid-oidc:app-auth-journey 1.0 6.0|7:urn:ujg:solid-oidc:mfa-push-approval";
const APP = "urn:ujg:solid-oidc:app-auth-journey";
const IDP =
  "urn:ujg:solid-oidc:app-auth-journey|1:urn:ujg:solid-oidc:idp-auth-flow";
const LOGIN =
  "urn:ujg:solid-oidc:app-auth-journey 1.0|1:urn:ujg:solid-oidc:idp-login";
/**
 * A click marks where you are; the journey path and the paper frame follow. A closed composite's
 * card, not its chevron, opens it: MFA challenge, then SMS message inside it, then Push approval,
 * which takes the path over from SMS message. A plain state marks its journey: Login ends the path
 * at Authenticate with identity provider.
 */
export const OpenedByCardClick: Story = {
  args: { prepare: appWithIdp },
  play: async ({ canvasElement, step }) => {
    const path = () =>
      within(
        within(canvasElement).getByRole("navigation", { name: "Journey path" }),
      )
        .getAllByRole("listitem")
        .map((item) => item.textContent);
    const frame = (key: string) =>
      canvasElement.querySelector(`[data-flow-key="frame:${key}"]`);
    const open = async (key: string, title: string) => {
      await userEvent.click(
        canvasElement.querySelector(
          `[data-flow-key="card:${key}"] button:not([aria-expanded])`,
        )!,
      );
      await waitFor(() => expect(path().at(-1)).toBe(title));
      await expect(frame(key)).toHaveAttribute("data-context", "current");
    };
    const above = [
      "App auth journey",
      "Authenticate with identity provider",
      "MFA challenge",
    ];
    await step("MFA challenge's card", () => open(MFA, "MFA challenge"));
    await step("SMS message's card", () => open(SMS, "SMS message"));
    await step("Push approval's card", async () => {
      await open(PUSH, "Push approval");
      await expect(path()).toEqual([...above, "Push approval"]);
      await expect(frame(SMS)).toHaveAttribute("data-context", "outside");
    });
    await step("Login, a plain state", async () => {
      const select = canvasElement.querySelector(
        `[data-flow-key="state:${LOGIN}"] button`,
      )!;
      await userEvent.click(select);
      await waitFor(() => expect(path()).toEqual(above.slice(0, 2)));
      await expect(select).toHaveAttribute("aria-current", "true");
      await expect(frame(IDP)).toHaveAttribute("data-context", "current");
      await expect(frame(APP)).toHaveAttribute("data-context", "outside");
    });
  },
};
/** The tree's default (everything open) at spec detail: the stress case. */
export const EverythingOpenSpec: Story = { args: { detail: specDetail } };
/** The same snapshot in the public Tree; switch to Flow to keep selection and expansion. */
export const SharedWithTree: Story = {
  args: { view: "tree", prepare: appWithIdp },
};

/** UJG scope: recursion stops with a marker; reused child journeys open at each occurrence. */
export const ScopeRecursionAndReuse: Story = {
  args: {
    document: hierarchyFixture,
    screenshots: {},
    touchpoints: {},
    detail: specDetail,
  },
};
/** UJG scope: several child journeys of one composite open as sibling frames, never joined. */
export const ScopeSiblingChildJourneys: Story = {
  args: {
    document: screensFixture,
    screenshots: {},
    touchpoints: {},
    detail: specDetail,
  },
};
/** UJG scope: composites without children have no toggle. */
export const ScopeChildlessComposites: Story = {
  args: {
    document: emptyCompositesFixture,
    screenshots: {},
    touchpoints: {},
    detail: specDetail,
  },
};
/** UJG scope: outgoing navigation is a marker on its state, never an edge. */
export const ScopeOutgoingNavigation: Story = {
  args: {
    document: minimalFixture,
    screenshots: {},
    touchpoints: {},
    detail: specDetail,
  },
};
