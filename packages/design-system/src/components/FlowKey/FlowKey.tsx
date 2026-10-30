import { useId } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Button } from "@/components/Button/Button";
import { Text } from "@/components/Text/Text";
import styles from "@/components/FlowKey/FlowKey.module.css";

export interface FlowKeyProps {
  /** The button that opens the panel. */
  readonly label?: string;
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

const marks: readonly (readonly [ReactNode, string])[] = [
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
    <Sample>
      <path d="M2 8H32" className={styles.line} />
    </Sample>,
    "Routes share lines; point at a step to see its own, with direction",
  ],
  [
    <Sample>
      <path d="M2 8H32" className={styles.line} strokeDasharray="2 3" />
    </Sample>,
    "Where a way in starts",
  ],
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

/**
 * The marks a flow canvas uses, in a popover beside its controls. The panel opens in the top layer,
 * so no scrolling or rounded container clips it; Escape and a click outside close it.
 */
export function FlowKey({ label = "Key" }: FlowKeyProps) {
  const id = useId();
  const anchor = `--flow-key-${id.replace(/[^\w-]/g, "")}`;
  return (
    <span className={styles.key}>
      <Button
        variant="outline"
        size="sm"
        popoverTarget={id}
        style={{ anchorName: anchor } as CSSProperties}
      >
        {label}
      </Button>
      <div
        id={id}
        popover="auto"
        className={styles.panel}
        style={{ positionAnchor: anchor } as CSSProperties}
      >
        <dl className={styles.list}>
          {marks.map(([sample, text]) => (
            <div key={text} className={styles.row}>
              <dt>{sample}</dt>
              <dd>
                <Text variant="caption">{text}</Text>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </span>
  );
}
