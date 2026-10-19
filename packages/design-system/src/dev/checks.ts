export interface FixtureFinding {
  readonly path: readonly string[];
  readonly message: string;
}
export type FixtureCheck = (value: unknown) => readonly FixtureFinding[];
export const object = (
  value: unknown,
): value is Readonly<Record<string, unknown>> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const field = (value: unknown, key: string): unknown =>
  object(value) ? value[key] : undefined;
const finding = (key: string, message: string): readonly FixtureFinding[] => [
  { path: [key], message },
];
export const text = (value: unknown, key: string) =>
  typeof field(value, key) === "string" &&
  (field(value, key) as string).length > 0
    ? []
    : finding(key, "Expected a non-empty string.");
export const boolean = (value: unknown, key: string) =>
  typeof field(value, key) === "boolean"
    ? []
    : finding(key, "Expected a boolean.");
export const choice = (
  value: unknown,
  key: string,
  options: readonly unknown[],
) =>
  options.includes(field(value, key))
    ? []
    : finding(key, `Expected one of ${options.join(", ")}.`);
export const count = (value: unknown, key: string) =>
  Number.isInteger(field(value, key)) && (field(value, key) as number) >= 0
    ? []
    : finding(key, "Expected a non-negative integer.");
