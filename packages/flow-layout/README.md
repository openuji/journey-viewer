# @journey-viewer/flow-layout

A layered, top-to-bottom layout for one level of a flow chart, with orthogonal routes
that share corridors (metro style). You give it sized nodes and the edges between
them, and you get back node positions and one polyline per edge. Rendering is up to
you. The package has no runtime dependencies and no DOM access, and it is
deterministic.

It plays the role ELK's layered algorithm plays for one graph. Nested content is
handled the way ELK handles separate children: lay out the inner level first, then
pass the result to the outer level as a `frame`, a fixed-size box with fixed ports.
Lines meet a frame only at its ports, so no route ever crosses into nested content.

```ts
import { layoutLevel, minimumLengths } from "@journey-viewer/flow-layout";

const { width, height, positions, routes } = layoutLevel(
  {
    nodes: [
      { id: "title", kind: "header", width: 160, height: 40 },
      { id: "start", kind: "entry", width: 90, height: 22, anchor: 7 },
      { id: "sign-in", width: 120, height: 33 },
      { id: "done", width: 100, height: 33 },
      { id: "end", kind: "exit", width: 80, height: 22, anchor: 7 },
    ],
    edges: [
      { id: "e1", source: "start", target: "sign-in" },
      { id: "e2", source: "sign-in", target: "done", backward: true },
      { id: "e3", source: "done", target: "end" },
    ],
  },
  { placement: "aligned-left", cornerRadius: 8, arrowLength: 8 },
);
```

## Input

The level is drawn inside a frame whose top-left corner is the origin.

| Node `kind` | Placement |
| --- | --- |
| `header` | Pinned at (0, 0), such as the frame's title. |
| `entry` | A contact on the top border, in the first layer beside the header. Its line leaves from its bottom edge at `anchor`. |
| `exit` | A contact on the bottom border, in the last layer. Its line arrives at its top edge at `anchor`. |
| `block` (default) | An ordinary box with one contact point per side, at the centre of its top and bottom edges (aligned left: at the column's shared line). |
| `frame` | An opaque box with fixed `ports` (`side`, `x`, optional `inset`). Lines meet it only at its ports and keep clear of its border elsewhere. |

`anchor` is the contact's x relative to the node's left edge (default: the centre).
You may draw the contact elsewhere on the same vertical, such as a glyph at the top of
an entry's label, and extend the line to it. Extending a line keeps every guarantee
below.

A port's `inset` is for a mark drawn on the border at the port, such as a glyph. The
route stops that far outside the border, and the full arrival room is kept after the
inset.

Edges connect two nodes, naming a frame's port with `sourcePort` or `targetPort`.
`forward` (default `true`) and `backward` (default `false`) say in which directions an
edge is travelled; they decide which way it runs down the layers and where your
arrowheads go. Edges between the same pair of nodes share one trunk. An edge from a
node to itself is drawn as a loop beside the node's right edge. Its vertical leg is a
full `step` (below) only on a node at least that tall.

## Options

| Option | Default | Meaning |
| --- | --- | --- |
| `placement` | `"median"` | `median` puts each block under the median of its connections, for the fewest bends. `aligned-center` and `aligned-left` stack blocks in columns (Brandes–Köpf alignment) and line up their centres or left edges. |
| `cornerRadius` | `6` | Radius your renderer rounds each bend with. |
| `arrowLength` | `7` | Length of your arrowheads, from tip to base. |
| `padding` | `16` | Space inside the frame, left, right and below the content. |
| `blockSpacing` | `28` | Space between neighbouring blocks across a layer. |
| `lineSpacing` | `16` | Least space between a vertical line and a block beside it. |
| `frameLineSpacing` | `44` | Least space between a vertical line and a frame beside it. |
| `frameTrackSpacing` | `22` | Least space between a horizontal line and a frame's top or bottom border. |

## Output and guarantees

`positions` holds every node's top-left corner. `routes` holds one orthogonal
polyline per edge, from source to target. Contact points are rounded to whole pixels,
so a line between two aligned contacts is exactly straight. `layers` lists
the node ids of each layer in order, and `width` and `height` give the frame's size.

`minimumLengths({ cornerRadius, arrowLength })` returns the two lengths every layout
keeps for those sizes:

- `step = 3 × cornerRadius`: every leg between two bends is at least this long, so
  both corners keep their full radius with a straight piece between them. This holds
  even where several routes share the leg.
- `arrival = 2 × cornerRadius + arrowLength`: every last leg after a bend is at least
  this long, so an arrowhead never sits on a corner. At a port with an inset, it is
  measured after the inset.

No segment is diagonal, and no route passes through a node other than its own ends,
through a frame, or along a frame's border. These guarantees are tested over every
level of the Solid-OIDC example's disclosure scopes, for radii from 2 to 20, in all
three placements. Larger radii add room only where it is needed: channels between
layers grow with the arrival, and the horizontal rules below grow with the step.

## How it works

1. Cycle breaking (depth first, entries first) and longest-path layering. Entries
   and the header go in the first layer and exits in the last.
2. Dummy chains for long edges, one per node pair, then crossing reduction by
   barycenter and median sweeps plus transposition. Ordering looks at node pairs, not
   ports, so replacing a block with a frame of the same id (opening nested content)
   keeps every layer's order. Crossings are counted by pure functions of an ordering
   (`src/crossings.ts`), and transposition judges a swap by its gain from the two
   vertices' neighbours alone, changing the layer only when the swap pays. The cost
   follows the swap, not the level: a dense level with some 15,000 dummy vertices
   lays out in about a second.
3. Corridors: neighbouring dummy chains and the lanes beside frames merge into one
   line.
4. Preferred positions: median isotonic regression, or Brandes–Köpf columns packed
   left (`aligned-center`, `aligned-left`).
5. Straight or a full step. Every piece of a route between two layers is either
   straight or steps aside by at least `step`. The preferred positions decide which:
   - a piece they draw straight stays straight;
   - a piece they step by a full step or more keeps its side;
   - a near miss (a shorter step) becomes straight, unless another step in the same
     channel runs across it. Drawn straight, it would cut that horizontal line, so it
     joins the line as a full step instead.

   Pieces are settled closest first, each with the first of its options the rules
   still allow, falling back to a full step to the other side.
6. Positions solve one system of difference constraints, as in Brandes–Köpf
   compaction. Neighbours in a layer keep their spacing. The padding holds, and the
   header stays at the corner. A straight piece's ends share one column, and a
   step's far end lies at least `step` to its side. Longest paths over the columns
   (Bellman–Ford) give the least solution. Each column then starts at its preferred
   position, within the wider of the least layout and the preferred one. Where that
   breaks a rule, the result is the midpoint of the least solution above the start
   and the greatest one below it, so both sides of a broken rule give way equally.
7. One horizontal bus per channel. Each channel's height is the arrival room on each
   side, plus the frame clearance and port insets beside frames.

Columns sit at whole pixels, and points that must line up are compared at whole
pixels, so a straight line is exactly straight when drawn. If no option for a piece
were allowed, it would be left to the solution and could step short. That has not
happened in any tested level.

Build with `pnpm --filter @journey-viewer/flow-layout build`. The published package
ships built ESM and declarations only.
