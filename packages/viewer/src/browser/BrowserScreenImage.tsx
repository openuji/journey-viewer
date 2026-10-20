import { useState } from "react";
import { ScreenImage } from "@journey-viewer/design-system";

export interface BrowserScreenImageProps {
  readonly source: string | undefined;
  readonly label: string;
}

/** Browser-only loading state, scoped to the actual URL; no graph/business state. */
export function BrowserScreenImage({ source, label }: BrowserScreenImageProps) {
  const [load, setLoad] = useState<Readonly<{ source: string | undefined; status: "loading" | "ready" | "unavailable" }>>(
    () => ({ source, status: source ? "loading" : "unavailable" }),
  );
  if (load.source !== source) {
    setLoad({ source, status: source ? "loading" : "unavailable" });
    return null;
  }
  const status = (next: "ready" | "unavailable") => setLoad((current) => (
    current.source === source && current.status !== next ? { source, status: next } : current
  ));
  return <ScreenImage key={source ?? "unmapped"} source={source} label={label} status={load.status}
    onLoad={() => status("ready")} onError={() => status("unavailable")} />;
}
