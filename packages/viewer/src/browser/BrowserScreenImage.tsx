import { useLayoutEffect, useRef, useState } from "react";
import { ScreenImage } from "@journey-viewer/design-system";
import type { ScreenImageProps } from "@journey-viewer/design-system";

export interface BrowserScreenImageProps {
  readonly source: string | undefined;
  readonly label: string;
  readonly fit?: ScreenImageProps["fit"];
}

/** Browser-only loading state, scoped to the actual URL; no graph/business state. */
export function BrowserScreenImage({
  source,
  label,
  fit = "width",
}: BrowserScreenImageProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [load, setLoad] = useState<
    Readonly<{
      source: string | undefined;
      status: "loading" | "ready" | "unavailable";
    }>
  >(() => ({ source, status: source ? "loading" : "unavailable" }));
  useLayoutEffect(() => {
    const image = imageRef.current;
    if (!image || !source) return;
    let active = true;
    let settled = false;
    let decoding = false;
    const finish = (status: "ready" | "unavailable") => {
      if (!active || settled) return;
      settled = true;
      setLoad((current) =>
        current.source === source && current.status !== status
          ? { source, status }
          : current,
      );
    };
    const handlers = {
      load: () => {
        if (!active || settled || decoding) return;
        decoding = true;
        void image.decode().then(
          () => finish("ready"),
          () => finish("unavailable"),
        );
      },
      error: () => finish("unavailable"),
    };
    // Listen on this exact image node, so detached images cannot settle a newer source.
    image.addEventListener("load", handlers.load);
    image.addEventListener("error", handlers.error);
    // Preloaded/previously displayed images need no loading paint. Fresh loads decode first.
    if (image.complete)
      finish(image.naturalWidth > 0 ? "ready" : "unavailable");
    else handlers.load();
    return () => {
      active = false;
      image.removeEventListener("load", handlers.load);
      image.removeEventListener("error", handlers.error);
    };
  }, [source]);
  if (load.source !== source) {
    setLoad({ source, status: source ? "loading" : "unavailable" });
    return null;
  }
  return (
    <ScreenImage
      imageRef={imageRef}
      source={source}
      label={label}
      status={load.status}
      fit={fit}
      onLoad={() => {}}
      onError={() => {}}
    />
  );
}
