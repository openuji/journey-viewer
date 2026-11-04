import type { ReactNode } from "react";
import { useViewer } from "@/components/Viewer/Viewer";
import type { ViewerMode } from "@/navigation";

export interface WhenTreeLayoutProps {
  /** The navigation mode: "tree" for Rows, or "columns". */
  readonly mode: ViewerMode;
  readonly children?: ReactNode;
}

/** Tests the tree layout only; compose with `WhenView` to also require an active view. */
export function WhenTreeLayout({ mode, children }: WhenTreeLayoutProps) {
  const { state } = useViewer();
  return state.disclosure.snapshot.navigation.mode === mode ? children : null;
}
