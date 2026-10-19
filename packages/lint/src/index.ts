export interface Finding {
  readonly ruleId: string;
  readonly path: readonly (string | number)[];
  readonly message: string;
}

export type Rule<Value = unknown> = (value: Value) => readonly Finding[];

/** Runs exactly the supplied rules, preserving rule and finding order. */
export function lint<Value>(value: Value, rules: readonly Rule<Value>[]): readonly Finding[] {
  return rules.flatMap((rule) => rule(value));
}
