import { layoutLevel, minimumLengths } from "@journey-viewer/flow-layout";
import type {
  LayoutOptions,
  LevelInput,
  LevelNode,
} from "@journey-viewer/flow-layout";

// Compiled without emitting or executing these deliberately invalid writes.
export function readonlyContract(
  input: LevelInput,
  node: LevelNode,
  options: LayoutOptions,
): void {
  // @ts-expect-error input collections are readonly
  input.nodes.push(node);
  // @ts-expect-error node sizes are readonly
  node.width = 0;
  // @ts-expect-error frame ports are readonly
  node.ports?.pop();
  // @ts-expect-error options are readonly
  options.cornerRadius = 0;
  // @ts-expect-error the guaranteed lengths are readonly
  minimumLengths(options).step = 0;

  const layout = layoutLevel(input, options);
  // @ts-expect-error positions are a readonly map
  layout.positions.set(node.id, { x: 0, y: 0 });
  // @ts-expect-error routes are readonly polylines
  layout.routes.get(node.id)?.push({ x: 0, y: 0 });
  // @ts-expect-error points are readonly
  layout.positions.get(node.id)!.x = 0;
  // @ts-expect-error layers are readonly
  layout.layers[0]?.push(node.id);
  // @ts-expect-error the size is readonly
  layout.width = 0;
}
