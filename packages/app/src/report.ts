import type { Finding } from "@journey-viewer/lint";

/** App-owned outcome of the latest read/parse/check attempt. */
export type ApplicationReport = Readonly<
  | { kind: "idle" }
  | { kind: "reading"; name: string }
  | { kind: "read-error" | "syntax-error"; name: string; message: string }
  | { kind: "checked"; name: string; findings: readonly Finding[] }
>;
