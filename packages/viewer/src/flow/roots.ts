import type { FlowScene } from "@/flow/scene";

/** Whether the flow draws every root journey, one below another, or one at a time. */
export type FlowRootScope = "all" | "one";

/**
 * The scene for a scope. Root journeys are independent frames that no connector joins, so showing
 * one leaves the others unlaid out. It shows the root a location starts from, else the first.
 */
export function sceneForRoots(
  scene: FlowScene,
  scope: FlowRootScope,
  startJourneyId?: string,
): FlowScene {
  if (scope === "all" || scene.frames.length < 2) return scene;
  const shown =
    scene.frames.find(
      (frame) => frame.card.occurrence.startJourneyId === startJourneyId,
    ) ?? scene.frames[0]!;
  return { ...scene, frames: [shown] };
}
