# Journey Viewer design system

Readonly presentation components, DTCG design tokens, and compiled CSS. React is
the only runtime peer. Components have no UJG, lint, viewer, or application
dependency and perform no graph queries, checking, file access, or DOM effects.

```tsx
import { JourneyCard, StateRow } from "@journey-viewer/design-system";
import "@journey-viewer/design-system/styles.css";

<section data-jv-theme="light">
  <JourneyCard title="Account access" count="4 states">
    <StateRow label="Choose a method" selected={selected} onSelect={onSelect} />
  </JourneyCard>
</section>
```

Callers supply selection/expansion snapshots and callbacks. `StateRow` does not
own interaction state. Nested content is an explicit child slot, with no graph
traversal or hidden hierarchy data. Counts and labels are caller-provided.
`StateSummary` is the separate presentation component for static hierarchies. Its
readonly contract contains `label`, `entryCount`, `directExitCount`, and nested
`children`. It always renders supplied children and accepts no selection,
expansion, filtering, callback, or mode props. `StateRow` is the controlled row
ported from the original hierarchy: a composite with `onToggle` renders a
disclosure button, and a composite without it renders a decorative caret that is
accented while `expanded` (columns use this). `tone` (`active`, `incoming`,
`outgoing`, `both`, `dim`) and `marks` (`{ incoming, outgoing, title? }`) present
the caller's relation to the active state, with an accessible explanation of the
marks; `selected` highlights the whole row. `description` shows faint secondary
text (hidden below `md`), `crossing` a touchpoint dot, and `actions` caller
controls such as `ScreenAction`, the phone button. Its optional `notice` content
slot stays visible independently of disclosure; `children` appear only while
expanded. Callers supply any empty-content message and decide whether a
disclosure control is meaningful.

## Primitive ownership

| Export | Owns |
| --- | --- |
| `Button` | Single native button implementation, explicit variants (`solid`, `outline`, `ghost`, `row`, `bare`, `pill`, `segment`, `chip`, `panel`) and sizes (`xs`, `sm`, `md`), focus, hover, disabled and selected styling, mobile hit areas. Native button attributes pass through; the default type is `button`. Selection styling and ARIA semantics are explicit caller choices. |
| `IconButton` | Accessible icon-only contract and icon layout; composes `Button`. Supply the required `label` and `icon`. |
| `Icon` | Decorative chevron, phone, expand/collapse-all, reset, previous/next and close glyphs; the enclosing control supplies the name. |
| `SegmentedControl` | A labeled group of mutually exclusive pressed `segment` buttons, such as Tree/Columns. |
| `SearchField` | Visually labeled-by-name native search input with a caller-controlled result popover (`open`, `status`, `SearchResult` children). Enter submits; Escape clears and leaves the field through the caller. |
| `Heading` | Heading typography. Required `level` (1–6) is independent of visual `size` (`xs`, `sm`, `md`, `lg`). |
| `Text` | Body, label, caption and code roles; default/muted/subtle/entry/exit/accent tones; optional `weight`. Native `span`, `p`, `strong`, or `code`. |
| `Badge` | Non-interactive compact labels/counts; composes `Surface` and `Text`. Use `Button` for interactive chips. |
| `Surface` | Background/border/radius/elevation; explicit native element, default/muted tone, sm/lg/full radius and optional raised appearance. |

Hierarchy compositions are `ExplorerBar` (with `ExplorerBarTitle` and
`ExplorerBarSpacer`), `TouchpointDot`, `JourneyHead`, `JourneyCard`, `JourneyNest`,
`StateRow`, `StateSummary`, `JourneyContracts`, and `JourneyContractControls`. They reuse these primitives
and add arrangement and distinct journey decoration. A dot accepts a presentation color directly; the library has no
example-specific palette or state-ID conventions. A standalone dot is named;
`decorative` hides it from assistive technology. `JourneyHead` sets this when it
also renders the visible touchpoint caption. Its optional readonly `touchpoints`
array takes `{ id, label, color? }` items and renders a named dot for each. The
original singular captioned `touchpoint` remains supported. `crumb` adds column
context above the title, `matched` tints the head for a filter match, and
`filtered` dims it. `JourneyNest` indents nested-journey content beneath a
composite with a touchpoint guide line, solid when `matched`. `ExplorerBar` is
the toolbar header (sticky from `md`, marked with `data-explorer-bar`).

`ScreenImage` renders an image at its natural ratio from explicit `source`,
`label`, `status` (`loading`, `ready`, `unavailable`), `fit` (`width` fills the
container; `height` is bounded by `--jv-screen-image-height` and the viewport
width) and required load/error callbacks. The caller owns load status; the
component has no state or effects. `ScreenThumbnail` is the inspector's compact
screenshot with an “Enlarge” hint; without `onOpen` it is not interactive.
`ScreenPreview` is the floating, `aria-hidden` hover card (title, context, dot);
its caller supplies placement through `style` and may pass a `ref` for
measurement. `ScreenLightbox` owns only modal content: the phone-sized image slot
and a caption with dot, title, context, position and previous/next/close icon
buttons. The browser/caller owns the actual dialog lifecycle, keyboard handling
and focus. Its heading is level 2 within the independent dialog; it does not
inherit a hierarchy heading level. All four have pure
fixtures, separate checks and stories; no UJG IDs or asset path conventions enter
the design system.

`JourneyContracts` receives readonly `entries` and `exits` arrays of `{ id, label }`.
An entry may set `default: true`; the component never chooses a default. It renders
noninteractive lists using `Badge` and `Text`, grouped by native description-list
terms. Each visible “Entries”/“Exits” caption occurs once without a repeated ARIA
label. Missing lists are represented by explicit empty arrays. Its fixture checker
also detects conflicting defaults. Rendering keys identify reference occurrences
(`index:id`) so repeated source references stay visible; data identity checking
belongs to the independent lint rules.

Components live in `src/components/Component/Component.tsx`,
`Component.module.css`, and `Component.stories.tsx`, with colocated fixture and
check files. Public readonly contracts live beside their component. Extend the
owning primitive when introducing a shared treatment; keep composition CSS for
layout and distinct decoration.

`Text` inherits its parent color when `tone="default"`, including button hover,
active and selected colors. Explicit tones retain their semantic colors. `Badge`
forwards native span attributes. Its optional `label` supplies visually hidden
explanatory text and hides the visual glyphs from the accessibility tree; provide
a complete spoken label, including any count. An explicit `title` overrides its
tooltip without replacing that accessible explanation.

## Tokens and themes

Edit `tokens/foundation.tokens.json` and `tokens/themes/*.tokens.json`.
`scripts/token-data.mjs` explicitly selects production themes. Translation is pure
in `scripts/tokens.mjs`; reading/writing stays in the CLI scripts. Token checking
is a separate operation. The package build explicitly checks before generating.

The semantic CSS-variable contract is the explicit readonly list in
`tokens/semantic-keys.mjs`. Checking and Tailwind bridge generation use this list,
independent of theme order or values. Foundation authoring/value checks run once;
each theme is checked independently against the same required keys.

The supported [DTCG 2025.10](https://www.designtokens.org/tr/2025.10/format/) subset
is named groups, `$type` (including group inheritance), `$value`, `$description`,
and whole-token `{path.to.token}` aliases, including aliases inside shadow values.
Used types are sRGB `color`, px/rem `dimension`, `fontFamily` arrays/strings,
numeric `fontWeight`/`number`, ms/s `duration`, and a single `shadow`. Token/group
names use lowercase letters, digits and hyphens. Unsupported authoring properties
and incompatible aliases produce independent findings. This package does not
claim to implement the entire DTCG resolver or format.

Only complete `{path.to.token}` strings are interpreted as aliases. Literal font
names may contain braces or CSS punctuation; named fonts are quoted when emitted,
while CSS generic families remain unquoted. Complete alias syntax is reserved for
references. Foundation tokens stay build-time values and are never emitted as
`--jv-foundation-*` variables; only semantic theme variables are public.

The initial light palette preserves the source hierarchy colors; subtle text is
slightly darker for readability. This is recorded as a deliberate presentation
adjustment, alongside the larger mobile hit areas.

Generated output is ignored by git. It provides `--jv-*` scoped variables and a
Tailwind v4 bridge using `@theme inline`. Utilities such as `p-space-sm`,
`w-size-control-sm`, `bg-accent`, `font-sans`, and `text-caption` consume the same
variables as CSS modules. Default Tailwind theme values are reset. Breakpoints
are the shared build-time constants `md: 53.75rem` and `lg: 68.75rem`; modules use
`@reference` and `@variant` to consume those same values.

Set `data-jv-theme="light"` or `"dark"` on a container. Each boundary declares its
semantic variables, background, foreground and font, so themes coexist and nest.
Adding a theme means adding its DTCG values and explicitly including it in token
generation; components need no changes. The alternate font/color/spacing theme
under `.storybook` demonstrates this and stays outside production output.

The default is mobile-first. Buttons have 44px minimum mobile/coarse-pointer hit
areas, retaining 30px/36px compact sizes above `md` for fine pointers. Long labels
wrap. Font declarations have fallbacks; font asset loading belongs to the host.

## Builds and development

From the workspace root:

```sh
pnpm check:tokens
pnpm generate:tokens
pnpm check:fixtures
pnpm build:design-system
pnpm storybook
pnpm build:storybook
pnpm test
pnpm test:design-system:browser
```

Install Chromium for the browser checks once with
`pnpm --filter @journey-viewer/design-system exec playwright install chromium`.
An existing binary can be supplied with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.
Browser checks serve the built Storybook locally and close their server/browser.
Screenshots are written to the ignored `.test-output` directory.

Each fixture factory returns plain readonly component data with deterministic
defaults and explicit overrides. Fixtures exclude non-serializable content slots
and callbacks, supplied by stories instead. Separate checks cover that fixture
contract, including malformed structures. Generation imports no checking code.
The state-row fixture contract also requires an expanded row to be composite.
The state-summary fixture contract rejects extra properties, including interaction
and mode properties, and checks both counts independently.
`JourneyContractControls` is the interactive counterpart to `JourneyContracts`:
it receives the same readonly items, an explicit `{ kind, id } | null` selection,
a required `onSelect(kind, id)` callback, and an explicit `open` flag with
`onToggle`. Closed, it shows only the “1 entry · 2 exits” summary toggle; open, it
lists entry and exit chips (with a muted “default”). It composes `Button` and `Text`;
static contract lists remain noninteractive. Fixture checks reject selections
that do not name a listed contract of the same kind.

`InspectorPanel` receives a readonly head (`crumb`, `title`, `typeLabel`,
`identity`, `touchpoints`), an optional `footnote` and `sections`. A section has a
title, optional `direction` (`incoming`/`outgoing`, shown with ←/→ and color),
`count` and `empty` text, plus `details` (detail buttons with a sub-line, dot and
note) and/or transition `groups` (a head with label, `exit` tag and count, over
items with label, annotation and tags). Supplying `onSelect` on a detail or group
makes it a button; without it the entry is informational. It composes `Surface`,
`Heading`, `Text`, `Badge`, `Button` and `TouchpointDot` without UJG queries,
selection state or effects. Its optional `media` slot renders between the head
and sections; `children` render after the sections and footnote.
Both components have colocated fixtures, independent checks and stories.
These development checks are not runtime React-prop validators.

`StateRow.onHover` reports pointer entry/leave (and leaving for the marks) for the
caller to interpret. `JourneyHead`,
`JourneyContractControls` and `StateRow` accept readonly `filtered` presentation.
Only a row's own content is dimmed; nested children retain their own presentation.
The design system derives none of these values from graph data.
`StateRow.actions` always renders supplied row controls after the marks; it owns
no screenshot behavior. Shared category colors, modal scrim and layout dimensions
live in DTCG tokens, including `--jv-color-category-*`, `--jv-color-scrim`,
`--jv-size-screen-preview` (hover card), `--jv-size-lightbox` (maximum lightbox
image height), `--jv-size-lane`, `--jv-size-inspector(-compact)`,
`--jv-size-screen-thumb(-compact)`, `--jv-size-search(-results)` and the
`--jv-shadow-popover/overlay/screen/lightbox` effects.

Package exports are built ESM/declarations, `styles.css` (compiled components and
production theme variables), `tokens.css` (theme variables only), `tailwind.css`
(optional generated theme bridge for a host's Tailwind build), and opt-in
`reset.css`. The library does not install a document reset. Include `styles.css`
explicitly when consuming components; no Tailwind processing is required.

Storybook includes every component, variants, controlled composition, token docs,
theme comparisons, and a built-consumer iframe. That consumer imports only `dist`
and is built without a Tailwind plugin. Stories, fixtures, checks, Storybook,
Playwright, and token build scripts stay outside the package's production output.

The viewer's internal Storybook extends this catalog and reuses its configuration,
preview decorators/themes and Vite setup. Run `pnpm storybook:viewer` from the root
to see both catalogs on port 6007. This Storybook stays independent on port 6006;
no viewer or UJG imports are added to the design system.
