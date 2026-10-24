import { Badge } from "@/components/Badge/Badge";
import { Text } from "@/components/Text/Text";
import styles from "@/components/JourneyContracts/JourneyContracts.module.css";

export interface JourneyContractItem {
  readonly id: string;
  readonly label: string;
}

export interface JourneyEntryItem extends JourneyContractItem {
  readonly default?: boolean;
}

export interface JourneyContractsProps {
  readonly entries: readonly JourneyEntryItem[];
  readonly exits: readonly JourneyContractItem[];
}

/** Presentation only: callers supply entries, exits, and the explicit default. */
export function JourneyContracts({ entries, exits }: JourneyContractsProps) {
  return (
    <dl className={styles.contracts}>
      <div className={styles.group}>
        <dt>
          <Text variant="caption" tone="subtle">
            Entries
          </Text>
        </dt>
        <dd className={styles.items}>
          <ul className={styles.list}>
            {entries.map((entry, index) => (
              <li
                key={`${index}:${entry.id}`}
                data-contract-ref={entry.id}
                data-contract-kind="entry"
              >
                <Badge tone="entry" title={entry.id}>
                  {entry.label}
                  {entry.default && (
                    <>
                      {" "}
                      <Text variant="caption">(default)</Text>
                    </>
                  )}
                </Badge>
              </li>
            ))}
            {entries.length === 0 && (
              <li>
                <Text variant="caption" tone="subtle">
                  No entries.
                </Text>
              </li>
            )}
          </ul>
        </dd>
      </div>
      <div className={styles.group}>
        <dt>
          <Text variant="caption" tone="subtle">
            Exits
          </Text>
        </dt>
        <dd className={styles.items}>
          <ul className={styles.list}>
            {exits.map((exit, index) => (
              <li
                key={`${index}:${exit.id}`}
                data-contract-ref={exit.id}
                data-contract-kind="exit"
              >
                <Badge tone="exit" title={exit.id}>
                  {exit.label}
                </Badge>
              </li>
            ))}
            {exits.length === 0 && (
              <li>
                <Text variant="caption" tone="subtle">
                  No exits.
                </Text>
              </li>
            )}
          </ul>
        </dd>
      </div>
    </dl>
  );
}
