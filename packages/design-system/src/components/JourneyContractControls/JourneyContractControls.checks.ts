import { boolean, count, object, text } from "@/dev/checks";
import type { FixtureCheck, FixtureFinding } from "@/dev/checks";
import { checkJourneyContractsFixture } from "@/components/JourneyContracts/JourneyContracts.checks";

export const checkJourneyContractControlsFixture: FixtureCheck = (value) => {
  const selection = object(value) ? value.selection : undefined;
  const exits = object(value) && Array.isArray(value.exits) ? value.exits : [];
  const exitIds = new Set(
    exits.flatMap((exit) =>
      object(exit) && typeof exit.id === "string" ? [exit.id] : [],
    ),
  );
  const exitRoutes = object(value) ? value.exitRoutes : undefined;
  const routeFindings: readonly FixtureFinding[] =
    exitRoutes === undefined
      ? []
      : !Array.isArray(exitRoutes)
        ? [{ path: ["exitRoutes"], message: "Expected an array." }]
        : [
            ...exitRoutes.flatMap((route, index): readonly FixtureFinding[] => [
              ...text(route, "exitId").map((finding) => ({
                ...finding,
                path: ["exitRoutes", String(index), ...finding.path],
              })),
              ...count(route, "count").map((finding) => ({
                ...finding,
                path: ["exitRoutes", String(index), ...finding.path],
              })),
              ...(object(route) && route.title !== undefined
                ? text(route, "title").map((finding) => ({
                    ...finding,
                    path: ["exitRoutes", String(index), ...finding.path],
                  }))
                : []),
              ...(object(route) &&
              typeof route.exitId === "string" &&
              !exitIds.has(route.exitId)
                ? [
                    {
                      path: ["exitRoutes", String(index), "exitId"],
                      message: "Expected the id of a listed exit.",
                    },
                  ]
                : []),
            ]),
            ...exitRoutes.flatMap((route, index) =>
              object(route) &&
              typeof route.exitId === "string" &&
              exitRoutes.some(
                (candidate, candidateIndex) =>
                  candidateIndex < index &&
                  object(candidate) &&
                  candidate.exitId === route.exitId,
              )
                ? [
                    {
                      path: ["exitRoutes", String(index), "exitId"],
                      message: "Expected each exit route id once.",
                    },
                  ]
                : [],
            ),
          ];
  const valid =
    selection === null ||
    (object(value) &&
      object(selection) &&
      (selection.kind === "entry" || selection.kind === "exit") &&
      typeof selection.id === "string" &&
      Array.isArray(value[selection.kind === "entry" ? "entries" : "exits"]) &&
      (
        value[
          selection.kind === "entry" ? "entries" : "exits"
        ] as readonly unknown[]
      ).some((item) => object(item) && item.id === selection.id));
  return [
    ...checkJourneyContractsFixture(value),
    ...routeFindings,
    ...(object(value) && value.filtered !== undefined
      ? boolean(value, "filtered")
      : []),
    ...boolean(value, "open"),
    ...(valid
      ? []
      : [
          {
            path: ["selection"],
            message:
              "Expected null or a selection naming a listed contract of the same kind.",
          },
        ]),
  ];
};
