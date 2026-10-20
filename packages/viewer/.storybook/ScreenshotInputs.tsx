import { useState } from "react";
import type { ReactNode } from "react";
import { Button, Text } from "@journey-viewer/design-system";
import type { ScreenshotMap } from "../src/screens.js";
import { missingScreenshots, oidcScreenshots, removedScreenshot, replacedScreenshots } from "./screenshots.js";

/** Caller-owned input replacement demo, shared by source and built-consumer examples. */
export function ScreenshotInputs({ children }: Readonly<{ children: (screenshots: ScreenshotMap) => ReactNode }>) {
  const [screenshots, setScreenshots] = useState(oidcScreenshots);
  return <>
    <Text as="p" variant="caption">Replace the screenshot JSON input while keeping the UJG document loaded.</Text>
    <div>
      <Button onClick={() => setScreenshots(replacedScreenshots)}>Replace first screenshot path</Button>
      <Button onClick={() => setScreenshots(removedScreenshot)}>Remove first screenshot mapping</Button>
      <Button onClick={() => setScreenshots(missingScreenshots)}>Use missing screenshot file</Button>
      <Button onClick={() => setScreenshots({})}>Clear screenshot map</Button>
      <Button onClick={() => setScreenshots({ ...oidcScreenshots })}>Restore screenshot map</Button>
    </div>
    {children(screenshots)}
  </>;
}
