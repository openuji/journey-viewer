import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { FlowLayout } from "@/layout/compose";
import { blockRects } from "@/layout/viewport";
import styles from "@/browser/FlowViewport/FlowViewport.module.css";

const MARGIN = 24;
/**
 * Scrollable room around the content, so that keeping a card in place never runs into a scroll
 * boundary when the content grows or shrinks around it.
 */
const SLACK = 1600;
const DURATION = 220;
const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

export interface FlowViewportProps {
  readonly layout: FlowLayout;
  readonly zoom: "actual" | "fit";
  /** A block key (`card:…`, `state:…`) whose screen position the next layout must keep. */
  readonly anchor: string | null;
  /**
   * A request to bring a block to the top-left corner, after `anchor` has kept it in place through
   * the layout it arrives with; keyboard focus follows it. Each new object is served once.
   */
  readonly reveal?: Readonly<{ block: string }> | null;
  readonly label: string;
  readonly children: ReactNode;
}

interface Seen {
  readonly layout: FlowLayout;
  readonly scale: number;
  readonly left: number;
  readonly top: number;
}

const reducedMotion = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Browser boundary for the flow canvas: native scrolling, fit zoom, keeping a toggled card where it
 * was, the one disclosure transition, and revealing a block on request.
 */
export function FlowViewport({
  layout,
  zoom,
  anchor,
  reveal = null,
  label,
  children,
}: FlowViewportProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const previous = useRef<Seen | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const observer = new ResizeObserver(() =>
      setSize({ width: element.clientWidth, height: element.clientHeight }),
    );
    observer.observe(element);
    setSize({ width: element.clientWidth, height: element.clientHeight });
    return () => observer.disconnect();
  }, []);

  const scale =
    zoom === "fit" && size.width > 0
      ? Math.min(
          1,
          (size.width - 2 * MARGIN) / layout.width,
          (size.height - 2 * MARGIN) / layout.height,
        )
      : 1;

  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const before = previous.current;
    const commit = () => {
      previous.current = {
        layout,
        scale,
        left: element.scrollLeft,
        top: element.scrollTop,
      };
    };
    // First render, or a zoom change: show the content's top-left corner.
    if (!before || (before.layout === layout && before.scale !== scale)) {
      element.scrollLeft = SLACK - MARGIN;
      element.scrollTop = SLACK - MARGIN;
      return commit();
    }
    if (before.layout === layout) return commit();
    const oldRects = blockRects(before.layout);
    const newRects = blockRects(layout);
    const from = anchor ? oldRects.get(anchor) : undefined;
    const to = anchor ? newRects.get(anchor) : undefined;
    if (from && to) {
      element.scrollLeft = before.left + to.x * scale - from.x * before.scale;
      element.scrollTop = before.top + to.y * scale - from.y * before.scale;
    }
    if (scene.current && !reducedMotion()) {
      const left = element.scrollLeft;
      const top = element.scrollTop;
      for (const block of scene.current.querySelectorAll<HTMLElement>(
        "[data-flow-key]",
      )) {
        const key = block.dataset.flowKey!;
        const old = oldRects.get(key);
        const next = newRects.get(key)!;
        if (!old) {
          block.animate([{ opacity: 0 }, { opacity: 1 }], {
            duration: DURATION,
            easing: EASE,
          });
          continue;
        }
        const dx =
          (old.x * before.scale - before.left - (next.x * scale - left)) /
          scale;
        const dy =
          (old.y * before.scale - before.top - (next.y * scale - top)) / scale;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
        block.animate(
          [{ translate: `${dx}px ${dy}px` }, { translate: "0px 0px" }],
          { duration: DURATION, easing: EASE },
        );
      }
      scene.current
        .querySelector("svg")
        ?.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: DURATION,
          easing: EASE,
        });
    }
    commit();
  }, [layout, scale, anchor]);

  // Anchoring measures from the last scroll position the reader chose.
  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const update = () => {
      if (previous.current)
        previous.current = {
          ...previous.current,
          left: element.scrollLeft,
          top: element.scrollTop,
        };
    };
    element.addEventListener("scroll", update, { passive: true });
    return () => element.removeEventListener("scroll", update);
  }, []);

  // The request arrives in the same render as the layout it refers to, after anchoring has run. A
  // keyboard user continues from the revealed block rather than from the control that asked.
  useEffect(() => {
    const rect = reveal ? blockRects(layout).get(reveal.block) : undefined;
    if (!reveal || !rect || !scroller.current) return;
    scroller.current.scrollTo({
      left: SLACK + rect.x * scale - MARGIN,
      top: SLACK + rect.y * scale - MARGIN,
      behavior: reducedMotion() ? "auto" : "smooth",
    });
    if (document.activeElement?.matches(":focus-visible"))
      scene.current
        ?.querySelector<HTMLElement>(
          `[data-flow-key="${CSS.escape(reveal.block)}"] button`,
        )
        ?.focus({ preventScroll: true });
  }, [reveal]);

  return (
    <div
      ref={scroller}
      className={styles.viewport}
      role="region"
      aria-label={label}
      tabIndex={0}
      data-zoom={zoom}
    >
      <div
        className={styles.sizer}
        style={{
          width: layout.width * scale + 2 * SLACK,
          height: layout.height * scale + 2 * SLACK,
        }}
      >
        <div
          ref={scene}
          className={styles.scene}
          style={{
            transform: `translate(${SLACK}px, ${SLACK}px) scale(${scale})`,
          }}
          data-scale={scale.toFixed(3)}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
