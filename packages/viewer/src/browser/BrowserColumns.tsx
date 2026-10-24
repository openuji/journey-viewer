import { useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";

export interface BrowserColumnsProps {
  readonly count: number;
  readonly className?: string | undefined;
  readonly children?: ReactNode;
}

/** Native horizontal scroller that brings the newest column into view whenever columns are added. */
export function BrowserColumns({
  count,
  className,
  children,
}: BrowserColumnsProps) {
  const ref = useRef<HTMLDivElement>(null);
  const previous = useRef(0);
  useLayoutEffect(() => {
    const element = ref.current;
    if (
      element &&
      count > previous.current &&
      element.scrollWidth > element.clientWidth
    ) {
      const reduce = element.ownerDocument.defaultView?.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      element.scrollTo({
        left: element.scrollWidth,
        behavior: reduce ? "auto" : "smooth",
      });
    }
    previous.current = count;
  }, [count]);
  return (
    <div
      ref={ref}
      className={className}
      role="group"
      aria-label="Journey columns"
    >
      {children}
    </div>
  );
}
