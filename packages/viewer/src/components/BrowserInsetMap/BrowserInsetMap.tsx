import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PointerEvent, RefObject, WheelEvent } from "react";
import { InsetMap } from "@journey-viewer/design-system";
import type { Point, Rect } from "@/flow/geometry";
import type { FlowInset } from "@/flow/inset";
import styles from "@/components/BrowserInsetMap/BrowserInsetMap.module.css";

export interface BrowserInsetMapProps extends FlowInset {
  /** The canvas's scrolling element, which the inset follows and moves. */
  readonly scroller: RefObject<HTMLDivElement | null>;
  /** Where the chart's origin sits in the scrolled content, before scaling. */
  readonly origin: number;
  readonly scale: number;
  /** The canvas's visible size. */
  readonly size: Readonly<{ width: number; height: number }>;
  /** The chart's drawn size. */
  readonly width: number;
  readonly height: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/**
 * Browser boundary for the inset map: it follows the canvas's scroll, and dragging or pressing it
 * moves the canvas there. It mirrors what the canvas region already does by keyboard, so it stays
 * out of the tab order and the accessibility tree.
 */
export function BrowserInsetMap({
  scroller,
  origin,
  scale,
  size,
  width,
  height,
  frames,
  blocks,
}: BrowserInsetMapProps) {
  const [scroll, setScroll] = useState<Point | null>(null);
  // Where the pointer holds the view, from its top-left corner, while a drag lasts.
  const grab = useRef<Point | null>(null);

  useLayoutEffect(() => {
    const element = scroller.current;
    if (element) setScroll({ x: element.scrollLeft, y: element.scrollTop });
  }, [scroller]);

  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const follow = () =>
      setScroll({ x: element.scrollLeft, y: element.scrollTop });
    element.addEventListener("scroll", follow, { passive: true });
    return () => element.removeEventListener("scroll", follow);
  }, [scroller]);

  const view: Rect | null = scroll && {
    x: (scroll.x - origin) / scale,
    y: (scroll.y - origin) / scale,
    width: size.width / scale,
    height: size.height / scale,
  };

  /**
   * The chart point under the pointer, through the inset's own scaling and letterboxing. Chromium's
   * `SVGMatrix` has no `transformPoint`, so the inverse is applied by hand.
   */
  const pointAt = (event: PointerEvent<HTMLDivElement>): Point | undefined => {
    const m = event.currentTarget
      .querySelector("svg")
      ?.getScreenCTM()
      ?.inverse();
    return (
      m && {
        x: m.a * event.clientX + m.c * event.clientY + m.e,
        y: m.b * event.clientX + m.d * event.clientY + m.f,
      }
    );
  };

  /** Puts the view's top-left corner at `corner`, keeping its centre on the chart. */
  const show = (corner: Point) => {
    const element = scroller.current;
    if (!element || !view) return;
    const x = clamp(corner.x + view.width / 2, 0, width) - view.width / 2;
    const y = clamp(corner.y + view.height / 2, 0, height) - view.height / 2;
    element.scrollLeft = origin + x * scale;
    element.scrollTop = origin + y * scale;
  };

  const press = (event: PointerEvent<HTMLDivElement>) => {
    const point = pointAt(event);
    if (!point || !view || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const inside =
      point.x >= view.x &&
      point.x <= view.x + view.width &&
      point.y >= view.y &&
      point.y <= view.y + view.height;
    // Pressing the view holds it where it was grabbed; pressing elsewhere centres it there.
    grab.current = inside
      ? { x: point.x - view.x, y: point.y - view.y }
      : { x: view.width / 2, y: view.height / 2 };
    if (!inside)
      show({ x: point.x - grab.current.x, y: point.y - grab.current.y });
  };

  const drag = (event: PointerEvent<HTMLDivElement>) => {
    const point = grab.current && pointAt(event);
    if (point && grab.current)
      show({ x: point.x - grab.current.x, y: point.y - grab.current.y });
  };

  const release = () => {
    grab.current = null;
  };

  // The inset floats over the canvas, so a wheel over it still scrolls the canvas.
  const wheel = (event: WheelEvent<HTMLDivElement>) =>
    scroller.current?.scrollBy({ left: event.deltaX, top: event.deltaY });

  return (
    <InsetMap
      className={styles.inset}
      width={width}
      height={height}
      frames={frames}
      blocks={blocks}
      view={view}
      onPointerDown={press}
      onPointerMove={drag}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onWheel={wheel}
    />
  );
}
