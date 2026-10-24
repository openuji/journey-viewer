import type { SearchFieldProps } from "@/components/SearchField/SearchField";

export type SearchFieldFixture = Readonly<
  Pick<SearchFieldProps, "label" | "value" | "placeholder" | "open" | "status">
>;
export function createSearchFieldFixture(
  overrides: Readonly<Partial<SearchFieldFixture>> = {},
): SearchFieldFixture {
  return {
    label: "Search the graph",
    value: "",
    placeholder: "Find a state or journey  /",
    open: false,
    ...overrides,
  };
}
