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
  touchpointOf,
  screenOf,
  onSelect,
  onToggle,
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
  const blocks: { key: string; rect: Rect; render: () => ReactNode }[] = [
    ...layout.cards.map((card) => ({
      key: `card:${card.key}`,
      rect: card.rect,
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
  const focused = highlight.connectors.size > 0;
  const ordered = [...layout.connectors].sort(
    (a, b) =>
      Number(highlight.connectors.has(a.key)) -
      Number(highlight.connectors.has(b.key)),
  );
  return (
    <div
      className={styles.scene}
      style={{ width: layout.width, height: layout.height }}
    >
      {layout.frames.map((frame) => {
        const tp = touchpointOf(
          (frame.frame.content.kind === "journey"
            ? frame.frame.content.journey
            : frame.frame.card.journey)["@id"],
        );
        return (
          <div
            key={frame.key}
            className={styles.frame}
            data-flow-key={`frame:${frame.key}`}
            data-depth={frame.depth}
            style={
              {
                ...box(frame.rect),
                ...(tp?.color ? { "--jv-touchpoint-color": tp.color } : {}),
              } as CSSProperties
            }
          />
        );
      })}
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
          const tone = highlight.connectors.get(connector.key);
          return (
            <Connector
              key={connector.key}
              points={connector.points}
              kind={connector.kind}
              arrowStart={connector.arrowStart}
              arrowEnd={connector.arrowEnd}
              {...(tone ? { tone } : {})}
              count={detail.bundleCounts ? transitions.length : 1}
              viaDefault={
                detail.boundaryMarks &&
                (connector.bundle?.forward.some((t) => t.viaDefault) ?? false)
              }
              title={connectorTitle(connector)}
              rest={focused && !tone}
              {...(sources.has(connector.from)
                ? { onSelect: () => onSelect(sources.get(connector.from)!) }
                : {})}
            />
          );
        })}
      </svg>
      {blocks
        .sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x)
        .map((block) => (
          <div
            key={block.key}
            className={styles.block}
            style={box(block.rect)}
            data-flow-key={block.key}
          >
            {block.render()}
          </div>
        ))}
    </div>
  );
}
