import type { Preview } from "@storybook/react-vite";
import designSystem from "../../design-system/.storybook/preview.js";
import "@journey-viewer/design-system/styles.css";

// Reuse theme globals, scoped decorators, layout and accessibility settings directly.
const preview: Preview = { ...designSystem };
export default preview;
