import type { Touchpoint } from "@journey-viewer/ujg-jsonld";

/** Optional caller presentation, deliberately independent of screenshot paths and the graph. */
export type TouchpointPresentation = Readonly<
  Record<string, Readonly<{ shortLabel?: string; color?: string }>>
>;

export function touchpointLabel(
  node: Touchpoint,
  presentation: TouchpointPresentation,
): string {
  return (
    (Object.hasOwn(presentation, node.id)
      ? presentation[node.id]?.shortLabel
      : undefined) ?? node.label
  );
}

export function touchpointColor(
  node: Touchpoint,
  presentation: TouchpointPresentation,
): string | undefined {
  return Object.hasOwn(presentation, node.id)
    ? presentation[node.id]?.color
    : undefined;
}
