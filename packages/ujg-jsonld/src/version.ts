/** The UJG versions this package reads: the Editor's Draft. */
export type UjgVersion = "ed";

export type UjgVersionCheck = Readonly<
  | { kind: "supported"; version: UjgVersion }
  /** No UJG context, an unknown version or several versions; lists the string contexts found. */
  | { kind: "unsupported"; contexts: readonly string[] }
>;

const versions: readonly string[] = ["ed"] satisfies readonly UjgVersion[];
const ujgContext =
  /^https:\/\/ujg\.specs\.openuji\.org\/([^/]+)\/ns\/[^/]+\.context\.jsonld$/;

/**
 * Reads the version from the document's UJG contexts, which all have to name the same one; other
 * contexts are ignored. Accepts any parsed value and inspects nothing else.
 */
export function detectUjgVersion(value: unknown): UjgVersionCheck {
  const declared =
    value !== null && typeof value === "object" && !Array.isArray(value)
      ? (value as Readonly<Record<string, unknown>>)["@context"]
      : undefined;
  const contexts = (Array.isArray(declared) ? declared : [declared]).filter(
    (context): context is string => typeof context === "string",
  );
  const named = new Set(
    contexts.flatMap((context) => ujgContext.exec(context)?.[1] ?? []),
  );
  const [version] = named;
  return named.size === 1 && version !== undefined && versions.includes(version)
    ? { kind: "supported", version: version as UjgVersion }
    : { kind: "unsupported", contexts };
}
