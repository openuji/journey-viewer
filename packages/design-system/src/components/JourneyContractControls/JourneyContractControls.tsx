import { Button } from "../Button/Button.js";
import { Text } from "../Text/Text.js";
import type { JourneyContractsProps } from "../JourneyContracts/JourneyContracts.js";
import styles from "./JourneyContractControls.module.css";

export interface ContractSelection {
  readonly kind: "entry" | "exit";
  readonly id: string;
}

export interface JourneyContractControlsProps extends JourneyContractsProps {
  readonly selection: ContractSelection | null;
  readonly onSelect: (kind: "entry" | "exit", id: string) => void;
  readonly filtered?: boolean;
}

export function JourneyContractControls({ entries, exits, selection, onSelect, filtered = false }: JourneyContractControlsProps) {
  return (
    <dl className={styles.contracts} data-filtered={filtered || undefined}>
      <div className={styles.group}>
        <dt><Text variant="caption" tone="subtle">Entries</Text></dt>
        <dd className={styles.items}>
          <ul className={styles.list}>
            {entries.map((entry, index) => (
              <li key={`${index}:${entry.id}`} data-contract-ref={entry.id} data-contract-kind="entry">
                <Button
                  variant="outline" title={entry.id}
                  selected={selection?.kind === "entry" && selection.id === entry.id}
                  aria-pressed={selection?.kind === "entry" && selection.id === entry.id}
                  onClick={() => onSelect("entry", entry.id)}
                >
                  <Text variant="caption">{entry.label}{entry.default && " (default)"}</Text>
                </Button>
              </li>
            ))}
            {entries.length === 0 && <li><Text variant="caption" tone="subtle">No entries.</Text></li>}
          </ul>
        </dd>
      </div>
      <div className={styles.group}>
        <dt><Text variant="caption" tone="subtle">Exits</Text></dt>
        <dd className={styles.items}>
          <ul className={styles.list}>
            {exits.map((exit, index) => (
              <li key={`${index}:${exit.id}`} data-contract-ref={exit.id} data-contract-kind="exit">
                <Button
                  variant="outline" title={exit.id}
                  selected={selection?.kind === "exit" && selection.id === exit.id}
                  aria-pressed={selection?.kind === "exit" && selection.id === exit.id}
                  onClick={() => onSelect("exit", exit.id)}
                ><Text variant="caption">{exit.label}</Text></Button>
              </li>
            ))}
            {exits.length === 0 && <li><Text variant="caption" tone="subtle">No exits.</Text></li>}
          </ul>
        </dd>
      </div>
    </dl>
  );
}
