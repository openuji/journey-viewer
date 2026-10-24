import type { HeadingProps } from "@/components/Heading/Heading";

export type HeadingFixture = Readonly<
  Omit<
    Required<Pick<HeadingProps, "children" | "level" | "size">>,
    "children"
  > & { readonly children: string }
>;

export function createHeadingFixture(
  overrides: Readonly<Partial<HeadingFixture>> = {},
): HeadingFixture {
  return {
    children: "Journey heading",
    level: 2,
    size: "sm",
    ...overrides,
  };
}
