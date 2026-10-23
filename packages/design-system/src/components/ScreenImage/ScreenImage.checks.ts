import { choice, object, text } from "../../dev/checks.ts";
import type { FixtureCheck } from "../../dev/checks.ts";
export const checkScreenImageFixture: FixtureCheck = (value) => [
  ...text(value, "label"),
  ...choice(value, "status", ["loading", "ready", "unavailable"]),
  ...(object(value) && value.fit !== undefined ? choice(value, "fit", ["width", "height"]) : []),
  ...(object(value) && value.source === undefined ? [] : text(value, "source")),
  ...(object(value) && (value.status === "loading" || value.status === "ready") && value.source === undefined
    ? [{ path: ["source"], message: "Loading/ready images require a source." }] : []),
];
