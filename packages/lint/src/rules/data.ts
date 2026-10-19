import type { Finding } from "../index.js";

export type ObjectValue = Readonly<Record<string, unknown>>;

export const isObject = (value: unknown): value is ObjectValue => (
  value !== null && typeof value === "object" && !Array.isArray(value)
);

/** Borrows the original array; malformed or absent collections have no entries. */
export const nodesOf = (value: unknown): readonly unknown[] => (
  isObject(value) && Array.isArray(value.nodes) ? value.nodes : []
);

export const hasType = (node: ObjectValue, type: string): boolean => (
  node["@type"] === type || (Array.isArray(node["@type"]) && node["@type"].includes(type))
);

export const hasAnyType = (node: ObjectValue, types: readonly string[]): boolean => (
  types.some((type) => hasType(node, type))
);

export const finding = (
  ruleId: string,
  path: Finding["path"],
  message: string,
): Finding => ({ ruleId, path, message });
