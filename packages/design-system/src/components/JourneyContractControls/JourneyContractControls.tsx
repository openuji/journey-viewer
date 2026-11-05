import { useId } from "react";
import { Button } from "@/components/Button/Button";
import { Icon } from "@/components/Icon/Icon";
import { Text } from "@/components/Text/Text";
import type { JourneyContractsProps } from "@/components/JourneyContracts/JourneyContracts";
import styles from "@/components/JourneyContractControls/JourneyContractControls.module.css";

export interface ContractSelection {
  readonly kind: "entry" | "exit";
  readonly id: string;
}

export interface JourneyExitRouteMark {
  readonly exitId: string;
  readonly count: number;
  readonly title?: string;
}

export interface JourneyContractControlsProps extends JourneyContractsProps {
  readonly selection: ContractSelection | null;
  readonly onSelect: (kind: "entry" | "exit", id: string) => void;
  /** Whether the entry/exit chips are shown below the summary toggle. */
  readonly open: boolean;
  readonly onToggle: () => void;
  readonly filtered?: boolean;
  /** Routes from the active state to this journey's exit contracts. */
  readonly exitRoutes?: readonly JourneyExitRouteMark[];
}

const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

function ExitRouteMark({
  count,
  title,
}: Readonly<{
  count: number;
  title?: string;
}>) {
  if (count <= 0) return null;
  return (
    <span className={styles.routeMark} title={title}>
      <Text variant="caption" tone="exit" weight="semibold" aria-hidden="true">
        →{count}
      </Text>
    </span>
  );
}

const routeDescription = (
  count: number,
  destination: "journey exits" | "this exit",
) =>
  `${plural(count, "transition", "transitions")} from the active state to ${destination}`;

export function JourneyContractControls({
  entries,
  exits,
  selection,
  onSelect,
  open,
  onToggle,
  filtered = false,
  exitRoutes = [],
}: JourneyContractControlsProps) {
  const descriptionPrefix = useId();
  const summary = `${plural(entries.length, "entry", "entries")} · ${exits.length ? plural(exits.length, "exit", "exits") : "no exits"}`;
  const exitIds = new Set(exits.map((exit) => exit.id));
  const routesByExit = new Map<string, JourneyExitRouteMark>();
  for (const route of exitRoutes) {
    if (
      route.count > 0 &&
      exitIds.has(route.exitId) &&
      !routesByExit.has(route.exitId)
    )
      routesByExit.set(route.exitId, route);
  }
  const routes = [...routesByExit.values()];
  const exitRouteCount = routes.reduce(
    (total, route) => total + route.count,
    0,
  );
  const exitRouteTitle =
    routes
      .map((route) => route.title)
      .filter((title): title is string => Boolean(title))
      .join("\n\n") || undefined;
  return (
    <div className={styles.contracts} data-filtered={filtered || undefined}>
      <Button
        variant="ghost"
        size="xs"
        className={styles.toggle}
        aria-expanded={open}
        aria-describedby={
          exitRouteCount > 0 ? `${descriptionPrefix}-summary` : undefined
        }
        data-open={open || undefined}
        onClick={onToggle}
      >
        <Icon name="chevron" />
        <Text variant="caption" tone="subtle">
          {summary}
        </Text>
        <ExitRouteMark
          count={exitRouteCount}
          {...(exitRouteTitle ? { title: exitRouteTitle } : {})}
        />
      </Button>
      {exitRouteCount > 0 && (
        <span id={`${descriptionPrefix}-summary`} className={styles.hidden}>
          {routeDescription(exitRouteCount, "journey exits")}
        </span>
      )}
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
                  {exits.map((exit, index) => {
                    const route = routesByExit.get(exit.id);
                    const descriptionId = `${descriptionPrefix}-exit-${index}`;
                    return (
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
                            selection?.kind === "exit" &&
                            selection.id === exit.id
                          }
                          aria-pressed={
                            selection?.kind === "exit" &&
                            selection.id === exit.id
                          }
                          aria-describedby={route ? descriptionId : undefined}
                          onClick={() => onSelect("exit", exit.id)}
                        >
                          {exit.label}
                          <ExitRouteMark
                            count={route?.count ?? 0}
                            {...(route?.title ? { title: route.title } : {})}
                          />
                        </Button>
                        {route && (
                          <span id={descriptionId} className={styles.hidden}>
                            {routeDescription(route.count, "this exit")}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}
