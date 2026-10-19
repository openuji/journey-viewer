export function tokenEntries(
  value: unknown,
): readonly {
  readonly path: readonly string[];
  readonly type: string;
  readonly value: unknown;
}[];
