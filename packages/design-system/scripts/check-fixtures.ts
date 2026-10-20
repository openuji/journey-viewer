import { createScreenImageFixture } from "../src/components/ScreenImage/ScreenImage.fixtures.ts";
import { checkScreenImageFixture } from "../src/components/ScreenImage/ScreenImage.checks.ts";
import { createScreenPreviewFixture } from "../src/components/ScreenPreview/ScreenPreview.fixtures.ts";
import { checkScreenPreviewFixture } from "../src/components/ScreenPreview/ScreenPreview.checks.ts";
import { createScreenLightboxFixture } from "../src/components/ScreenLightbox/ScreenLightbox.fixtures.ts";
import { checkScreenLightboxFixture } from "../src/components/ScreenLightbox/ScreenLightbox.checks.ts";
import { createButtonFixture } from "../src/components/Button/Button.fixtures.ts";
import { createSearchFieldFixture } from "../src/components/SearchField/SearchField.fixtures.ts";
import { checkSearchFieldFixture } from "../src/components/SearchField/SearchField.checks.ts";
import { createJourneyContractControlsFixture } from "../src/components/JourneyContractControls/JourneyContractControls.fixtures.ts";
import { checkJourneyContractControlsFixture } from "../src/components/JourneyContractControls/JourneyContractControls.checks.ts";
import { createInspectorPanelFixture } from "../src/components/InspectorPanel/InspectorPanel.fixtures.ts";
import { checkInspectorPanelFixture } from "../src/components/InspectorPanel/InspectorPanel.checks.ts";
import { createJourneyContractsFixture } from "../src/components/JourneyContracts/JourneyContracts.fixtures.ts";
import { checkJourneyContractsFixture } from "../src/components/JourneyContracts/JourneyContracts.checks.ts";
import { createStateSummaryFixture } from "../src/components/StateSummary/StateSummary.fixtures.ts";
import { checkStateSummaryFixture } from "../src/components/StateSummary/StateSummary.checks.ts";
import { checkButtonFixture } from "../src/components/Button/Button.checks.ts";
import { createJourneyCardFixture } from "../src/components/JourneyCard/JourneyCard.fixtures.ts";
import { checkJourneyCardFixture } from "../src/components/JourneyCard/JourneyCard.checks.ts";
import { createSurfaceFixture } from "../src/components/Surface/Surface.fixtures.ts";
import { checkSurfaceFixture } from "../src/components/Surface/Surface.checks.ts";
import { createJourneyHeadFixture } from "../src/components/JourneyHead/JourneyHead.fixtures.ts";
import { checkJourneyHeadFixture } from "../src/components/JourneyHead/JourneyHead.checks.ts";
import { createStateRowFixture } from "../src/components/StateRow/StateRow.fixtures.ts";
import { checkStateRowFixture } from "../src/components/StateRow/StateRow.checks.ts";
import { createIconButtonFixture } from "../src/components/IconButton/IconButton.fixtures.ts";
import { checkIconButtonFixture } from "../src/components/IconButton/IconButton.checks.ts";
import { createTextFixture } from "../src/components/Text/Text.fixtures.ts";
import { checkTextFixture } from "../src/components/Text/Text.checks.ts";
import { createBadgeFixture } from "../src/components/Badge/Badge.fixtures.ts";
import { checkBadgeFixture } from "../src/components/Badge/Badge.checks.ts";
import { createHeadingFixture } from "../src/components/Heading/Heading.fixtures.ts";
import { checkHeadingFixture } from "../src/components/Heading/Heading.checks.ts";
import { createTouchpointDotFixture } from "../src/components/TouchpointDot/TouchpointDot.fixtures.ts";
import { checkTouchpointDotFixture } from "../src/components/TouchpointDot/TouchpointDot.checks.ts";

const findings = [
  ...checkScreenImageFixture(createScreenImageFixture()).map((finding) => ({ ...finding, path: ["ScreenImage", ...finding.path] })),
  ...checkScreenPreviewFixture(createScreenPreviewFixture()).map((finding) => ({ ...finding, path: ["ScreenPreview", ...finding.path] })),
  ...checkScreenLightboxFixture(createScreenLightboxFixture()).map((finding) => ({ ...finding, path: ["ScreenLightbox", ...finding.path] })),

  ...checkSearchFieldFixture(createSearchFieldFixture()).map((finding) => ({ ...finding, path: ["SearchField", ...finding.path] })),
  ...checkJourneyContractControlsFixture(createJourneyContractControlsFixture()).map((finding) => ({ ...finding, path: ["JourneyContractControls", ...finding.path] })),
  ...checkInspectorPanelFixture(createInspectorPanelFixture()).map((finding) => ({ ...finding, path: ["InspectorPanel", ...finding.path] })),
  ...checkStateSummaryFixture(createStateSummaryFixture()).map((finding) => ({
    ...finding, path: ["StateSummary", ...finding.path],
  })),
  ...checkJourneyContractsFixture(createJourneyContractsFixture()).map((finding) => ({
    ...finding, path: ["JourneyContracts", ...finding.path],
  })),
  ...checkButtonFixture(createButtonFixture()).map((finding) => ({
    ...finding,
    path: ["Button", ...finding.path],
  })),
  ...checkJourneyCardFixture(createJourneyCardFixture()).map((finding) => ({
    ...finding,
    path: ["JourneyCard", ...finding.path],
  })),
  ...checkSurfaceFixture(createSurfaceFixture()).map((finding) => ({
    ...finding,
    path: ["Surface", ...finding.path],
  })),
  ...checkJourneyHeadFixture(createJourneyHeadFixture()).map((finding) => ({
    ...finding,
    path: ["JourneyHead", ...finding.path],
  })),
  ...checkStateRowFixture(createStateRowFixture()).map((finding) => ({
    ...finding,
    path: ["StateRow", ...finding.path],
  })),
  ...checkIconButtonFixture(createIconButtonFixture()).map((finding) => ({
    ...finding,
    path: ["IconButton", ...finding.path],
  })),
  ...checkTextFixture(createTextFixture()).map((finding) => ({
    ...finding,
    path: ["Text", ...finding.path],
  })),
  ...checkBadgeFixture(createBadgeFixture()).map((finding) => ({
    ...finding,
    path: ["Badge", ...finding.path],
  })),
  ...checkHeadingFixture(createHeadingFixture()).map((finding) => ({
    ...finding,
    path: ["Heading", ...finding.path],
  })),
  ...checkTouchpointDotFixture(createTouchpointDotFixture()).map((finding) => ({
    ...finding,
    path: ["TouchpointDot", ...finding.path],
  })),
];
if (findings.length) {
  for (const finding of findings)
    console.error(`${finding.path.join(".")}: ${finding.message}`);
  process.exitCode = 1;
} else console.log("18 component fixture contracts pass independently.");
