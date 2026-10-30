import type { ReactNode } from "react";
import { ExplorerBar } from "@journey-viewer/design-system";

/** The explorer bar; sticky from the `md` breakpoint, holding whatever pieces it is given. */
export function ViewerBar({ children }: Readonly<{ children?: ReactNode }>) {
  return <ExplorerBar>{children}</ExplorerBar>;
}
