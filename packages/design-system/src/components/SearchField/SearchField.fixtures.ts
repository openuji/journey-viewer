import type { SearchFieldProps } from "./SearchField.js";

export type SearchFieldFixture = Readonly<Pick<SearchFieldProps, "label" | "value" | "placeholder">>;
export function createSearchFieldFixture(overrides: Readonly<Partial<SearchFieldFixture>> = {}): SearchFieldFixture {
  return { label: "Search the graph", value: "", placeholder: "Find a state or journey", ...overrides };
}
