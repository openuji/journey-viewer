import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Rect } from "@/flow/geometry";
import type { FlowInset } from "@/flow/inset";
import { BrowserInsetMap } from "@/components/BrowserInsetMap/BrowserInsetMap";
import styles from "@/components/BrowserFlowViewport/BrowserFlowViewport.module.css";

const MARGIN = 24;
/**
 * Scrollable room around the content, so that keeping a card in place never runs into a scroll
 * boundary when the content grows or shrinks around it.
 */
const SLACK = 1600;
const DURATION = 220;
const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

export interface BrowserFlowViewportProps {
  /** Every positioned block by its flow key; a new map means a new layout. */
  readonly blocks: ReadonlyMap<string, Rect>;
  readonly width: number;
  readonly height: number;
  readonly zoom: "actual" | "fit";
  /** A block key (`card:…`, `state:…`) whose screen position the next layout must keep. */
  readonly anchor: string | null;
  /**
   * A request to bring a block to the top-left corner, after `anchor` has kept it in place through
   * the layout it arrives with, or (`start`) to return to the first view. Keyboard focus follows a
   * block when `focus` is set and the reader is using the keyboard. Each new object is served once.
   */
  readonly reveal:
    | Readonly<{ block: string; focus?: boolean }>
    | Readonly<{ start: true }>
    | null;
  /** A block the first view keeps in sight, such as the selection; else the top-left corner. */
  readonly initial?: string | null;
  /** The chart in miniature, shown over the canvas while the chart is larger than the canvas. */
  readonly inset: FlowInset;
  readonly label: string;
  readonly children: ReactNode;
}

interface Seen {
  readonly blocks: ReadonlyMap<string, Rect>;
  readonly scale: number;
  readonly left: number;
  readonly top: number;
}

/**
 * The first view's scroll position: the content's top-left corner, moved no further than keeping
 * `rect` in sight needs.
 */
const firstView = (
  element: HTMLElement,
  rect: Rect | undefined,
  scale: number,
) => {
  const keep = (start: number, end: number, room: number) =>
    Math.max(
      SLACK - MARGIN,
      Math.min(
        SLACK + end * scale + MARGIN - room,
        SLACK + start * scale - MARGIN,
      ),
    );
  return rect
    ? {
        left: keep(rect.x, rect.x + rect.width, element.clientWidth),
        top: keep(rect.y, rect.y + rect.height, element.clientHeight),
      }
    : { left: SLACK - MARGIN, top: SLACK - MARGIN };
};

const reducedMotion = (element: Element) =>
  element.ownerDocument.defaultView?.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches ?? false;

/**
 * Browser boundary for the flow canvas: native scrolling, fit zoom, keeping a toggled card where it
 * was, the one disclosure transition, revealing a block on request, and the inset map.
 */
export function BrowserFlowViewport({
  blocks,
  width,
  height,
  zoom,
  anchor,
  reveal,
  initial = null,
  inset,
  label,
  children,
}: BrowserFlowViewportProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const previous = useRef<Seen | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const element = scroller.current;
    const view = element?.ownerDocument.defaultView;
    if (!element || !view) return;
    const measure = () =>
      setSize({ width: element.clientWidth, height: element.clientHeight });
    const observer = new view.ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, []);

  const scale =
    zoom === "fit" && size.width > 0 && width > 0 && height > 0
      ? Math.min(
          1,
          (size.width - 2 * MARGIN) / width,
          (size.height - 2 * MARGIN) / height,
        )
      : 1;
  // Nothing to find when the whole chart is in view, as at Fit.
  const overflows =
    size.width > 0 &&
    (width * scale + 2 * MARGIN > size.width ||
      height * scale + 2 * MARGIN > size.height);

  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const before = previous.current;
    const commit = () => {
      previous.current = {
        blocks,
        scale,
        left: element.scrollLeft,
        top: element.scrollTop,
      };
    };
    // First render, or a zoom change: show the content's top-left corner. The first view also
    // keeps its initial block in sight, moving no further than that needs.
    if (!before || (before.blocks === blocks && before.scale !== scale)) {
      const { left, top } = firstView(
        element,
        !before && initial ? blocks.get(initial) : undefined,
        scale,
      );
      element.scrollLeft = left;
      element.scrollTop = top;
      return commit();
    }
    if (before.blocks === blocks) return commit();
    const from = anchor ? before.blocks.get(anchor) : undefined;
    const to = anchor ? blocks.get(anchor) : undefined;
    if (from && to) {
      element.scrollLeft = before.left + to.x * scale - from.x * before.scale;
      element.scrollTop = before.top + to.y * scale - from.y * before.scale;
    }
    if (scene.current && !reducedMotion(element)) {
      const left = element.scrollLeft;
      const top = element.scrollTop;
      for (const block of scene.current.querySelectorAll<HTMLElement>(
        "[data-flow-key]",
      )) {
        const key = block.dataset.flowKey!;
        const old = before.blocks.get(key);
        const next = blocks.get(key);
        if (!next) continue;
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
  }, [blocks, scale, anchor]);

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

  // The request arrives in the same render as the layout it refers to, after anchoring has run. The
  // canvas comes into view in the page first, then the block in the canvas. Returning to the first
  // view leaves the page to its own reveal.
  useEffect(() => {
    const element = scroller.current;
    if (!reveal || !element) return;
    const behavior = reducedMotion(element) ? "auto" : "smooth";
    if ("start" in reveal) {
      const rect = initial ? blocks.get(initial) : undefined;
      element.scrollTo({ ...firstView(element, rect, scale), behavior });
      return;
    }
    const rect = blocks.get(reveal.block);
    if (!rect) return;
    element.scrollIntoView({ block: "nearest", behavior });
    element.scrollTo({
      left: SLACK + rect.x * scale - MARGIN,
      top: SLACK + rect.y * scale - MARGIN,
      behavior,
    });
    if (
      reveal.focus &&
      element.ownerDocument.activeElement?.matches(":focus-visible")
    )
      [
        ...(scene.current?.querySelectorAll<HTMLElement>("[data-flow-key]") ??
          []),
      ]
        .find((block) => block.dataset.flowKey === reveal.block)
        ?.querySelector<HTMLElement>("button")
        ?.focus({ preventScroll: true });
  }, [reveal]);

  return (
    <div className={styles.canvas}>
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
            width: width * scale + 2 * SLACK,
            height: height * scale + 2 * SLACK,
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
      {overflows && (
        <BrowserInsetMap
          {...inset}
          scroller={scroller}
          origin={SLACK}
          scale={scale}
          size={size}
          width={width}
          height={height}
        />
      )}
    </div>
  );
}
