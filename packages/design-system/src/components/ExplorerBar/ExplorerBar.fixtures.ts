import type { ExplorerBarTitleProps } from "./ExplorerBar.js";

export type ExplorerBarFixture = Readonly<Required<ExplorerBarTitleProps>>;
export function createExplorerBarFixture(overrides: Readonly<Partial<ExplorerBarFixture>> = {}): ExplorerBarFixture {
  return { title: "Account journeys", subtitle: "3 journeys · 12 states · 20 transitions · 4 screens", ...overrides };
}
