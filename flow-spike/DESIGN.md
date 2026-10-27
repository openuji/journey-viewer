---
name: Journey Viewer
description: A quiet map of user journeys, read from canonical UJG.
colors:
  ground: "rgb(246 247 249)"
  surface: "rgb(255 255 255)"
  muted-surface: "rgb(238 241 244)"
  hover: "rgb(242 244 247)"
  ink: "rgb(26 35 51)"
  muted-ink: "rgb(95 107 124)"
  subtle-ink: "rgb(102 116 135)"
  hairline: "rgb(227 231 237)"
  hairline-strong: "rgb(185 195 208)"
  focus-blue: "rgb(47 91 211)"
  focus-blue-soft: "rgb(237 242 253)"
  on-focus-blue: "rgb(255 255 255)"
  way-in-teal: "rgb(14 133 118)"
  way-in-teal-soft: "rgb(233 246 243)"
  way-out-violet: "rgb(122 76 194)"
  way-out-violet-soft: "rgb(243 238 251)"
  touchpoint-neutral: "rgb(154 164 178)"
  category-orange: "rgb(227 138 82)"
  category-blue: "rgb(79 116 197)"
  category-violet: "rgb(139 101 200)"
  category-green: "rgb(33 160 139)"
  category-teal: "rgb(18 167 166)"
  category-gold: "rgb(197 142 48)"
  category-rose: "rgb(178 107 152)"
  warning: "rgb(154 106 18)"
  danger: "rgb(194 58 43)"
typography:
  heading-lg:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
  heading-md:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.25
  heading-sm:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.25
  card-title:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: "17px"
  caption:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.45
  code:
    fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.45
rounded:
  sm: "0.375rem"
  md: "0.4375rem"
  lg: "0.75rem"
  full: "9999rem"
spacing:
  2xs: "0.125rem"
  xs: "0.25rem"
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  xl: "1.5rem"
  2xl: "2rem"
components:
  button-solid:
    backgroundColor: "{colors.focus-blue}"
    textColor: "{colors.on-focus-blue}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0.25rem 0.5rem"
    height: "1.875rem"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0.25rem 0.5rem"
    height: "1.875rem"
  segmented-control:
    backgroundColor: "{colors.muted-surface}"
    rounded: "{rounded.md}"
    padding: "0.125rem"
  surface-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
  state-row:
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    height: "2rem"
  state-row-selected:
    backgroundColor: "{colors.focus-blue-soft}"
  state-row-incoming:
    backgroundColor: "{colors.way-in-teal-soft}"
  state-row-outgoing:
    backgroundColor: "{colors.way-out-violet-soft}"
  flow-state-node:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
  flow-composite-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.card-title}"
    rounded: "{rounded.md}"
---

# Design System: Journey Viewer

## Overview

**Creative North Star: "The Quiet Map"**

Journey Viewer reads like a well-made map: a neutral ground, thin lines and small, exact marks.
Structure carries the meaning. Colour appears only where it says something: a touchpoint's identity,
a way in, a way out, the current focus. Everything else stays ink on paper. The surface is a working
instrument for following user journeys, in an Operate register. Density is welcome when it is legible,
and decoration is not.

Depth is flat. White surfaces sit on a cool grey ground, separated by 1px hairlines, never by
shadows. Emphasis comes from soft tonal fills and 3px stripes. Floating layers (popover, lightbox)
are the only things that cast a shadow, because they are the only things that float.

The Flow view extends the same map into two dimensions. States are small white cards and transitions
are thin orthogonal lines. Nested journeys are frames that grow out of the very card that represents
them. Entries and exits are glyphs on a frame's border, never boxes. When something is selected, its
own lines carry the relation colours at full weight and every other line rests at a lighter weight in
the same colour.

**Key Characteristics:**

- Neutral ground (`rgb(246 247 249)`) with white surfaces and hairline borders.
- One accent, Focus Blue, reserved for selection and primary action.
- Relation colours with fixed meaning: Way In Teal for entries and incoming, Way Out Violet for
  exits and outgoing.
- Touchpoint identity as small dots and 3px stripes, never as large fills.
- Inter at 13px is the working size for everything a reader scans.
- Scoped light and dark themes from the same DTCG tokens.

## Colors

A restrained cool-neutral palette with three meaningful hues and a categorical set reserved for
touchpoints.

### Primary

- **Focus Blue** (`rgb(47 91 211)`; dark `rgb(162 189 255)`): selection outline and stripe, solid
  buttons, focus rings. Its soft form (`rgb(237 242 253)`) fills the selected row or node.

### Secondary

- **Way In Teal** (`rgb(14 133 118)`; dark `rgb(119 216 195)`): entry badges and glyphs, incoming
  relation stripes and arrows. Soft form `rgb(233 246 243)`.
- **Way Out Violet** (`rgb(122 76 194)`; dark `rgb(208 176 255)`): exit badges and glyphs, outgoing
  relation stripes and arrows. Soft form `rgb(243 238 251)`.

### Tertiary

- **Touchpoint categories** (orange, blue, violet, green, teal, gold, rose): assigned by the caller
  per touchpoint (`touchpoints.json`). They appear only as dots, stripes and faint frame tints.

### Neutral

- **Cool Ground** (`rgb(246 247 249)`): page and canvas background.
- **Paper** (`rgb(255 255 255)`): cards, panels, state nodes.
- **Muted Paper** (`rgb(238 241 244)`): segmented-control trough, muted surfaces, screen wells.
- **Ink** (`rgb(26 35 51)`): primary text.
- **Muted Ink** (`rgb(95 107 124)`) and **Subtle Ink** (`rgb(102 116 135)`): secondary text,
  captions, quiet controls.
- **Hairline** (`rgb(227 231 237)`) and **Strong Hairline** (`rgb(185 195 208)`): borders and
  dividers.

### Named Rules

**The Meaningful Hue Rule.** A hue appears only when it means something: focus, way in, way out, or a
touchpoint. A decorative colour is a lie on a map.

**The Readable Line Rule.** Lines that carry meaning (flow connectors and arrowheads) reach at least
3:1 against their ground in both themes. Hairlines are reserved for borders that only group content.

## Typography

**Body Font:** Inter (with `ui-sans-serif, system-ui, sans-serif`)
**Mono Font:** `ui-monospace, SFMono-Regular, Consolas, monospace` for identifiers only

**Character:** one neutral, highly legible sans at a compact working size. Hierarchy comes from
weight (400/500/600), not from size jumps.

### Hierarchy

- **Heading lg** (600, 1.5rem, 1.25): document and panel titles.
- **Heading md** (600, 1.125rem, 1.25): inspector titles.
- **Heading sm** (600, 0.875rem, 1.25): journey heads and section headings.
- **Body** (400, 0.8125rem / 13px, 1.45): state labels, rows, inspector text, flow node labels.
- **Label** (500, 0.8125rem, 1.25): controls.
- **Card title** (600, 0.8125rem, 17px): composite and journey card titles on the flow canvas.
- **Caption** (400, 0.75rem / 12px, 1.45): counts, summaries, contract labels, touchpoint captions.
- **Code** (400, 0.75rem, mono): canonical identifiers, shown only at spec detail.

### Named Rules

**The Thirteen Rule.** Anything a reader scans is set at 13px. Smaller text is reserved for captions
that qualify something already readable.

## Layout

A mobile-first app layout: an explorer column (tree or columns) and a sticky inspector (21.25rem)
beside it, stacking below 1100px or so. Rows are 2rem tall with a 1.25rem indent per nesting level.
Spacing follows a compact 4px rhythm (2, 4, 8, 12, 16, 24, 32px). Controls are 44px touch targets on
mobile and shrink to 30px from the `md` breakpoint.

The Flow canvas is a natively scrolling region at 100% scale, with an explicit Fit command, laid out
top to bottom. Frames pad their content by `lg` (16px). Layers are separated by channels that grow
with the number of routed tracks, never by a fixed gap that lines must squeeze through.

## Elevation & Depth

Flat by default, depth through tonal layering: paper on cool ground, hairline borders, soft tonal
fills for state. Shadows exist only for layers that genuinely float above the page.

### Shadow Vocabulary

- **Subtle** (`0px 1px 2px rgb(16 24 40 / 0.08)`): optional hairline lift for small controls.
- **Raised** (`0px 2px 6px rgb(16 24 40 / 0.12)`): raised surfaces such as the explorer bar.
- **Popover** (`0px 12px 32px rgb(16 24 40 / 0.12)`): search results, hover previews, context strip.
- **Lightbox** (`0px 24px 60px rgb(0 0 0 / 0.35)`): the screen lightbox over its scrim.

### Named Rules

**The Paper Map Rule.** Flow nodes and frames never cast shadows. The chart is printed on the ground,
and only overlays float above it.

## Shapes

Gently rounded rectangles throughout: 6px (`sm`) for controls, 7px (`md`) for rows and flow nodes, and
12px (`lg`) for panels and cards. Full radius is reserved for dots, pills and contract glyphs. Borders
are 1px hairlines and focus rings are 2px. Flow connectors are orthogonal 1.3px lines with 6px rounded
corners. Active routes are 2.4px with small filled arrowheads (7 × 3.6px), halved where two directions
share a line. Entries are circles and exits are rings with a centre (an ending, not a failure): the
only round shapes on the chart apart from touchpoint dots.

## Components

### Buttons

- **Shape:** gently rounded (6px).
- **Solid:** Focus Blue fill with white label, used for the single primary action.
- **Outline / ghost:** paper or transparent with Muted Ink label and a hairline border. These are the
  default for toolbars and canvas controls.
- **Hover / Focus:** hover takes the Hover tint (`rgb(242 244 247)`). Focus shows a 2px Focus Blue
  ring.

### Segmented control

A Muted Paper trough (7px radius, 2px inset) holding pressed and unpressed options. It is the
pattern for view switches (Tree | Columns | Flow) and detail switches (Stakeholder | Spec).

### Cards / Containers

- **Corner Style:** 12px.
- **Background:** Paper on Cool Ground. Muted Paper for wells.
- **Shadow Strategy:** none at rest (see The Paper Map Rule).
- **Border:** 1px Hairline.
- **Internal Padding:** 8–16px.

### State row (signature)

A 2rem row with a 3px stripe at its leading edge. The stripe and a soft fill carry the relation:
Focus Blue when selected, Way In Teal for incoming, Way Out Violet for outgoing, a teal-to-violet
gradient for both. A phone glyph opens the state's screen. Counts read as `→5`.

### Flow components (as built in the spike)

- **State node:** a paper card (7px radius, 1px hairline) with a 13px label. Touchpoint identity
  lives on the card and frame of its journey, not on every node. It takes the same relation fills
  and stripes as the state row.
- **Composite card:** a 600-weight title, a caption naming the child journey after a touchpoint dot,
  and the tree's chevron as its toggle (30px target, turned down when open). When open, the same card
  becomes the top-left corner of its frame; nothing else changes about it.
- **Frame:** a paper region with a 1px border tinted by the touchpoint colour. It has no shadow and
  no separate header.
- **Contract glyphs:** entry (Way In Teal circle, filled when default) on the frame's top border, and
  exit (Way Out Violet ring with a centre) on its bottom border. Captions are plain text with no box.
- **Connector:** one orthogonal line per pair of blocks. Each state and composite has exactly one
  contact point per side, at the centre of its top and bottom edges; returns leave from the top and
  arrive at the bottom. Like a metro map, connectors that run side by side share one corridor (a
  vertical trunk, one horizontal bus per channel between layers), drawn at rest without arrowheads.
  Activating a step (hover, focus or selection) draws its routes on top, 2.4px and centred on the
  corridor: arrivals in Way In Teal, departures in Way Out Violet. Only where an arrival and a
  departure share a stretch does that stretch split in two within the same 2.4px. Each route keeps
  to its half on the same side of its travel through every corner, so the halves run parallel and
  never cross along the line. Where routes join or part, the halves are chosen to leave the fewest
  crossings. Each arrowhead there is a half-arrowhead on its route's half, and every line ends at its
  arrowhead's base. Routes that meet at one point from one direction share one arrowhead. An active
  entry or exit also lights the parent's connectors at its port. At spec detail, active routes carry a
  12px `×N` chip when they bundle several transitions, and arrivals through a default entry have a
  hollow arrowhead. Clicking a line selects where it starts.
- **Key:** a toolbar disclosure listing only the marks visible at the current detail.

## Do's and Don'ts

### Do:

- **Do** take every colour from the `--jv-*` custom properties so both themes follow automatically.
- **Do** keep Focus Blue for selection and the one primary action per view.
- **Do** mark relations with stripes plus soft fills (3px stripe, `*-soft` background), as the state
  row does.
- **Do** set scanned text at 13px Inter and qualifiers at 12px.
- **Do** give meaningful lines and glyphs at least 3:1 contrast against their ground in light and
  dark.

### Don't:

- **Don't** draw two lines between the same pair of blocks, or two parallel lines where one corridor
  can carry both. Activation, not extra ink, tells routes apart.
- **Don't** offset a route that shares nothing, or give a block extra contact points for returns.
  Lines stay on the centre line of the corridor and meet blocks at one point per side.
- **Don't** place halves by screen direction (always right, always down): on a line that turns both
  ways they swap sides at the corners and cross. Sides follow the direction of travel.
- **Don't** put entries or exits in boxes or pills. They are glyphs on a border.
- **Don't** suggest depth with offset outlines (stacked-card edges); state lives in the toggle.
- **Don't** add shadows to flow nodes, frames or cards at rest.
- **Don't** use a touchpoint colour as a large fill. Dots, stripes and faint tints only.
- **Don't** hard-code hex values in component styles.
