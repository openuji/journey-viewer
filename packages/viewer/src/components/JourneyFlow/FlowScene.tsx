import type { CSSProperties, ReactNode } from "react";
import {
  CompositeCard,
  Connector,
  ContractGlyph,
  FlowFrame,
  RouteOverlay,
  StateNode,
} from "@journey-viewer/design-system";
import type { ViewerTarget } from "@/navigation";
import type { FlowLayout } from "@/flow/compose";
import type { Rect } from "@/flow/geometry";
import type { FlowHighlight } from "@/flow/highlight";
import type { FlowCard, FlowStateVertex } from "@/flow/scene";
import { activeStrokes } from "@/flow/strokes";
import styles from "@/components/JourneyFlow/JourneyFlow.module.css";

type Touchpoint = Readonly<{ label: string; color?: string }>;

export interface FlowSceneProps {
  readonly layout: FlowLayout;
  readonly highlight: FlowHighlight;
  /** The active journey's frame and every frame inside it; the frames around it recede. */
  readonly current: ReadonlySet<string>;
  /** The active journey's frame, whose heading is announced as the current journey. */
  readonly location: string | null;
  readonly touchpointOf: (journeyId: string) => Touchpoint | undefined;
  /** Journeys the touchpoint filter leaves out. */
  readonly filtered: (journeyId: string) => boolean;
  /** A screen action for states with a mapped screenshot. */
  readonly screenOf: (
    vertex: FlowStateVertex,
  ) => Readonly<{ label: string; onOpen: () => void }> | undefined;
  readonly onSelect: (target: ViewerTarget, block: string) => void;
  readonly onToggle: (card: FlowCard) => void;
  /** Hover or keyboard focus activates a block, so its routes show without selecting it. */
  readonly onActivate: (target: ViewerTarget | null) => void;
}

const box = (rect: Rect): CSSProperties => ({
  left: rect.x,
  top: rect.y,
  width: rect.width,
  height: rect.height,
});

/**
 * Presentational rendering of a composed flow: frames, then connectors, then blocks. Geometry and
 * highlights arrive as data; selection and disclosure leave as callbacks.
 */
export function FlowScene({
  layout,
  highlight,
  current,
  location,
  touchpointOf,
  filtered,
  screenOf,
  onSelect,
  onToggle,
  onActivate,
}: FlowSceneProps) {
  // One list in reading order (top to bottom, then left to right), so Tab follows the flow.
  const blocks: {
    key: string;
    rect: Rect;
    journeyId: string;
    target: ViewerTarget;
    render: () => ReactNode;
  }[] = [
    ...layout.cards.map((card) => ({
      key: `card:${card.key}`,
      rect: card.rect,
      journeyId: card.card.journeyId,
      target: card.card.target,
      render: () => {
        const tone = highlight.related.get(card.key);
        const touchpoint = touchpointOf(card.card.touchpointJourneyId);
        return (
          <CompositeCard
            className={styles.fill}
            title={card.title}
            caption={card.caption}
            {...(touchpoint ? { touchpoint } : {})}
            toggle={card.card.toggle}
            heading={card.heads}
            current={card.heads && card.key === location}
            selected={highlight.selected.has(card.key)}
            {...(tone ? { tone } : {})}
            onSelect={() => onSelect(card.card.target, `card:${card.key}`)}
            onToggle={() => onToggle(card.card)}
          />
        );
      },
    })),
    ...layout.states.map((state) => ({
      key: `state:${state.key}`,
      rect: state.rect,
      journeyId: state.vertex.journeyId,
      target: state.vertex.target,
      render: () => {
        const tone = highlight.related.get(state.key);
        const screen = screenOf(state.vertex);
        const color = touchpointOf(state.vertex.journeyId)?.color;
        return (
          <StateNode
            className={styles.fill}
            lines={state.lines}
            label={state.vertex.label}
            selected={highlight.selected.has(state.key)}
            {...(tone ? { tone } : {})}
            {...(screen
              ? { screen: { ...screen, ...(color ? { color } : {}) } }
              : {})}
            onSelect={() => onSelect(state.vertex.target, `state:${state.key}`)}
          />
        );
      },
    })),
    ...layout.contracts.map((contract) => ({
      key: `contract:${contract.key}`,
      rect: contract.rect,
      journeyId: contract.contract.journeyId,
      target: contract.contract.target,
      render: () => (
        <ContractGlyph
          className={styles.fill}
          kind={contract.contract.kind}
          isDefault={contract.contract.isDefault}
          lines={contract.lines}
          label={contract.contract.label}
          selected={highlight.selected.has(contract.key)}
          onSelect={() =>
            onSelect(contract.contract.target, `contract:${contract.key}`)
          }
        />
      ),
    })),
  ];
  // Clicking a connector selects the block it leaves from; the inspector then lists its transitions.
  const sources = new Map(
    blocks.map((block) => [block.key.slice(block.key.indexOf(":") + 1), block]),
  );
  const focused = highlight.routes.size > 0;
  const ink = activeStrokes(layout.connectors, highlight.routes);
  const ordered = [...layout.connectors].sort(
    (a, b) =>
      Number(highlight.routes.has(a.key)) - Number(highlight.routes.has(b.key)),
  );
  return (
    <div
      className={styles.scene}
      style={{ width: layout.width, height: layout.height }}
    >
      {layout.frames.map((frame) => (
        <FlowFrame
          key={frame.key}
          className={styles.frame}
          context={current.has(frame.key) ? "current" : "outside"}
          style={box(frame.rect)}
          data-flow-key={`frame:${frame.key}`}
        />
      ))}
      <svg
        className={styles.lines}
        width={layout.width}
        height={layout.height}
        aria-hidden="true"
      >
        {ordered.map((connector) => {
          const source = sources.get(connector.from);
          const title =
            connector.kind === "association"
              ? "Entry state"
              : [
                  ...(connector.bundle?.forward ?? []),
                  ...(connector.bundle?.backward ?? []),
                ]
                  .map((transition) => transition.label)
                  .join("\n");
          return (
            <Connector
              key={connector.key}
              points={connector.points}
              kind={connector.kind}
              title={title}
              rest={focused && !highlight.routes.has(connector.key)}
              {...(source
                ? { onSelect: () => onSelect(source.target, source.key) }
                : {})}
            />
          );
        })}
        <RouteOverlay ink={ink} />
      </svg>
      {blocks
        .sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x)
        .map((block) => (
          <div
            key={block.key}
            className={styles.block}
            style={box(block.rect)}
            data-flow-key={block.key}
            data-filtered={filtered(block.journeyId) || undefined}
            onPointerEnter={() => onActivate(block.target)}
            onPointerLeave={() => onActivate(null)}
            onFocus={() => onActivate(block.target)}
            onBlur={() => onActivate(null)}
          >
            {block.render()}
          </div>
        ))}
    </div>
  );
}
