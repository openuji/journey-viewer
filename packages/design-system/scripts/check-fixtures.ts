import { createIconFixture } from "@/components/Icon/Icon.fixtures";
import { checkIconFixture } from "@/components/Icon/Icon.checks";
import { createJourneyNestFixture } from "@/components/JourneyNest/JourneyNest.fixtures";
import { checkJourneyNestFixture } from "@/components/JourneyNest/JourneyNest.checks";
import { createScreenThumbnailFixture } from "@/components/ScreenThumbnail/ScreenThumbnail.fixtures";
import { checkScreenThumbnailFixture } from "@/components/ScreenThumbnail/ScreenThumbnail.checks";
import { createSegmentedControlFixture } from "@/components/SegmentedControl/SegmentedControl.fixtures";
import { checkSegmentedControlFixture } from "@/components/SegmentedControl/SegmentedControl.checks";
import { createExplorerBarFixture } from "@/components/ExplorerBar/ExplorerBar.fixtures";
import { checkExplorerBarFixture } from "@/components/ExplorerBar/ExplorerBar.checks";
import { createScreenImageFixture } from "@/components/ScreenImage/ScreenImage.fixtures";
import { checkScreenImageFixture } from "@/components/ScreenImage/ScreenImage.checks";
import { createScreenPreviewFixture } from "@/components/ScreenPreview/ScreenPreview.fixtures";
import { checkScreenPreviewFixture } from "@/components/ScreenPreview/ScreenPreview.checks";
import { createScreenLightboxFixture } from "@/components/ScreenLightbox/ScreenLightbox.fixtures";
import { checkScreenLightboxFixture } from "@/components/ScreenLightbox/ScreenLightbox.checks";
import { createButtonFixture } from "@/components/Button/Button.fixtures";
import { createSearchFieldFixture } from "@/components/SearchField/SearchField.fixtures";
import { checkSearchFieldFixture } from "@/components/SearchField/SearchField.checks";
import { createJourneyContractControlsFixture } from "@/components/JourneyContractControls/JourneyContractControls.fixtures";
import { checkJourneyContractControlsFixture } from "@/components/JourneyContractControls/JourneyContractControls.checks";
import { createInspectorPanelFixture } from "@/components/InspectorPanel/InspectorPanel.fixtures";
import { checkInspectorPanelFixture } from "@/components/InspectorPanel/InspectorPanel.checks";
import { createJourneyContractsFixture } from "@/components/JourneyContracts/JourneyContracts.fixtures";
import { checkJourneyContractsFixture } from "@/components/JourneyContracts/JourneyContracts.checks";
import { createStateSummaryFixture } from "@/components/StateSummary/StateSummary.fixtures";
import { checkStateSummaryFixture } from "@/components/StateSummary/StateSummary.checks";
import { checkButtonFixture } from "@/components/Button/Button.checks";
import { createJourneyCardFixture } from "@/components/JourneyCard/JourneyCard.fixtures";
import { checkJourneyCardFixture } from "@/components/JourneyCard/JourneyCard.checks";
import { createSurfaceFixture } from "@/components/Surface/Surface.fixtures";
import { checkSurfaceFixture } from "@/components/Surface/Surface.checks";
import { createJourneyHeadFixture } from "@/components/JourneyHead/JourneyHead.fixtures";
import { checkJourneyHeadFixture } from "@/components/JourneyHead/JourneyHead.checks";
import { createStateRowFixture } from "@/components/StateRow/StateRow.fixtures";
import { checkStateRowFixture } from "@/components/StateRow/StateRow.checks";
import { createIconButtonFixture } from "@/components/IconButton/IconButton.fixtures";
import { checkIconButtonFixture } from "@/components/IconButton/IconButton.checks";
import { createTextFixture } from "@/components/Text/Text.fixtures";
import { checkTextFixture } from "@/components/Text/Text.checks";
import { createBadgeFixture } from "@/components/Badge/Badge.fixtures";
import { checkBadgeFixture } from "@/components/Badge/Badge.checks";
import { createHeadingFixture } from "@/components/Heading/Heading.fixtures";
import { checkHeadingFixture } from "@/components/Heading/Heading.checks";
import { createTouchpointDotFixture } from "@/components/TouchpointDot/TouchpointDot.fixtures";
import { checkTouchpointDotFixture } from "@/components/TouchpointDot/TouchpointDot.checks";

const findings = [
  ...checkIconFixture(createIconFixture()).map((finding) => ({
    ...finding,
    path: ["Icon", ...finding.path],
  })),
  ...checkJourneyNestFixture(createJourneyNestFixture()).map((finding) => ({
    ...finding,
    path: ["JourneyNest", ...finding.path],
  })),
  ...checkScreenThumbnailFixture(createScreenThumbnailFixture()).map(
    (finding) => ({ ...finding, path: ["ScreenThumbnail", ...finding.path] }),
  ),
  ...checkSegmentedControlFixture(createSegmentedControlFixture()).map(
    (finding) => ({ ...finding, path: ["SegmentedControl", ...finding.path] }),
  ),
  ...checkExplorerBarFixture(createExplorerBarFixture()).map((finding) => ({
    ...finding,
    path: ["ExplorerBar", ...finding.path],
  })),
  ...checkScreenImageFixture(createScreenImageFixture()).map((finding) => ({
    ...finding,
    path: ["ScreenImage", ...finding.path],
  })),
  ...checkScreenPreviewFixture(createScreenPreviewFixture()).map((finding) => ({
    ...finding,
    path: ["ScreenPreview", ...finding.path],
  })),
  ...checkScreenLightboxFixture(createScreenLightboxFixture()).map(
    (finding) => ({ ...finding, path: ["ScreenLightbox", ...finding.path] }),
  ),

  ...checkSearchFieldFixture(createSearchFieldFixture()).map((finding) => ({
    ...finding,
    path: ["SearchField", ...finding.path],
  })),
  ...checkJourneyContractControlsFixture(
    createJourneyContractControlsFixture(),
  ).map((finding) => ({
    ...finding,
    path: ["JourneyContractControls", ...finding.path],
  })),
  ...checkInspectorPanelFixture(createInspectorPanelFixture()).map(
    (finding) => ({ ...finding, path: ["InspectorPanel", ...finding.path] }),
  ),
  ...checkStateSummaryFixture(createStateSummaryFixture()).map((finding) => ({
    ...finding,
    path: ["StateSummary", ...finding.path],
  })),
  ...checkJourneyContractsFixture(createJourneyContractsFixture()).map(
    (finding) => ({
      ...finding,
      path: ["JourneyContracts", ...finding.path],
    }),
  ),
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
} else console.log("23 component fixture contracts pass independently.");
