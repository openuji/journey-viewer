import { checkTokens } from "./token-checks.mjs";
import { readDevelopmentTheme, readTokens } from "./token-data.mjs";

const { foundation, themes } = await readTokens();
const findings = checkTokens(foundation, {
  ...themes,
  alternate: await readDevelopmentTheme(),
});
if (findings.length) {
  for (const finding of findings)
    console.error(`${finding.path.join(".")}: ${finding.message}`);
  process.exitCode = 1;
} else console.log("DTCG token shapes, aliases, and theme keys pass.");
