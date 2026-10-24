import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

export interface BrowserScrollPanelProps {
  /** Scrolls back to the top whenever this value changes. */
  readonly resetKey: string;
  readonly className?: string | undefined;
  readonly children?: ReactNode;
}

/** A scroll container whose position resets for each new selection. */
export function BrowserScrollPanel({
  resetKey,
  className,
  children,
}: BrowserScrollPanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: 0 });
  }, [resetKey]);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
