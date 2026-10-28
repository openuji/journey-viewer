import type { CSSProperties, ReactNode } from "react";
import type { Rect } from "@/layout/geometry";
import type {
  CardBox,
  Connector as ConnectorBox,
  FlowLayout,
} from "@/layout/compose";
import type {
  FlowCard,
  FlowContract,
  FlowStateVertex,
} from "@/model/flow-scene";
import type { FlowDetail, FlowHighlight } from "@/model/presentation";
import { CompositeCard } from "@/components/primitives/CompositeCard/CompositeCard";
import { ContractGlyph } from "@/components/primitives/ContractGlyph/ContractGlyph";
import { Connector } from "@/components/primitives/Connector/Connector";
import { RouteOverlay } from "@/components/flow/RouteOverlay/RouteOverlay";
import { activeStrokes } from "@/layout/strokes";
import { StateNode } from "@/components/primitives/StateNode/StateNode";
import styles from "@/components/flow/FlowScene/FlowScene.module.css";

export type FlowSelectable =
  | Readonly<{ kind: "state"; vertex: FlowStateVertex }>
  | Readonly<{ kind: "card"; card: FlowCard }>
  | Readonly<{ kind: "contract"; contract: FlowContract }>;

export interface FlowSceneProps {
  readonly layout: FlowLayout;
  readonly detail: FlowDetail;
  readonly highlight: FlowHighlight;
  /** The active journey's frame and every frame inside it; the frames around it recede. */
  readonly current: ReadonlySet<string>;
  /** The active journey's frame, whose heading is announced as the current location. */
  readonly location: string | null;
  /** Caller-supplied touchpoint presentation for a journey; colours stay outside UJG. */
  readonly touchpointOf: (
    journeyRef: string,
  ) => Readonly<{ label: string; color?: string }> | undefined;
  /** A screen action for states with a mapped screenshot. */
  readonly screenOf?: (
    vertex: FlowStateVertex,
  ) => Readonly<{ label: string; onOpen: () => void }> | undefined;
  readonly onSelect: (item: FlowSelectable) => void;
  readonly onToggle: (card: FlowCard) => void;
  /** Hover or keyboard focus activates a block, so its routes show without selecting it. */
  readonly onActivate?: (item: FlowSelectable | null) => void;
}

const label = (node: { readonly label?: unknown; readonly "@id": string }) =>
  typeof node.label === "string" ? node.label : node["@id"];

const box = (rect: {
  x: number;
  y: number;
  width: number;
  height: number;
}): CSSProperties => ({
  left: rect.x,
  top: rect.y,
  width: rect.width,
  height: rect.height,
});

/**
 * Presentational rendering of a composed flow: frames, then connectors, then blocks. Geometry,
 * highlights and detail arrive as data; selection and disclosure leave as callbacks.
 */
export function FlowScene({
  layout,
  detail,
  highlight,
  current,
  location,
  touchpointOf,
  screenOf,
  onSelect,
  onToggle,
  onActivate,
}: FlowSceneProps) {
  const cardTouchpoint = (card: CardBox) =>
    touchpointOf(
      (card.card.kind === "composite"
        ? (card.card.children[0] ?? card.card.journey)
        : card.card.journey)["@id"],
    );
  const connectorTitle = (connector: ConnectorBox) => {
    if (connector.kind === "association") return "Entry state";
    const transitions = [
      ...(connector.bundle?.forward ?? []),
      ...(connector.bundle?.backward ?? []),
    ];
    return transitions.map((t) => label(t.node)).join("\n");
  };
  // One list in reading order (top to bottom, then left to right), so Tab follows the flow.
  const blocks: {
    key: string;
    rect: Rect;
    item: FlowSelectable;
    render: () => ReactNode;
  }[] = [
    ...layout.cards.map((card) => ({
      key: `card:${card.key}`,
      rect: card.rect,
      item: { kind: "card" as const, card: card.card },
      render: () => {
        const tone = highlight.related.get(card.key);
        const tp = cardTouchpoint(card);
        return (
          <CompositeCard
            className={styles.fill}
            title={card.title}
            caption={card.caption}
            {...(tp ? { touchpoint: tp } : {})}
            toggle={card.card.toggle}
            heading={card.heads}
            location={card.heads && card.key === location}
            selected={highlight.selected.has(card.key)}
            {...(tone ? { tone } : {})}
            onSelect={() => onSelect({ kind: "card", card: card.card })}
            onToggle={() => onToggle(card.card)}
          />
        );
      },
    })),
    ...layout.states.map((state) => ({
      key: `state:${state.key}`,
      rect: state.rect,
      item: { kind: "state" as const, vertex: state.vertex },
      render: () => {
        const tone = highlight.related.get(state.key);
        const screen = screenOf?.(state.vertex);
        const tp = touchpointOf(state.vertex.journey["@id"]);
        return (
          <StateNode
            className={styles.fill}
            lines={state.lines}
            label={label(state.vertex.node)}
            selected={highlight.selected.has(state.key)}
            {...(tone ? { tone } : {})}
            {...(screen
              ? {
                  screen: {
                    ...screen,
                    ...(tp?.color ? { color: tp.color } : {}),
                  },
                }
              : {})}
            outgoing={detail.outgoingMarkers ? state.vertex.outgoing : 0}
            onSelect={() => onSelect({ kind: "state", vertex: state.vertex })}
          />
        );
      },
    })),
    ...layout.contracts.map((contract) => ({
      key: `contract:${contract.key}`,
      rect: contract.rect,
      item: { kind: "contract" as const, contract: contract.contract },
      render: () => (
        <ContractGlyph
          className={styles.fill}
          kind={contract.contract.kind}
          isDefault={contract.contract.isDefault}
          lines={contract.lines}
          label={label(contract.contract.node)}
          selected={highlight.selected.has(contract.key)}
          onSelect={() =>
            onSelect({ kind: "contract", contract: contract.contract })
          }
        />
      ),
    })),
  ];
  // Clicking a connector selects the block it leaves from; the inspector then lists its transitions.
  const sources = new Map<string, FlowSelectable>([
    ...layout.states.map(
      (s) => [s.key, { kind: "state", vertex: s.vertex }] as const,
    ),
    ...layout.cards.map(
      (c) => [c.key, { kind: "card", card: c.card }] as const,
    ),
    ...layout.contracts.map(
      (c) => [c.key, { kind: "contract", contract: c.contract }] as const,
    ),
  ]);
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
        <div
          key={frame.key}
          className={styles.frame}
          data-flow-key={`frame:${frame.key}`}
          data-context={current.has(frame.key) ? "current" : "outside"}
          style={box(frame.rect)}
        />
      ))}
      <svg
        className={styles.lines}
        width={layout.width}
        height={layout.height}
        aria-hidden="true"
      >
        {ordered.map((connector) => {
          const transitions = [
            ...(connector.bundle?.forward ?? []),
            ...(connector.bundle?.backward ?? []),
          ];
          const route = highlight.routes.get(connector.key);
          return (
            <Connector
              key={connector.key}
              points={connector.points}
              kind={connector.kind}
              active={route !== undefined}
              // Corridors are shared, so counts appear only on the active step's routes.
              count={detail.bundleCounts && route ? transitions.length : 1}
              title={connectorTitle(connector)}
              rest={focused && !route}
              {...(sources.has(connector.from)
                ? { onSelect: () => onSelect(sources.get(connector.from)!) }
                : {})}
            />
          );
        })}
        <RouteOverlay ink={ink} boundaryMarks={detail.boundaryMarks} />
      </svg>
      {blocks
        .sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x)
        .map((block) => (
          <div
            key={block.key}
            className={styles.block}
            style={box(block.rect)}
            data-flow-key={block.key}
            onPointerEnter={() => onActivate?.(block.item)}
            onPointerLeave={() => onActivate?.(null)}
            onFocus={() => onActivate?.(block.item)}
            onBlur={() => onActivate?.(null)}
          >
            {block.render()}
          </div>
        ))}
    </div>
  );
}
