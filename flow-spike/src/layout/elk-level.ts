import ELK from "elkjs/lib/elk.bundled.js";
import type { ElkNode, ElkPort } from "elkjs/lib/elk.bundled.js";
import { FRAME_PAD } from "@/layout/geometry";
import type {
  LevelInput,
  LevelLayout,
  LevelNode,
  Point,
} from "@/layout/geometry";

/**
 * Measure-only baseline: ELK's layered algorithm on exactly the level input the own engine gets
 * (bundled connectors, fixed frame ports, contracts in the first and last layers). It is never
 * used by the flow canvas; it exists so the comparison is like for like.
 */
const elk = new ELK();

const portsOf = (node: LevelNode): ElkPort[] => {
  if (node.kind === "frame")
    return (node.ports ?? []).map((port) => ({
      id: `${node.id}::${port.id}`,
      x: port.x,
      y: port.side === "top" ? 0 : node.height,
      width: 0,
      height: 0,
      layoutOptions: {
        "elk.port.side": port.side === "top" ? "NORTH" : "SOUTH",
      },
    }));
  if (node.kind === "entry" || node.kind === "exit")
    return [
      {
        id: `${node.id}::anchor`,
        x: node.anchor ?? 0,
        y: node.kind === "entry" ? node.height : 0,
        width: 0,
        height: 0,
        layoutOptions: {
          "elk.port.side": node.kind === "entry" ? "SOUTH" : "NORTH",
        },
      },
    ];
  return [];
};

export const elkLevel = (input: LevelInput) => elkLayout(input, true);
/** ELK without merged edges: no shared bus segments, so no ambiguous overlaps. */
export const elkLevelUnmerged = (input: LevelInput) => elkLayout(input, false);

async function elkLayout(
  input: LevelInput,
  mergeEdges: boolean,
): Promise<LevelLayout> {
  const nodes = new Map(input.nodes.map((node) => [node.id, node]));
  const end = (id: string, port: string | undefined) => {
    const node = nodes.get(id)!;
    if (node.kind === "frame" && port) return `${id}::${port}`;
    if (node.kind === "entry" || node.kind === "exit") return `${id}::anchor`;
    return id;
  };
  const graph: ElkNode = {
    id: "level",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "DOWN",
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.layered.mergeEdges": String(mergeEdges),
      "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
      "elk.layered.cycleBreaking.strategy": "DEPTH_FIRST",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
      "elk.spacing.nodeNode": "28",
      "elk.layered.spacing.nodeNodeBetweenLayers": "28",
      "elk.spacing.edgeNode": "12",
      "elk.spacing.edgeEdge": "8",
      "elk.padding": `[top=0,left=${FRAME_PAD},bottom=0,right=${FRAME_PAD}]`,
    },
    children: input.nodes.map((node) => ({
      id: node.id,
      width: node.width,
      height: node.height,
      ports: portsOf(node),
      layoutOptions: {
        ...(node.kind === "card" || node.kind === "entry"
          ? {
              "elk.layered.layering.layerConstraint": "FIRST",
              "elk.alignment": "TOP",
            }
          : node.kind === "exit"
            ? {
                "elk.layered.layering.layerConstraint": "LAST",
                "elk.alignment": "BOTTOM",
              }
            : {}),
        ...(node.kind === "frame" ||
        node.kind === "entry" ||
        node.kind === "exit"
          ? { "elk.portConstraints": "FIXED_POS" }
          : {}),
      },
    })),
    edges: input.edges.map((edge) => ({
      id: edge.id,
      sources: [end(edge.source, edge.sourcePort)],
      targets: [end(edge.target, edge.targetPort)],
    })),
  };
  const result = await elk.layout(graph);
  const positions = new Map<string, Point>(
    (result.children ?? []).map((child) => [
      child.id,
      { x: child.x ?? 0, y: child.y ?? 0 },
    ]),
  );
  const routes = new Map<string, readonly Point[]>();
  for (const edge of result.edges ?? []) {
    const points: Point[] = [];
    for (const section of (
      edge as {
        sections?: {
          startPoint: Point;
          endPoint: Point;
          bendPoints?: Point[];
        }[];
      }
    ).sections ?? [])
      points.push(
        section.startPoint,
        ...(section.bendPoints ?? []),
        section.endPoint,
      );
    routes.set(edge.id, points);
  }
  return {
    width: result.width ?? 0,
    height: result.height ?? 0,
    positions,
    routes,
  };
}
