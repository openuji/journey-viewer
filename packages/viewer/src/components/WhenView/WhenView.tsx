import type { ReactNode } from "react";
import { useViewer } from "@/components/Viewer/Viewer";

export interface WhenViewProps {
  /** One view id, or several. */
  readonly id: string | readonly string[];
  readonly children?: ReactNode;
}

/** Shows its children only while one of these views is active, such as a view's own controls. */
export function WhenView({ id, children }: WhenViewProps) {
  const { state } = useViewer();
  const ids: readonly string[] = typeof id === "string" ? [id] : id;
  return ids.includes(state.view) ? children : null;
}
