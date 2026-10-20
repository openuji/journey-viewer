import type { UjgNode } from "@journey-viewer/ujg-jsonld";

/** Optional caller presentation, deliberately independent of screenshot paths and UJG data. */
export type TouchpointPresentation = Readonly<Record<string, Readonly<{ shortLabel?: string; color?: string }>>>;

export function touchpointLabel(node: UjgNode, presentation: TouchpointPresentation): string {
  return (Object.hasOwn(presentation, node["@id"]) ? presentation[node["@id"]]?.shortLabel : undefined)
    ?? (typeof node.label === "string" ? node.label : node["@id"]);
}

export function touchpointColor(node: UjgNode, presentation: TouchpointPresentation): string | undefined {
  return Object.hasOwn(presentation, node["@id"]) ? presentation[node["@id"]]?.color : undefined;
}
