import type { Meta, StoryObj } from "@storybook/react-vite";
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
  },
} satisfies Meta<typeof FlowStudy>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Stakeholder detail, every composite closed: the App journey at a glance. */
export const Collapsed: Story = { args: { prepare: collapsed } };
/** One composite open: the IdP frame grows from its card; returns and exits route through ports. */
export const AppWithIdpOpen: Story = { args: { prepare: appWithIdp } };
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
