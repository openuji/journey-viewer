import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Text } from "@journey-viewer/design-system";
import { estimate } from "@/flow/text";
import type { TextMeasure, TextRole } from "@/flow/text";
import styles from "@/browser/BrowserTextMeasure.module.css";

export interface BrowserTextMeasureProps {
  /** Receives null until the page's fonts have been read. */
  readonly children: (measure: TextMeasure | null) => ReactNode;
}

const roles: readonly TextRole[] = ["body", "title", "caption"];

/**
 * Measures text with the fonts the design system actually renders: hidden samples of each role are
 * read once after mount, and again once loading web fonts settle.
 */
export function BrowserTextMeasure({ children }: BrowserTextMeasureProps) {
  const samples = useRef<HTMLSpanElement>(null);
  const [measure, setMeasure] = useState<TextMeasure | null>(null);
  useLayoutEffect(() => {
    const root = samples.current;
    const view = root?.ownerDocument.defaultView;
    if (!root || !view) return;
    let mounted = true;
    const read = () => {
      const context = root.ownerDocument
        .createElement("canvas")
        .getContext("2d");
      if (!context) return setMeasure(() => estimate);
      const fonts = new Map(
        [...root.querySelectorAll<HTMLElement>("[data-role-sample]")].map(
          (sample) => {
            const style = view.getComputedStyle(sample);
            return [
              sample.dataset.roleSample,
              `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`,
            ] as const;
          },
        ),
      );
      setMeasure(() => (text: string, role: TextRole) => {
        context.font = fonts.get(role) ?? "";
        return Math.ceil(context.measureText(text).width);
      });
    };
    read();
    const set = root.ownerDocument.fonts;
    if (set.status === "loading")
      void set.ready.then(() => {
        if (mounted) read();
      });
    return () => {
      mounted = false;
    };
  }, []);
  return (
    <>
      <span ref={samples} className={styles.samples} aria-hidden="true">
        {roles.map((role) => (
          <Text
            key={role}
            data-role-sample={role}
            variant={
              role === "body" ? "body" : role === "title" ? "label" : "caption"
            }
            {...(role === "title" ? { weight: "semibold" as const } : {})}
          >
            Flow
          </Text>
        ))}
      </span>
      {children(measure)}
    </>
  );
}
