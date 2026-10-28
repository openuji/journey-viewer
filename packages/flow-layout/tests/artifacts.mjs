// Geometry checks for one laid-out level: the defects a drawn route must never show.
const EPS = 0.5;

const vertical = ([a, b]) => Math.abs(a.x - b.x) <= EPS;
const horizontal = ([a, b]) => Math.abs(a.y - b.y) <= EPS;
const length = ([a, b]) => Math.hypot(b.x - a.x, b.y - a.y);
const segmentsOf = (points) =>
  points.slice(1).map((point, i) => [points[i], point]);

/** Whether an axis-aligned segment passes through the open interior of a box. */
function enters([a, b], box) {
  const left = box.x + 1;
  const right = box.x + box.width - 1;
  const top = box.y + 1;
  const bottom = box.y + box.height - 1;
  if (vertical([a, b]))
    return (
      a.x > left &&
      a.x < right &&
      Math.max(a.y, b.y) > top &&
      Math.min(a.y, b.y) < bottom
    );
  return (
    a.y > top &&
    a.y < bottom &&
    Math.max(a.x, b.x) > left &&
    Math.min(a.x, b.x) < right
  );
}

/** Whether an axis-aligned segment runs along one of a box's borders. */
function along([a, b], box) {
  if (vertical([a, b]))
    return (
      (Math.abs(a.x - box.x) <= EPS ||
        Math.abs(a.x - (box.x + box.width)) <= EPS) &&
      Math.max(a.y, b.y) > box.y + EPS &&
      Math.min(a.y, b.y) < box.y + box.height - EPS
    );
  return (
    (Math.abs(a.y - box.y) <= EPS ||
      Math.abs(a.y - (box.y + box.height)) <= EPS) &&
    Math.max(a.x, b.x) > box.x + EPS &&
    Math.min(a.x, b.x) < box.x + box.width - EPS
  );
}

/**
 * Counts, over every route of a level:
 * - `diagonals`: segments that are neither horizontal nor vertical;
 * - `kinks`: legs between two bends shorter than `step`, even where other routes share the leg;
 * - `shortArrivals`: last legs after a bend, into an end the edge is travelled towards, shorter
 *   than `arrival`;
 * - `throughBoxes`: segments through a node other than the edge's own ends, or through any frame;
 * - `alongFrames`: segments running along a frame's border.
 */
export function checkLevel(input, layout, { arrival, step }) {
  const examples = [];
  const note = (text) => {
    if (examples.length < 8) examples.push(text);
  };
  const boxes = input.nodes.map((node) => ({
    node,
    ...layout.positions.get(node.id),
    width: node.width,
    height: node.height,
  }));
  const segments = new Map(
    input.edges.map((edge) => [
      edge.id,
      segmentsOf(layout.routes.get(edge.id) ?? []),
    ]),
  );
  const report = {
    diagonals: 0,
    kinks: 0,
    shortArrivals: 0,
    throughBoxes: 0,
    alongFrames: 0,
  };
  for (const edge of input.edges) {
    const list = segments.get(edge.id);
    list.forEach((segment, i) => {
      if (!vertical(segment) && !horizontal(segment)) {
        report.diagonals += 1;
        note(`diagonal in ${edge.id}`);
      }
      const interior = i > 0 && i < list.length - 1;
      if (interior && length(segment) < step - 0.01) {
        report.kinks += 1;
        note(`kink ${length(segment).toFixed(1)} in ${edge.id}`);
      }
      const arrives =
        list.length > 1 &&
        ((i === 0 && edge.backward === true) ||
          (i === list.length - 1 && edge.forward !== false));
      if (arrives && length(segment) < arrival - 0.01) {
        report.shortArrivals += 1;
        note(`arrival ${length(segment).toFixed(1)} in ${edge.id}`);
      }
      for (const box of boxes) {
        const frame = box.node.kind === "frame";
        const own = box.node.id === edge.source || box.node.id === edge.target;
        if ((frame || !own) && enters(segment, box)) {
          report.throughBoxes += 1;
          note(`${edge.id} through ${box.node.id}`);
        }
        if (frame && along(segment, box)) {
          report.alongFrames += 1;
          note(`${edge.id} along ${box.node.id}`);
        }
      }
    });
  }
  return { ...report, examples };
}
