import { projectEd } from "@/ed/project";
import type { UjgDocument } from "@/ed/types";
import type { JourneyGraph } from "@/graph";
import { detectUjgVersion } from "@/version";
import type { UjgVersion } from "@/version";

const adapters: Readonly<
  Record<UjgVersion, (document: UjgDocument) => JourneyGraph>
> = { ed: projectEd };

/**
 * Derives the journey graph through the adapter of the document's UJG version. The document must
 * have the shape that version declares: check it first, as the application does. Throws a
 * TypeError for an unsupported version; `detectUjgVersion` tells beforehand.
 */
export function projectJourneyGraph(value: unknown): JourneyGraph {
  const check = detectUjgVersion(value);
  if (check.kind === "unsupported")
    throw new TypeError(
      `Unsupported UJG version: ${check.contexts.join(", ") || "no context"}`,
    );
  return adapters[check.version](value as UjgDocument);
}
