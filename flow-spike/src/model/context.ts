import type { ViewerInteraction } from "@journey-viewer/viewer";
import type { FlowFrame, FlowScene } from "@/model/flow-scene";

/** Frames directly inside `frame`: a row's child frames, or a journey's open composites. */
const innerFrames = (frame: FlowFrame): readonly FlowFrame[] =>
  frame.content.kind === "row"
    ? frame.content.frames
    : frame.content.vertices.flatMap((v) =>
        v.kind === "frame" ? [v.frame] : [],
      );

/** `frame` and every frame nested in it, at any depth, outermost first. */
export function framesWithin(frame: FlowFrame): readonly FlowFrame[] {
  return [frame, ...innerFrames(frame).flatMap(framesWithin)];
}

/**
 * Keys of the open frames from a root down to the frame or block `key`, outermost first and ending
 * with `key`; empty when the scene does not show it.
 */
export function lineageOf(scene: FlowScene, key: string): readonly string[] {
  const visit = (
    frame: FlowFrame,
    trail: readonly string[],
  ): readonly string[] => {
    const here = [...trail, frame.key];
    if (frame.key === key) return here;
    if (
      frame.content.kind === "journey" &&
      frame.content.vertices.some((v) => v.kind !== "frame" && v.key === key)
    )
      return [...here, key];
    for (const inner of innerFrames(frame)) {
      const found = visit(inner, here);
      if (found.length > 0) return found;
    }
    return [];
  };
  for (const root of scene.frames) {
    const found = visit(root, []);
    if (found.length > 0) return found;
  }
  return [];
}

/**
 * The active journey path: the open frames `keys` name, from a root down, up to the first key that
 * is no longer open. The first root when none is, so a journey is always active.
 */
export function contextPath(
  scene: FlowScene,
  keys: readonly string[],
): readonly FlowFrame[] {
  const path: FlowFrame[] = [];
  let candidates = scene.frames;
  for (const key of keys) {
    const frame = candidates.find((f) => f.key === key);
    if (!frame) break;
    path.push(frame);
    candidates = innerFrames(frame);
  }
  return path.length > 0 ? path : scene.frames.slice(0, 1);
}

/**
 * Closes every composite open inside `frame`; `frame` itself stays open, so its own child journeys
 * are kept. Expansion follows journey identity, so other occurrences of those journeys close too,
 * exactly as with their own toggles.
 */
export function collapseWithin(
  frame: FlowFrame,
  interaction: ViewerInteraction,
): ViewerInteraction {
  const own = new Set(frame.card.children.map((child) => child["@id"]));
  const inside = new Set(
    framesWithin(frame)
      .slice(1)
      .filter((f) => f.card.kind === "composite")
      .flatMap((f) => f.card.children.map((child) => child["@id"]))
      .filter((ref) => !own.has(ref)),
  );
  return inside.size === 0
    ? interaction
    : {
        ...interaction,
        expandedJourneys: interaction.expandedJourneys.filter(
          (ref) => !inside.has(ref),
        ),
      };
}
