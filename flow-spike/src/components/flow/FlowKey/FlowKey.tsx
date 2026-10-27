import type { ReactNode } from "react";
import type { FlowDetail } from "@/model/presentation";
import styles from "@/components/flow/FlowKey/FlowKey.module.css";

export interface FlowKeyProps {
  readonly detail: FlowDetail;
}

const Sample = ({ children }: { readonly children: ReactNode }) => (
  <svg
    className={styles.sample}
    viewBox="0 0 40 16"
    width="40"
    height="16"
    aria-hidden="true"
  >
    {children}
  </svg>
);
const line = (dash?: string) => (
  <path
    d="M2 8H32"
    className={styles.line}
    {...(dash ? { strokeDasharray: dash } : {})}
  />
);
const arrow = (hollow = false) => (
  <path
    d="M38 8L31 4.4V11.6Z"
    className={hollow ? styles.hollow : styles.tip}
  />
);

/** The marks the canvas uses, only those visible at the current detail. */
export function FlowKey({ detail }: FlowKeyProps) {
  const items: [ReactNode, string][] = [
    [
      <Sample>
        <circle cx="10" cy="8" r="4.75" className={styles.entryDefault} />
        <circle cx="28" cy="8" r="4.75" className={styles.entry} />
      </Sample>,
      "Ways in: the default one is filled",
    ],
    [
      <Sample>
        <circle cx="20" cy="8" r="4.75" className={styles.exit} />
        <circle cx="20" cy="8" r="2" className={styles.exitCore} />
      </Sample>,
      "Way out of a journey",
    ],
    [
      <Sample>{line()}</Sample>,
      "Routes share lines; point at a step to see its own, with direction",
    ],
    [<Sample>{line("2 3")}</Sample>, "Where a way in starts"],
    [
      <Sample>
        <path d="M2 8H32" className={styles.incoming} />
        <path d="M38 8L31 4.4V11.6Z" className={styles.incomingTip} />
      </Sample>,
      "Arrives at the active step",
    ],
    [
      <Sample>
        <path d="M2 8H32" className={styles.outgoing} />
        <path d="M38 8L31 4.4V11.6Z" className={styles.outgoingTip} />
      </Sample>,
      "Leaves the active step",
    ],
    [
      <Sample>
        <path d="M9 7.4H38" className={styles.outgoingHalf} />
        <path d="M2 8L9 3.6V8Z" className={styles.outgoingTip} />
        <path d="M2 8.6H31" className={styles.incomingHalf} />
        <path d="M38 8L31 12.4V8Z" className={styles.incomingTip} />
      </Sample>,
      "Both directions on one line: each keeps to its half, with half an arrowhead",
    ],
  ];
  if (detail.bundleCounts)
    items.push([
      <Sample>
        <rect
          x="6"
          y="1"
          width="28"
          height="14"
          rx="7"
          className={styles.chip}
        />
        <text x="10" y="12" className={styles.chipText}>
          ×3
        </text>
      </Sample>,
      "Several transitions behind one of the active step's routes",
    ]);
  if (detail.boundaryMarks)
    items.push([
      <Sample>
        {line()}
        {arrow(true)}
      </Sample>,
      "Enters through the nested journey's default entry",
    ]);
  if (detail.outgoingMarkers)
    items.push([
      <Sample>
        <path d="M15 5h5v5M20 5l-6 6" className={styles.line} />
      </Sample>,
      "Navigation available from this step",
    ]);
  return (
    <details className={styles.key}>
      <summary className={styles.summary}>Key</summary>
      <dl className={styles.panel}>
        {items.map(([sample, text]) => (
          <div key={text} className={styles.row}>
            <dt>{sample}</dt>
            <dd>{text}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
