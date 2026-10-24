import { Button } from "@/components/Button/Button";
import { Icon } from "@/components/Icon/Icon";
import { Text } from "@/components/Text/Text";
import type { JourneyContractsProps } from "@/components/JourneyContracts/JourneyContracts";
import styles from "@/components/JourneyContractControls/JourneyContractControls.module.css";

export interface ContractSelection {
  readonly kind: "entry" | "exit";
  readonly id: string;
}

export interface JourneyContractControlsProps extends JourneyContractsProps {
  readonly selection: ContractSelection | null;
  readonly onSelect: (kind: "entry" | "exit", id: string) => void;
  /** Whether the entry/exit chips are shown below the summary toggle. */
  readonly open: boolean;
  readonly onToggle: () => void;
  readonly filtered?: boolean;
}

const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

export function JourneyContractControls({
  entries,
  exits,
  selection,
  onSelect,
  open,
  onToggle,
  filtered = false,
}: JourneyContractControlsProps) {
  const summary = `${plural(entries.length, "entry", "entries")} · ${exits.length ? plural(exits.length, "exit", "exits") : "no exits"}`;
  return (
    <div className={styles.contracts} data-filtered={filtered || undefined}>
      <Button
        variant="ghost"
        size="xs"
        className={styles.toggle}
        aria-expanded={open}
        data-open={open || undefined}
        onClick={onToggle}
      >
        <Icon name="chevron" />
        <Text variant="caption" tone="subtle">
          {summary}
        </Text>
      </Button>
      {open && (
        <dl className={styles.list}>
          <div className={styles.group}>
            <dt className={styles.term}>
              <Text variant="caption" tone="subtle">
                Entries
              </Text>
            </dt>
            <dd className={styles.items}>
              <ul className={styles.chips}>
                {entries.map((entry, index) => (
                  <li
                    key={`${index}:${entry.id}`}
                    data-contract-ref={entry.id}
                    data-contract-kind="entry"
                  >
                    <Button
                      variant="chip"
                      size="xs"
                      title={entry.id}
                      selected={
                        selection?.kind === "entry" && selection.id === entry.id
                      }
                      aria-pressed={
                        selection?.kind === "entry" && selection.id === entry.id
                      }
                      onClick={() => onSelect("entry", entry.id)}
                    >
                      {entry.label}
                      {entry.default && (
                        <Text variant="caption" tone="subtle">
                          default
                        </Text>
                      )}
                    </Button>
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
          {exits.length > 0 && (
            <div className={styles.group}>
              <dt className={styles.term}>
                <Text variant="caption" tone="subtle">
                  Exits
                </Text>
              </dt>
              <dd className={styles.items}>
                <ul className={styles.chips}>
                  {exits.map((exit, index) => (
                    <li
                      key={`${index}:${exit.id}`}
                      data-contract-ref={exit.id}
                      data-contract-kind="exit"
                    >
                      <Button
                        variant="chip"
                        size="xs"
                        title={exit.id}
                        selected={
                          selection?.kind === "exit" && selection.id === exit.id
                        }
                        aria-pressed={
                          selection?.kind === "exit" && selection.id === exit.id
                        }
                        onClick={() => onSelect("exit", exit.id)}
                      >
                        {exit.label}
                      </Button>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}
