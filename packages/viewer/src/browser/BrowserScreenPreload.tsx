import { useEffect, useRef, useState } from "react";

export interface BrowserScreenPreloadProps {
  readonly sources: readonly string[];
}

/** After the page is idle, loads the supplied images into the document's image cache. */
export function BrowserScreenPreload({ sources }: BrowserScreenPreloadProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const view = ref.current?.ownerDocument.defaultView;
    if (!view) return;
    if (typeof view.requestIdleCallback === "function") {
      const handle = view.requestIdleCallback(() => setReady(true), { timeout: 2000 });
      return () => view.cancelIdleCallback(handle);
    }
    const handle = view.setTimeout(() => setReady(true), 200);
    return () => view.clearTimeout(handle);
  }, []);
  return <span ref={ref} hidden aria-hidden="true">
    {ready && sources.map((source) => <img key={source} src={source} alt="" decoding="async" />)}
  </span>;
}
