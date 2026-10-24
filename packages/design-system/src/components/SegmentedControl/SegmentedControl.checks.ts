import { object, text } from "@/dev/checks";
import type { FixtureCheck } from "@/dev/checks";

export const checkSegmentedControlFixture: FixtureCheck = (value) => {
  const options =
    object(value) && Array.isArray(value.options)
      ? (value.options as readonly unknown[])
      : undefined;
  return [
    ...text(value, "label"),
    ...text(value, "value"),
    ...(options
      ? options.flatMap((option, index) =>
          [...text(option, "value"), ...text(option, "label")].map(
            (finding) => ({
              ...finding,
              path: ["options", String(index), ...finding.path],
            }),
          ),
        )
      : [{ path: ["options"], message: "Expected an array." }]),
    ...(options &&
    object(value) &&
    !options.some((option) => object(option) && option.value === value.value)
      ? [{ path: ["value"], message: "Expected the value of a listed option." }]
      : []),
  ];
};
