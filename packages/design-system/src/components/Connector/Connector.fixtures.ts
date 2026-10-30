import type { ConnectorProps } from "@/components/Connector/Connector";

export type ConnectorFixture = Readonly<
  Required<Pick<ConnectorProps, "kind" | "points" | "rest">> &
    Pick<ConnectorProps, "title">
>;

export function createConnectorFixture(
  overrides: Readonly<Partial<ConnectorFixture>> = {},
): ConnectorFixture {
  return {
    kind: "bundle",
    points: [
      { x: 40, y: 8 },
      { x: 40, y: 40 },
      { x: 120, y: 40 },
      { x: 120, y: 72 },
    ],
    rest: false,
    title: "Continue",
    ...overrides,
  };
}
