import { FlowFrame, StateNode } from "@journey-viewer/design-system";
import type { Rect } from "@/flow/geometry";
import type { FlowInset } from "@/flow/inset";

/**
 * A hand-placed chart larger than any story canvas, for the canvas adapters' own stories: a root
 * journey down the left with one child journey open beside it, and one state selected.
 */
const frames = [
  {
    key: "root",
    rect: { x: 0, y: 0, width: 1680, height: 1320 },
    context: "outside",
  },
  {
    key: "child",
    rect: { x: 520, y: 380, width: 1080, height: 860 },
    context: "current",
  },
] as const;

const rootSteps = [
  "Sign-in required",
  "Choose provider",
  "Provider unavailable",
  "Try again later",
  "Signed in",
  "Session expired",
  "Signed out",
];
const childSteps = [
  "Select account",
  "Login",
  "Login error",
  "MFA challenge",
  "Enter code",
  "Code expired",
  "Identity consent",
  "Resource consent",
  "Consent denied",
  "Account recovery",
  "Invalid request",
  "Return to app",
];

const states: readonly { key: string; label: string; rect: Rect }[] = [
  ...rootSteps.map((label, row) => ({
    key: `root-${row}`,
    label,
    rect: { x: 80, y: 80 + row * 180, width: 200, height: 40 },
  })),
  ...childSteps.map((label, index) => ({
    key: `child-${index}`,
    label,
    rect: {
      x: 600 + (index % 3) * 330,
      y: 460 + Math.floor(index / 3) * 190,
      width: 200,
      height: 40,
    },
  })),
];
const selected = "child-4";

export const chart = { width: 1680, height: 1320 } as const;

/** Every block by its flow key, as `BrowserFlowViewport` takes them. */
export const chartBlocks: ReadonlyMap<string, Rect> = new Map([
  ...frames.map((frame) => [`frame:${frame.key}`, frame.rect] as const),
  ...states.map((state) => [`state:${state.key}`, state.rect] as const),
]);

/** The same chart in miniature, as `insetShapes` would give it. */
export const chartInset: FlowInset = {
  frames: frames.map((frame) => ({
    id: `frame:${frame.key}`,
    rect: frame.rect,
    context: frame.context,
  })),
  blocks: states.map((state) => ({
    id: `state:${state.key}`,
    rect: state.rect,
    ...(state.key === selected ? { selected: true } : {}),
  })),
};

/** The chart drawn with the design system's flow primitives, at its drawn size. */
export function ChartScene() {
  return (
    <div
      style={{
        position: "relative",
        inlineSize: chart.width,
        blockSize: chart.height,
      }}
    >
      {frames.map((frame) => (
        <FlowFrame
          key={frame.key}
          context={frame.context}
          data-flow-key={`frame:${frame.key}`}
          style={{
            position: "absolute",
            left: frame.rect.x,
            top: frame.rect.y,
            width: frame.rect.width,
            height: frame.rect.height,
          }}
        />
      ))}
      {states.map((state) => (
        <div
          key={state.key}
          data-flow-key={`state:${state.key}`}
          style={{
            position: "absolute",
            display: "grid",
            left: state.rect.x,
            top: state.rect.y,
            width: state.rect.width,
            height: state.rect.height,
          }}
        >
          <StateNode
            lines={[state.label]}
            label={state.label}
            selected={state.key === selected}
            onSelect={() => undefined}
          />
        </div>
      ))}
    </div>
  );
}
